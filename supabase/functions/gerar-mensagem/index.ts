import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar itens do lote com dados do cliente e fatura
    const { data: itens, error: itensError } = await supabase
      .from("itens_lote")
      .select(`
        *,
        cliente:clientes(*),
        fatura:faturas(*, status:status_pagamento(*))
      `)
      .eq("lote_id", loteId)
      .is("mensagem_gerada", null);

    if (itensError) throw itensError;

    if (!itens || itens.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum item pendente de mensagem", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Agrupar itens por cliente para contexto completo
    const clientesMap = new Map<string, { cliente: any; faturas: any[]; itens: any[] }>();
    
    for (const item of itens) {
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

    let generated = 0;

    // Gerar mensagem para cada cliente
    for (const [clienteId, data] of clientesMap) {
      const { cliente, faturas, itens: clienteItens } = data;
      
      // Calcular contexto (SEM VALOR)
      const mesesAtrasados = faturas.map((f: any) => f?.mes_referencia).filter(Boolean);
      
      // Calcular dias de atraso
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

      // Primeiro nome do cliente
      const primeiroNome = cliente?.nome?.split(" ")[0] || "Cliente";

      // Mascarar CPF (mostrar apenas últimos 5 dígitos)
      const cpfOriginal = cliente?.cpf || "";
      const cpfDigitos = cpfOriginal.replace(/\D/g, '');
      const cpfMascarado = `*****${cpfDigitos.slice(-5).padStart(5, '0')}`;

      const prompt = `Você é um assistente de cobrança educado e profissional.
Gere UMA mensagem de WhatsApp para cobrar o cliente.

CONTEXTO:
- Nome: ${primeiroNome}
- Faturas em aberto: ${faturas.length}
- Meses atrasados: ${mesesAtrasados.join(", ") || "atual"}
- Dias de atraso: ${diasAtraso}
- Tipo de cobrança: ${tipoCobranca}
- CPF para confirmação: ${cpfMascarado}

REGRAS IMPORTANTES:
- Seja cordial mas objetivo
- Use o primeiro nome do cliente
- Mencione a quantidade de parcelas em aberto
- NÃO mencione valores em reais
- Peça para o cliente confirmar os últimos 5 dígitos do CPF (${cpfMascarado})
- Inclua opção de contato para negociação
- Máximo 280 caracteres
- Não use emojis excessivos (máximo 2)
- NÃO inclua links ou URLs
- Termine com uma pergunta ou chamada para ação

Responda APENAS com a mensagem, sem explicações.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Você gera mensagens de cobrança profissionais e cordiais para WhatsApp." },
              { role: "user", content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI Gateway error:", aiResponse.status, errorText);
          continue;
        }

        const aiData = await aiResponse.json();
        const mensagem = aiData.choices?.[0]?.message?.content?.trim();

        if (!mensagem) {
          console.error("Mensagem vazia da IA para cliente:", clienteId);
          continue;
        }

        // Atualizar todos os itens deste cliente com a mesma mensagem
        for (const item of clienteItens) {
          const { error: updateError } = await supabase
            .from("itens_lote")
            .update({ mensagem_gerada: mensagem })
            .eq("id", item.id);

          if (updateError) {
            console.error("Erro ao atualizar item:", item.id, updateError);
          } else {
            generated++;
          }
        }
      } catch (aiError) {
        console.error("Erro ao gerar mensagem para cliente:", clienteId, aiError);
      }
    }

    return new Response(
      JSON.stringify({ message: "Mensagens geradas", generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro geral:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
