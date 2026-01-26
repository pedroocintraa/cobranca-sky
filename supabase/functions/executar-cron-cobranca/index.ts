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
    console.log("Executando CRON de cobrança automática");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar configurações ativas
    const { data: configs, error: configError } = await supabase
      .from("configuracoes_cobranca")
      .select("*")
      .eq("ativo", true);

    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      console.log("Nenhuma configuração ativa encontrada");
      return new Response(
        JSON.stringify({ message: "Nenhuma configuração ativa", executed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let executed = 0;
    const results: any[] = [];

    // 2. Para cada configuração ativa, executar gerar-lote-automatico
    for (const config of configs) {
      console.log("Processando configuração:", config.id);

      try {
        const gerarLoteUrl = `${supabaseUrl}/functions/v1/gerar-lote-automatico`;
        const response = await fetch(gerarLoteUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            diasAtrasoMinimo: config.dias_atraso_minimo,
            incluirPendentes: config.incluir_pendentes,
            incluirAtrasados: config.incluir_atrasados,
            filtroNumeroFatura: config.filtro_numero_fatura || [],
            gerarMensagens: true,
          }),
        });

        const result = await response.json();
        results.push({ configId: config.id, result });

        if (result.success) {
          executed++;

          // 3. Atualizar ultima_execucao
          await supabase
            .from("configuracoes_cobranca")
            .update({ 
              ultima_execucao: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", config.id);
        }
      } catch (execError) {
        console.error("Erro ao executar config:", config.id, execError);
        results.push({ configId: config.id, error: String(execError) });
      }
    }

    console.log("CRON finalizado:", { executed, total: configs.length });

    return new Response(
      JSON.stringify({ 
        message: `CRON executado: ${executed}/${configs.length} configurações processadas`,
        executed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro no CRON:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
