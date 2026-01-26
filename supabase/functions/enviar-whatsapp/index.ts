import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Formatar telefone para padrão internacional
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Adicionar código do país se não tiver
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
    const { itemId, telefone, mensagem } = await req.json();

    if (!itemId || !telefone || !mensagem) {
      return new Response(
        JSON.stringify({ error: "itemId, telefone e mensagem são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN")!;
    const uazapiInstanceId = Deno.env.get("UAZAPI_INSTANCE_ID")!;

    if (!uazapiToken || !uazapiInstanceId) {
      return new Response(
        JSON.stringify({ error: "UAZAPI não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Atualizar status para "enviando"
    await supabase
      .from("itens_lote")
      .update({ status_envio: "enviando" })
      .eq("id", itemId);

    const phoneFormatted = formatPhone(telefone);
    
    // Enviar mensagem via UAZAPI
    const uazapiUrl = `https://${uazapiInstanceId}.uazapi.com.br/message/sendText`;
    
    console.log("Enviando para:", phoneFormatted);
    
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
    console.log("Resposta UAZAPI:", responseData);

    // Buscar item para pegar fatura_id e cliente_id
    const { data: item } = await supabase
      .from("itens_lote")
      .select("fatura_id, cliente_id, lote_id")
      .eq("id", itemId)
      .single();

    if (response.ok && !responseData.error) {
      // Sucesso
      await supabase
        .from("itens_lote")
        .update({ 
          status_envio: "enviado",
          enviado_at: new Date().toISOString(),
          tentativas: 1 
        })
        .eq("id", itemId);

      // Registrar no histórico
      await supabase
        .from("historico_mensagens")
        .insert({
          cliente_id: item?.cliente_id,
          fatura_id: item?.fatura_id,
          lote_id: item?.lote_id,
          tipo: "cobranca",
          mensagem: mensagem,
          canal: "whatsapp",
          status: "enviado",
          api_response: responseData,
        });

      // Atualizar contadores do lote
      await supabase.rpc("increment_lote_success", { lote_id: item?.lote_id });

      return new Response(
        JSON.stringify({ success: true, response: responseData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Falha
      const errorMessage = responseData.error || responseData.message || "Erro desconhecido";
      
      await supabase
        .from("itens_lote")
        .update({ 
          status_envio: "falha",
          erro_mensagem: errorMessage,
          tentativas: 1 
        })
        .eq("id", itemId);

      // Registrar no histórico
      await supabase
        .from("historico_mensagens")
        .insert({
          cliente_id: item?.cliente_id,
          fatura_id: item?.fatura_id,
          lote_id: item?.lote_id,
          tipo: "cobranca",
          mensagem: mensagem,
          canal: "whatsapp",
          status: "falha",
          api_response: responseData,
        });

      // Atualizar contadores do lote
      await supabase.rpc("increment_lote_failure", { lote_id: item?.lote_id });

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
