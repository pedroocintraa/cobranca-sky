import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('=== Webhook de status de instância recebido ===')
    console.log('Body:', JSON.stringify(body, null, 2))

    // Extrair dados - pode ser array ou objeto
    const dados = Array.isArray(body) ? body[0] : body

    // Extrair token para identificar a instância
    const token = dados.token || dados.instance?.token
    
    if (!token) {
      console.error('Token não encontrado no payload')
      return new Response(
        JSON.stringify({ success: false, error: 'Token não encontrado' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Mapear status
    let statusBanco: 'criada' | 'conectada' | 'desconectada' | 'erro' = 'criada'
    const isConnected = dados.instance?.status === 'connected' || dados.status?.connected === true || dados.status?.loggedIn === true
    
    if (isConnected) {
      statusBanco = 'conectada'
    } else if (dados.instance?.status === 'disconnected' || dados.status?.connected === false) {
      statusBanco = 'desconectada'
    }

    // Extrair telefone do campo owner
    const telefone = dados.instance?.owner || null

    console.log(`Atualizando instância: token=${token}, status=${statusBanco}, telefone=${telefone}`)

    // Atualizar instância no banco pelo token
    const { data, error } = await supabase
      .from('instancias_whatsapp')
      .update({
        status: statusBanco,
        telefone: telefone,
        resposta_conexao: body,
      })
      .eq('token', token)
      .select()

    if (error) {
      console.error('Erro ao atualizar instância:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!data || data.length === 0) {
      console.error('Nenhuma instância encontrada com esse token')
      return new Response(
        JSON.stringify({ success: false, error: 'Instância não encontrada' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Instância atualizada com sucesso:', data[0].nome)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Status atualizado com sucesso',
        instancia: data[0]
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    console.error('Erro no webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})