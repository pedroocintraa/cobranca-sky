import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { loteId } = await req.json();

    if (!loteId) {
      return new Response(
        JSON.stringify({ error: "loteId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se lote está aprovado
    const { data: lote, error: loteError } = await supabase
      .from("lotes_cobranca")
      .select("*")
      .eq("id", loteId)
      .single();

    if (loteError) throw loteError;

    if (lote.status !== "aprovado") {
      return new Response(
        JSON.stringify({ error: "Lote não está aprovado para envio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar status do lote para "em_andamento"
    await supabase
      .from("lotes_cobranca")
      .update({ status: "em_andamento" })
      .eq("id", loteId);

    // Buscar itens pendentes
    const { data: itens, error: itensError } = await supabase
      .from("itens_lote")
      .select("*")
      .eq("lote_id", loteId)
      .eq("status_envio", "pendente")
      .not("mensagem_gerada", "is", null);

    if (itensError) throw itensError;

    if (!itens || itens.length === 0) {
      // Marcar como concluído se não há itens pendentes
      await supabase
        .from("lotes_cobranca")
        .update({ status: "concluido" })
        .eq("id", loteId);

      return new Response(
        JSON.stringify({ message: "Nenhum item pendente", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processando ${itens.length} itens do lote ${loteId}`);

    // Buscar configuração de intervalo
    const { data: config } = await supabase
      .from("configuracoes_cobranca")
      .select("intervalo_envio_segundos")
      .limit(1)
      .maybeSingle();

    // Converter segundos para milissegundos (padrão 1 segundo)
    const intervaloMs = (config?.intervalo_envio_segundos || 1) * 1000;
    console.log(`Intervalo entre mensagens: ${intervaloMs}ms`);

    // Processar em background
    const processItems = async () => {
      let processed = 0;
      let errors = 0;

      for (const item of itens) {
        if (!item.telefone || !item.mensagem_gerada) {
          console.log(`Item ${item.id} sem telefone ou mensagem, pulando...`);
          continue;
        }

        try {
          // Chamar edge function de envio
          const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
            body: {
              itemId: item.id,
              telefone: item.telefone,
              mensagem: item.mensagem_gerada,
            },
          });

          if (error) {
            console.error(`Erro ao enviar para ${item.id}:`, error);
            errors++;
          } else {
            processed++;
          }

          // Atualizar contadores do lote
          await supabase
            .from("lotes_cobranca")
            .update({ total_enviados: processed + errors })
            .eq("id", loteId);

          // Rate limiting configurável
          await delay(intervaloMs);
        } catch (e) {
          console.error(`Exceção ao processar ${item.id}:`, e);
          errors++;
        }
      }

      // Marcar lote como concluído
      await supabase
        .from("lotes_cobranca")
        .update({ status: "concluido" })
        .eq("id", loteId);

      console.log(`Lote ${loteId} concluído: ${processed} enviados, ${errors} erros`);
    };

    // Iniciar processamento em background
    EdgeRuntime.waitUntil(processItems());

    return new Response(
      JSON.stringify({ 
        message: "Processamento iniciado", 
        total: itens.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
