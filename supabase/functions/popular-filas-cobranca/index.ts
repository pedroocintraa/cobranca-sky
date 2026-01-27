import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("=== Popular Filas de Cobrança ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar regras ativas
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
          message: "Nenhuma regra de cobrança ativa encontrada. Configure regras na aba 'Regras' antes de popular filas.", 
          totalAdicionadas: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${regrasAtivas.length} regras ativas`);

    // 2. Buscar status "Pendente" e "Atrasado"
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
        JSON.stringify({ success: false, message: "Status 'Pendente' ou 'Atrasado' não encontrados no sistema", totalAdicionadas: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar todas as faturas em aberto
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
        JSON.stringify({ success: false, message: "Nenhuma fatura em aberto encontrada", totalAdicionadas: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Processar faturas e adicionar às filas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let totalAdicionadas = 0;
    const faturasCriticas: { fatura: any; cliente: any; diasAtraso: number }[] = [];

    // Função para verificar se uma fatura se encaixa em uma regra
    const verificarRegra = (fatura: any, regra: RegraCobranca): boolean => {
      const vencimento = new Date(fatura.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      const dias = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

      if (regra.tipo === 'antes_vencimento') {
        return dias === regra.dias;
      } else {
        return dias === regra.dias;
      }
    };

    // Verificar histórico para evitar duplicatas
    const { data: historico } = await supabase
      .from("historico_cobranca")
      .select("fatura_id, regra_id, data_envio")
      .gte("data_envio", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

    const historicoMap = new Map<string, Set<string>>();
    if (historico) {
      for (const h of historico) {
        if (!historicoMap.has(h.fatura_id)) {
          historicoMap.set(h.fatura_id, new Set());
        }
        if (h.regra_id) {
          historicoMap.get(h.fatura_id)!.add(h.regra_id);
        }
      }
    }

    // Processar cada fatura
    for (const fatura of faturas) {
      const cliente = (fatura as any).cobranca?.cliente;
      if (!cliente) continue;

      const vencimento = new Date(fatura.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

      // Se a fatura tem mais de 15 dias de atraso, adicionar à fila crítica
      if (diasAtraso > 15) {
        // Verificar se já está na fila crítica
        const { data: existe } = await supabase
          .from("filas_cobranca")
          .select("id")
          .eq("fatura_id", fatura.id)
          .is("regra_id", null)
          .maybeSingle();

        if (!existe) {
          const { error: filaError } = await supabase
            .from("filas_cobranca")
            .insert({
              regra_id: null,
              fatura_id: fatura.id,
              cliente_id: cliente.id,
              status: 'pendente',
            });

          if (!filaError) {
            totalAdicionadas++;
            console.log(`Fatura ${fatura.id} adicionada à fila crítica`);
          }
        }
        continue; // Não processar em regras normais
      }

      // Verificar cada regra ativa
      for (const regra of regrasAtivas) {
        // Verificar se já foi cobrada por esta regra hoje
        const jaCobrada = historicoMap.get(fatura.id)?.has(regra.id);
        if (jaCobrada) {
          continue; // Pular se já foi cobrada por esta regra
        }

        // Verificar se a fatura se encaixa na regra
        if (verificarRegra(fatura, regra)) {
          // Verificar se já está na fila desta regra
          const { data: existe } = await supabase
            .from("filas_cobranca")
            .select("id")
            .eq("fatura_id", fatura.id)
            .eq("regra_id", regra.id)
            .maybeSingle();

          if (!existe) {
            const { error: filaError } = await supabase
              .from("filas_cobranca")
              .insert({
                regra_id: regra.id,
                fatura_id: fatura.id,
                cliente_id: cliente.id,
                status: 'pendente',
              });

            if (!filaError) {
              totalAdicionadas++;
              console.log(`Fatura ${fatura.id} adicionada à fila da regra ${regra.id}`);
            }
          }
        }
      }
    }

    console.log(`=== Total de ${totalAdicionadas} faturas adicionadas às filas ===`);

    return new Response(
      JSON.stringify({
        success: true,
        totalAdicionadas,
        message: `${totalAdicionadas} fatura(s) adicionada(s) às filas de cobrança`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro ao popular filas:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
