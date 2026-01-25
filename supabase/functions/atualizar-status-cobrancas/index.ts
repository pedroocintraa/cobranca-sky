import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusPagamento {
  id: string;
  nome: string;
}

interface Cobranca {
  id: string;
  data_vencimento: string;
  status_id: string | null;
  status?: StatusPagamento | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Iniciando atualização automática de status de cobranças...");

    // Buscar status "Atrasado" e status que devem ser ignorados
    const { data: statusList, error: statusError } = await supabase
      .from("status_pagamento")
      .select("id, nome")
      .eq("ativo", true);

    if (statusError) {
      console.error("Erro ao buscar status:", statusError);
      throw statusError;
    }

    const statusAtrasado = statusList?.find(
      (s) => s.nome.toLowerCase() === "atrasado"
    );
    const statusPago = statusList?.find(
      (s) => s.nome.toLowerCase() === "pago"
    );
    const statusCancelado = statusList?.find(
      (s) => s.nome.toLowerCase() === "cancelado"
    );

    if (!statusAtrasado) {
      console.warn("Status 'Atrasado' não encontrado. Criando...");
      const { data: newStatus, error: createError } = await supabase
        .from("status_pagamento")
        .insert([{ nome: "Atrasado", cor: "#EF4444", ordem: 3 }])
        .select()
        .single();

      if (createError) {
        console.error("Erro ao criar status Atrasado:", createError);
        throw createError;
      }
      
      console.log("Status 'Atrasado' criado:", newStatus.id);
    }

    const statusAtrasadoId = statusAtrasado?.id;
    const statusIgnorados = [statusPago?.id, statusCancelado?.id].filter(Boolean);

    console.log("Status Atrasado ID:", statusAtrasadoId);
    console.log("Status ignorados (Pago/Cancelado):", statusIgnorados);

    // Data de hoje (início do dia)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split("T")[0];

    console.log("Data de referência:", hojeStr);

    // Buscar cobranças que NÃO estão Pagas ou Canceladas e têm vencimento anterior a hoje
    let query = supabase
      .from("cobrancas")
      .select("id, data_vencimento, status_id, status:status_pagamento(id, nome)")
      .lt("data_vencimento", hojeStr);

    // Excluir status Pago e Cancelado
    if (statusIgnorados.length > 0) {
      // Incluir cobranças onde status_id é null OU não está nos ignorados
      query = query.or(`status_id.is.null,status_id.not.in.(${statusIgnorados.join(",")})`);
    }

    const { data: cobrancas, error: cobrancasError } = await query;

    if (cobrancasError) {
      console.error("Erro ao buscar cobranças:", cobrancasError);
      throw cobrancasError;
    }

    console.log(`Encontradas ${cobrancas?.length || 0} cobranças para atualizar`);

    let atualizadas = 0;
    let erros = 0;

    // Atualizar cada cobrança para status "Atrasado"
    for (const cobranca of cobrancas || []) {
      // Só atualiza se ainda não está como Atrasado
      if (cobranca.status_id !== statusAtrasadoId) {
        const { error: updateError } = await supabase
          .from("cobrancas")
          .update({ status_id: statusAtrasadoId })
          .eq("id", cobranca.id);

        if (updateError) {
          console.error(`Erro ao atualizar cobrança ${cobranca.id}:`, updateError);
          erros++;
        } else {
          console.log(`Cobrança ${cobranca.id} atualizada para Atrasado`);
          atualizadas++;
        }
      }
    }

    const resultado = {
      success: true,
      message: `Atualização concluída: ${atualizadas} cobranças atualizadas para Atrasado`,
      detalhes: {
        total_verificadas: cobrancas?.length || 0,
        atualizadas,
        erros,
        data_referencia: hojeStr,
      },
    };

    console.log("Resultado:", resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na execução:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
