import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GerarLoteParams {
  diasAtrasoMinimo?: number;
  incluirPendentes?: boolean;
  incluirAtrasados?: boolean;
  filtroNumeroFatura?: number[];
  gerarMensagens?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: GerarLoteParams = await req.json().catch(() => ({}));
    const {
      diasAtrasoMinimo = 1,
      incluirPendentes = false,
      incluirAtrasados = true,
      filtroNumeroFatura = [],
      gerarMensagens = true,
    } = params;

    console.log("Parâmetros recebidos:", params);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar status "Pendente" e "Atrasado"
    const { data: statusList, error: statusError } = await supabase
      .from("status_pagamento")
      .select("id, nome")
      .in("nome", ["Pendente", "Atrasado"]);

    if (statusError) throw statusError;

    const statusIds: string[] = [];
    const atrasadoId = statusList?.find(s => s.nome === "Atrasado")?.id;
    const pendenteId = statusList?.find(s => s.nome === "Pendente")?.id;
    
    if (incluirAtrasados && atrasadoId) statusIds.push(atrasadoId);
    if (incluirPendentes && pendenteId) statusIds.push(pendenteId);

    if (statusIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Nenhum status selecionado", totalFaturas: 0, totalClientes: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Buscar todas as faturas em aberto com dados do cliente
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

    // 3. Agrupar faturas por cliente e calcular número da fatura
    const hoje = new Date();
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
      const dias = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
      if (dias > clienteData.diasAtraso) {
        clienteData.diasAtraso = dias;
      }
    }

    // 4. Aplicar filtros de dias de atraso e número de fatura
    const faturasParaLote: { fatura: any; cliente: any; numeroFatura: number }[] = [];

    for (const [clienteId, data] of clientesMap) {
      // Filtrar por dias de atraso
      if (data.diasAtraso < diasAtrasoMinimo) continue;

      // Ordenar faturas por data de vencimento (mais antiga primeiro)
      data.faturas.sort((a, b) => 
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      );

      // Enumerar faturas (1ª, 2ª, 3ª, etc.)
      data.faturas.forEach((fatura, index) => {
        const numeroFatura = index + 1;

        // Aplicar filtro de número de fatura se especificado
        if (filtroNumeroFatura.length > 0) {
          // Verificar se o número está no filtro
          // Se o filtro inclui 4, significa "4ª ou superior"
          const maxFiltro = Math.max(...filtroNumeroFatura);
          if (filtroNumeroFatura.includes(4) && numeroFatura >= 4) {
            // Incluir se o filtro tem 4 e a fatura é 4ª ou superior
          } else if (!filtroNumeroFatura.includes(numeroFatura)) {
            return; // Pular esta fatura
          }
        }

        faturasParaLote.push({
          fatura,
          cliente: data.cliente,
          numeroFatura,
        });
      });
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

    // 5. Criar o lote
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

    // 6. Inserir itens do lote
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

    // 7. Gerar mensagens com IA se solicitado
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

    // 8. Atualizar status do lote para aguardando aprovação
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
        message: `Lote "${nomeLote}" criado com ${faturasParaLote.length} faturas de ${clientesUnicos.size} clientes`,
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
