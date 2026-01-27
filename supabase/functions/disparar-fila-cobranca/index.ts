import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Formatar telefone para padrão internacional
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return digits;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regraId } = await req.json();
    
    console.log(`=== Disparando fila de cobrança: ${regraId || 'crítica'} ===`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN")!;
    const uazapiInstanceId = Deno.env.get("UAZAPI_INSTANCE_ID")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    if (!uazapiToken || !uazapiInstanceId) {
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar itens pendentes da fila
    let query = supabase
      .from("filas_cobranca")
      .select(`
        *,
        regra:regras_cobranca(*),
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

    // 2. Agrupar por cliente para gerar mensagens
    const clientesMap = new Map<string, { cliente: any; faturas: any[]; itens: any[] }>();
    
    for (const item of itensFila) {
      const clienteId = item.cliente_id;
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          cliente: item.cliente,
          faturas: [],
          itens: [],
        });
      }
      const data = clientesMap.get(clienteId)!;
      data.faturas.push(item.fatura);
      data.itens.push(item);
    }

    let totalEnviados = 0;
    let totalFalhas = 0;

    // 3. Processar cada cliente
    for (const [clienteId, data] of clientesMap) {
      const { cliente, faturas, itens: clienteItens } = data;

      // Calcular contexto
      const hoje = new Date();
      let diasAtraso = 0;
      for (const fatura of faturas) {
        if (fatura?.data_vencimento) {
          const vencimento = new Date(fatura.data_vencimento);
          const dias = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
          if (dias > diasAtraso) diasAtraso = dias;
        }
      }

      // Determinar tipo de cobrança
      let tipoCobranca = "LEMBRETE GENTIL";
      if (faturas.length >= 4 || diasAtraso >= 60) {
        tipoCobranca = "COBRANÇA FIRME";
      } else if (faturas.length >= 2 || diasAtraso >= 30) {
        tipoCobranca = "COBRANÇA MODERADA";
      }

      const primeiroNome = cliente?.nome?.split(" ")[0] || "Cliente";
      const cpfOriginal = cliente?.cpf || "";
      const cpfDigitos = cpfOriginal.replace(/\D/g, '');
      const cpfMascarado = `*****${cpfDigitos.slice(-5).padStart(5, '0')}`;

      // Gerar mensagem usando IA
      const prompt = `Você é um assistente de cobrança educado e profissional.
Gere UMA mensagem de WhatsApp para cobrar o cliente.

CONTEXTO:
- Nome: ${primeiroNome}
- CPF: ${cpfMascarado}
- Tipo de cobrança: ${tipoCobranca}
- Dias de atraso: ${diasAtraso}
- Total de faturas: ${faturas.length}

REGRAS:
- Seja educado e profissional
- Não mencione valores específicos
- Use tom adequado ao tipo de cobrança
- Máximo 3 parágrafos
- Assine como "Equipe de Cobrança"

Gere APENAS a mensagem, sem explicações adicionais.`;

      let mensagem = "";
      try {
        const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Você é um assistente de cobrança profissional." },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        const aiData = await aiResponse.json();
        mensagem = aiData.choices?.[0]?.message?.content || "";
      } catch (aiError) {
        console.error("Erro ao gerar mensagem com IA:", aiError);
        // Mensagem padrão se IA falhar
        mensagem = `Olá ${primeiroNome}, este é um lembrete sobre suas faturas pendentes. Por favor, entre em contato conosco para regularizar sua situação. Obrigado!`;
      }

      // 4. Enviar mensagem para cada item da fila
      for (const item of clienteItens) {
        const telefone = cliente?.telefone;
        if (!telefone) {
          console.log(`Cliente ${clienteId} sem telefone, pulando...`);
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
              cliente_id: clienteId,
              fila_critica: item.regra_id === null,
              status: "falha",
              mensagem_enviada: mensagem,
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

        const phoneFormatted = formatPhone(telefone);
        
        // Enviar via UAZAPI
        const uazapiUrl = `https://${uazapiInstanceId}.uazapi.com.br/message/sendText`;
        
        try {
          const response = await fetch(uazapiUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${uazapiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phoneNumber: phoneFormatted,
              messageText: mensagem,
            }),
          });

          const responseData = await response.json();

          if (response.ok && !responseData.error) {
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
                cliente_id: clienteId,
                fila_critica: item.regra_id === null,
                status: "enviado",
                mensagem_enviada: mensagem,
                canal: "whatsapp",
                api_response: responseData,
              });

            totalEnviados++;
            console.log(`✓ Mensagem enviada para ${telefone}`);
          } else {
            // Falha
            const errorMessage = responseData.error || responseData.message || "Erro desconhecido";
            
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
                cliente_id: clienteId,
                fila_critica: item.regra_id === null,
                status: "falha",
                mensagem_enviada: mensagem,
                canal: "whatsapp",
                api_response: responseData,
              });

            totalFalhas++;
            console.error(`✗ Erro ao enviar para ${telefone}:`, errorMessage);
          }
        } catch (sendError) {
          console.error(`Erro ao enviar mensagem:`, sendError);
          
          await supabase
            .from("filas_cobranca")
            .update({ 
              status: "falha",
              erro_mensagem: String(sendError),
              tentativas: item.tentativas + 1
            })
            .eq("id", item.id);

          totalFalhas++;
        }
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
