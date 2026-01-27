import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfiguracaoCobranca {
  id: string;
  ativo: boolean;
  hora: string;
  dias_semana: number[];
  dias_atraso_minimo: number;
  incluir_pendentes: boolean;
  incluir_atrasados: boolean;
  filtro_numero_fatura: number[] | null;
}

// Verificar se deve executar agora baseado na configuração
// Considera fuso horário de Brasília (UTC-3)
function deveExecutarAgora(config: ConfiguracaoCobranca): boolean {
  // Obter hora atual em Brasília (UTC-3)
  const agora = new Date();
  const brasiliaOffset = -3 * 60; // -3 horas em minutos
  const utcOffset = agora.getTimezoneOffset(); // offset local em minutos
  const brasiliaTime = new Date(agora.getTime() + (utcOffset + brasiliaOffset) * 60000);
  
  const diaAtual = brasiliaTime.getDay(); // 0=Dom, 1=Seg, ...
  const horaAtual = brasiliaTime.getHours();
  const minutoAtual = brasiliaTime.getMinutes();
  
  console.log(`Hora atual em Brasília: ${horaAtual}:${minutoAtual.toString().padStart(2, '0')}, Dia: ${diaAtual}`);
  console.log(`Configuração - Hora: ${config.hora}, Dias: ${config.dias_semana}`);
  
  // Verificar dia da semana
  if (!config.dias_semana.includes(diaAtual)) {
    console.log(`Dia ${diaAtual} não está na lista de dias configurados`);
    return false;
  }
  
  // Verificar hora (formato "HH:MM")
  const [horaConfig, minutoConfig] = config.hora.split(':').map(Number);
  if (horaAtual !== horaConfig || minutoAtual !== minutoConfig) {
    console.log(`Horário ${horaAtual}:${minutoAtual} diferente do configurado ${horaConfig}:${minutoConfig}`);
    return false;
  }
  
  console.log("✓ Momento correto para executar!");
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== CRON de cobrança automática iniciado ===");

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

    // 2. Para cada configuração ativa, verificar se deve executar agora
    for (const config of configs) {
      console.log(`\nProcessando configuração: ${config.id}`);

      // Verificar se é o momento certo para executar
      if (!deveExecutarAgora(config)) {
        console.log("Não é o momento de executar esta configuração");
        results.push({ 
          configId: config.id, 
          skipped: true, 
          reason: "Não é o momento agendado" 
        });
        continue;
      }

      try {
        console.log("Chamando gerar-lote-automatico...");
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
            usarRegras: true, // Usar regras configuradas
          }),
        });

        const result = await response.json();
        console.log("Resultado do lote:", result);
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
          
          console.log("✓ Configuração executada com sucesso!");
        }
      } catch (execError) {
        console.error("Erro ao executar config:", config.id, execError);
        results.push({ configId: config.id, error: String(execError) });
      }
    }

    console.log(`\n=== CRON finalizado: ${executed}/${configs.length} configurações processadas ===`);

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
