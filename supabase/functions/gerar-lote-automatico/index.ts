import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GerarLoteParams {
  gerarMensagens?: boolean;
  // Parâmetros antigos removidos - sempre usar regras agora
}

interface RegraCobranca {
  id: string;
  tipo: 'antes_vencimento' | 'apos_vencimento';
  dias: number;
  ativo: boolean;
  ordem: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: GerarLoteParams = await req.json().catch(() => ({}));
    const {
      gerarMensagens = true,
    } = params;

    console.log("Gerando lote usando regras configuradas...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar regras ativas (sempre usar regras agora)
    const { data: regras, error: regrasError } = await supabase
      .from("regras_cobranca")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (regrasError) {
      console.error("Erro ao buscar regras:", regrasError);
      throw regrasError;
    }

    const regrasAtivas: RegraCobranca[] = regras || [];
    
    if (regrasAtivas.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Nenhuma regra de cobrança ativa encontrada. Configure regras na aba 'Regras' antes de gerar lotes.", 
          totalFaturas: 0, 
          totalClientes: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${regrasAtivas.length} regras ativas`);

    // 2. Buscar status "Pendente" e "Atrasado" (sempre incluir ambos)
    const { data: statusList, error: statusError } = await supabase
      .from("status_pagamento")
      .select("id, nome")
      .in("nome", ["Pendente", "Atrasado"]);

    if (statusError) throw statusError;

    const statusIds: string[] = [];
    const atrasadoId = statusList?.find(s => s.nome === "Atrasado")?.id;
    const pendenteId = statusList?.find(s => s.nome === "Pendente")?.id;
    
    if (atrasadoId) statusIds.push(atrasadoId);
    if (pendenteId) statusIds.push(pendenteId);

    if (statusIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Status 'Pendente' ou 'Atrasado' não encontrados no sistema", totalFaturas: 0, totalClientes: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar todas as faturas em aberto com dados do cliente
    const { data: faturas, error: faturasError } = await supabase
      .from("faturas")
      .select(`
        *,
        status:status_pagamento(*),
        cobranca:cobrancas(*, cliente:clientes(*))
      `)
      .in("status_id", statusIds)
      .order("data_vencimento", { ascending: true });

    if (faturasError) throw faturasError;

    if (!faturas || faturas.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Nenhuma fatura em aberto encontrada", totalFaturas: 0, totalClientes: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Agrupar faturas por cliente e calcular número da fatura
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const clientesMap = new Map<string, {
      cliente: any;
      faturas: any[];
      diasAtraso: number;
    }>();

    for (const fatura of faturas) {
      const cliente = (fatura as any).cobranca?.cliente;
      if (!cliente) continue;

      if (!clientesMap.has(cliente.id)) {
        clientesMap.set(cliente.id, {
          cliente,
          faturas: [],
          diasAtraso: 0,
        });
      }

      const clienteData = clientesMap.get(cliente.id)!;
      clienteData.faturas.push(fatura);

      // Calcular dias de atraso
      const vencimento = new Date(fatura.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      const dias = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
      if (dias > clienteData.diasAtraso) {
        clienteData.diasAtraso = dias;
      }
    }

    // 5. Processar faturas usando regras ou filtros antigos
    const faturasParaLote: { fatura: any; cliente: any; numeroFatura: number }[] = [];
    const faturasCriticas: { fatura: any; cliente: any; diasAtraso: number }[] = [];

    // Função para verificar se uma fatura se encaixa em uma regra
    const verificarRegra = (fatura: any, regra: RegraCobranca): boolean => {
      const vencimento = new Date(fatura.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      const dias = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

      if (regra.tipo === 'antes_vencimento') {
        // Para antes do vencimento, dias deve ser negativo
        // Ex: -3 significa 3 dias antes, então dias deve ser -3
        return dias === regra.dias;
      } else {
        // Para após o vencimento, dias deve ser positivo
        // Ex: 3 significa 3 dias depois, então dias deve ser 3
        return dias === regra.dias;
      }
    };

    for (const [clienteId, data] of clientesMap) {
      // Ordenar faturas por data de vencimento (mais antiga primeiro)
      data.faturas.sort((a, b) => 
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      );

      // Enumerar faturas (1ª, 2ª, 3ª, etc.)
      data.faturas.forEach((fatura, index) => {
        const numeroFatura = index + 1;
        const vencimento = new Date(fatura.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

        // Se a fatura tem mais de 15 dias de atraso, adicionar à fila crítica
        if (diasAtraso > 15) {
          faturasCriticas.push({
            fatura,
            cliente: data.cliente,
            diasAtraso,
          });
          return; // Não incluir no lote normal
        }

        // Verificar se a fatura se encaixa em alguma regra ativa
        let deveIncluir = false;
        for (const regra of regrasAtivas) {
          if (verificarRegra(fatura, regra)) {
            deveIncluir = true;
            break; // Encontrou uma regra que se aplica
          }
        }

        if (deveIncluir) {
          faturasParaLote.push({
            fatura,
            cliente: data.cliente,
            numeroFatura,
          });
        }
      });
    }

    // Adicionar faturas críticas à fila especial
    if (faturasCriticas.length > 0) {
      console.log(`Encontradas ${faturasCriticas.length} faturas críticas (>15 dias)`);
      
      // Inserir ou atualizar na fila crítica
      for (const item of faturasCriticas) {
        // Verificar se já existe
        const { data: existing } = await supabase
          .from("fila_cobranca_critica")
          .select("id")
          .eq("fatura_id", item.fatura.id)
          .eq("processado", false)
          .maybeSingle();

        if (existing) {
          // Atualizar existente
          const { error: updateError } = await supabase
            .from("fila_cobranca_critica")
            .update({
              dias_atraso: item.diasAtraso,
              prioridade: item.diasAtraso,
            })
            .eq("id", existing.id);

          if (updateError) {
            console.error("Erro ao atualizar fila crítica:", updateError);
          }
        } else {
          // Inserir novo
          const { error: insertError } = await supabase
            .from("fila_cobranca_critica")
            .insert({
              fatura_id: item.fatura.id,
              cliente_id: item.cliente.id,
              dias_atraso: item.diasAtraso,
              prioridade: item.diasAtraso,
              processado: false,
            });

          if (insertError) {
            console.error("Erro ao adicionar à fila crítica:", insertError);
          }
        }
      }
    }

    if (faturasParaLote.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Nenhuma fatura encontrada com os filtros aplicados", 
          totalFaturas: 0, 
          totalClientes: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Criar o lote (apenas se houver faturas)
    const nomeLote = `Cobrança Automática ${new Date().toLocaleDateString('pt-BR')}`;
    const { data: lote, error: loteError } = await supabase
      .from("lotes_cobranca")
      .insert([{
        nome: nomeLote,
        status: "rascunho",
        total_faturas: faturasParaLote.length,
      }])
      .select()
      .single();

    if (loteError) throw loteError;

    console.log("Lote criado:", lote.id);

    // 7. Inserir itens do lote
    const itensLote = faturasParaLote.map(({ fatura, cliente }) => ({
      lote_id: lote.id,
      fatura_id: fatura.id,
      cliente_id: cliente.id,
      telefone: cliente.telefone || "",
      status_envio: "pendente" as const,
    }));

    const { error: itensError } = await supabase
      .from("itens_lote")
      .insert(itensLote);

    if (itensError) throw itensError;

    console.log("Itens inseridos:", itensLote.length);

    // 8. Gerar mensagens com IA se solicitado
    if (gerarMensagens) {
      try {
        const gerarMensagemUrl = `${supabaseUrl}/functions/v1/gerar-mensagem`;
        const response = await fetch(gerarMensagemUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ loteId: lote.id }),
        });

        if (!response.ok) {
          console.error("Erro ao gerar mensagens:", await response.text());
        } else {
          console.log("Mensagens geradas com sucesso");
        }
      } catch (msgError) {
        console.error("Erro ao chamar gerar-mensagem:", msgError);
      }
    }

    // 9. Atualizar status do lote para aguardando aprovação
    await supabase
      .from("lotes_cobranca")
      .update({ status: "aguardando_aprovacao" })
      .eq("id", lote.id);

    // Contar clientes únicos
    const clientesUnicos = new Set(faturasParaLote.map(f => f.cliente.id));

    return new Response(
      JSON.stringify({
        success: true,
        loteId: lote.id,
        totalFaturas: faturasParaLote.length,
        totalClientes: clientesUnicos.size,
        faturasCriticas: faturasCriticas.length,
        message: `Lote "${nomeLote}" criado com ${faturasParaLote.length} faturas de ${clientesUnicos.size} clientes${faturasCriticas.length > 0 ? `. ${faturasCriticas.length} fatura(s) crítica(s) adicionada(s) à fila especial.` : ''}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro ao gerar lote automático:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
