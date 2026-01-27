import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Tratar body vazio ou inválido
    let regraId = null;
    try {
      const body = await req.text();
      if (body) {
        const parsed = JSON.parse(body);
        regraId = parsed.regraId ?? null;
      }
    } catch {
      // Body vazio ou inválido - usar regraId = null (fila crítica)
    }
    
    console.log(`=== Disparando fila de cobrança: ${regraId || 'crítica'} ===`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar configuração de webhook
    const { data: configWebhooks } = await supabase
      .from("configuracoes_webhooks")
      .select("webhook_disparo")
      .limit(1)
      .maybeSingle();

    if (!configWebhooks?.webhook_disparo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Webhook de disparo não configurado. Configure na página de Configurações.",
          totalEnviados: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Buscar instância ativa
    const { data: instanciaAtiva } = await supabase
      .from("instancias_whatsapp")
      .select("token")
      .eq("status", "conectada")
      .limit(1)
      .maybeSingle();

    if (!instanciaAtiva?.token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Nenhuma instância WhatsApp conectada. Conecte uma instância na página de Configurações.",
          totalEnviados: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar regra (se não for fila crítica)
    let regra = null;
    if (regraId) {
      const { data: regraData } = await supabase
        .from("regras_cobranca")
        .select("*")
        .eq("id", regraId)
        .maybeSingle();
      regra = regraData;
    }

    // 4. Buscar itens pendentes da fila
    let query = supabase
      .from("filas_cobranca")
      .select(`
        *,
        fatura:faturas(*, status:status_pagamento(*), cobranca:cobrancas(*, cliente:clientes(*))),
        cliente:clientes(*)
      `)
      .eq("status", "pendente");

    if (regraId === null) {
      query = query.is("regra_id", null);
    } else {
      query = query.eq("regra_id", regraId);
    }

    const { data: itensFila, error: itensError } = await query;

    if (itensError) throw itensError;

    if (!itensFila || itensFila.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Nenhuma cobrança pendente nesta fila",
          totalEnviados: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontrados ${itensFila.length} itens pendentes`);

    let totalEnviados = 0;
    let totalFalhas = 0;

    // 5. Processar cada item da fila
    for (const item of itensFila) {
      const cliente = item.cliente;
      const fatura = item.fatura;

      if (!cliente || !fatura) {
        console.error(`Item ${item.id} sem cliente ou fatura`);
        continue;
      }

      if (!cliente.telefone) {
        console.log(`Cliente ${cliente.id} sem telefone, pulando...`);
        // Marcar como falha
        await supabase
          .from("filas_cobranca")
          .update({ 
            status: "falha",
            erro_mensagem: "Cliente sem telefone cadastrado",
            tentativas: item.tentativas + 1
          })
          .eq("id", item.id);

        // Registrar no histórico
        await supabase
          .from("historico_cobranca")
          .insert({
            fatura_id: item.fatura_id,
            regra_id: item.regra_id,
            cliente_id: cliente.id,
            fila_critica: item.regra_id === null,
            status: "falha",
            mensagem_enviada: null,
            canal: "whatsapp",
          });

        totalFalhas++;
        continue;
      }

      // Atualizar status para processando
      await supabase
        .from("filas_cobranca")
        .update({ status: "processando" })
        .eq("id", item.id);

      // 6. Preparar dados para enviar ao webhook
      const dadosWebhook = {
        regra: regra ? {
          id: regra.id,
          tipo: regra.tipo,
          dias: regra.dias,
        } : null,
        cliente: {
          nome: cliente.nome,
          cpf: cliente.cpf,
          telefone: cliente.telefone,
        },
        token: instanciaAtiva.token,
        fatura: {
          id: fatura.id,
          mes_referencia: fatura.mes_referencia,
          data_vencimento: fatura.data_vencimento,
          valor: fatura.valor,
        },
      };

      // 7. Enviar para webhook
      try {
        const response = await fetch(configWebhooks.webhook_disparo, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dadosWebhook),
        });

        const respostaWebhook = await response.json();

        if (response.ok && respostaWebhook.success !== false) {
          // Sucesso
          await supabase
            .from("filas_cobranca")
            .update({ 
              status: "enviado",
              enviado_at: new Date().toISOString(),
              tentativas: item.tentativas + 1
            })
            .eq("id", item.id);

          // Registrar no histórico
          await supabase
            .from("historico_cobranca")
            .insert({
              fatura_id: item.fatura_id,
              regra_id: item.regra_id,
              cliente_id: cliente.id,
              fila_critica: item.regra_id === null,
              status: "enviado",
              mensagem_enviada: respostaWebhook.mensagem || null,
              canal: "whatsapp",
              api_response: respostaWebhook,
            });

          totalEnviados++;
          console.log(`✓ Cobrança enviada para ${cliente.telefone}`);
        } else {
          // Falha
          const errorMessage = respostaWebhook.message || respostaWebhook.error || "Erro desconhecido no webhook";
          
          await supabase
            .from("filas_cobranca")
            .update({ 
              status: "falha",
              erro_mensagem: errorMessage,
              tentativas: item.tentativas + 1
            })
            .eq("id", item.id);

          // Registrar no histórico
          await supabase
            .from("historico_cobranca")
            .insert({
              fatura_id: item.fatura_id,
              regra_id: item.regra_id,
              cliente_id: cliente.id,
              fila_critica: item.regra_id === null,
              status: "falha",
              mensagem_enviada: null,
              canal: "whatsapp",
              api_response: respostaWebhook,
            });

          totalFalhas++;
          console.error(`✗ Erro ao enviar para ${cliente.telefone}:`, errorMessage);
        }
      } catch (sendError) {
        console.error(`Erro ao chamar webhook:`, sendError);
        
        const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
        
        await supabase
          .from("filas_cobranca")
          .update({ 
            status: "falha",
            erro_mensagem: errorMessage,
            tentativas: item.tentativas + 1
          })
          .eq("id", item.id);

        // Registrar no histórico
        await supabase
          .from("historico_cobranca")
          .insert({
            fatura_id: item.fatura_id,
            regra_id: item.regra_id,
            cliente_id: cliente.id,
            fila_critica: item.regra_id === null,
            status: "falha",
            mensagem_enviada: null,
            canal: "whatsapp",
            api_response: { error: errorMessage },
          });

        totalFalhas++;
      }
    }

    console.log(`=== Disparo concluído: ${totalEnviados} enviados, ${totalFalhas} falhas ===`);

    return new Response(
      JSON.stringify({
        success: true,
        totalEnviados,
        totalFalhas,
        message: `${totalEnviados} mensagem(ns) enviada(s) com sucesso${totalFalhas > 0 ? `. ${totalFalhas} falha(s).` : '.'}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro ao disparar fila:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
