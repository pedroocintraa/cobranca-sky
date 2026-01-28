import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  })
}

function safeJsonParse(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: null }
  if (trimmed === '[object Object]') {
    return {
      ok: false,
      error:
        'Body inválido ([object Object]). No n8n, envie o body como JSON (Content-Type: application/json) ou habilite “JSON/RAW Parameters”.',
    }
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch {
    return {
      ok: false,
      error:
        'Body não é um JSON válido. Verifique se o n8n está enviando JSON e se o header Content-Type está como application/json.',
    }
  }
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

    const contentType = req.headers.get('content-type') ?? ''
    const rawBody = await req.text()
    const parsed = safeJsonParse(rawBody)
    if (!parsed.ok) {
      console.error('Body parse error:', parsed.error)
      console.log('Content-Type:', contentType)
      console.log('Raw Body:', rawBody)
      return jsonResponse({ success: false, error: parsed.error }, 400)
    }

    const body = parsed.value
    console.log('=== Webhook de status de instância recebido ===')
    console.log('Body:', JSON.stringify(body, null, 2))

    // Extrair dados - pode ser array ou objeto
    const dados = Array.isArray(body) ? body[0] : body

    // Token pode vir no body (token / instance.token) OU via header
    const tokenFromHeader =
      req.headers.get('x-instance-token') ||
      req.headers.get('x-token') ||
      req.headers.get('x-instancia-token')

    // Extrair token para identificar a instância
    const token =
      tokenFromHeader ||
      (typeof dados === 'object' && dados !== null
        ? // @ts-ignore - payload externo
          (dados.token || dados.instance?.token)
        : null)
    
    if (!token) {
      console.error('Token não encontrado no payload')
      const keys =
        typeof dados === 'object' && dados !== null ? Object.keys(dados as Record<string, unknown>) : []

      return jsonResponse(
        {
          success: false,
          error:
            'Token não encontrado. Envie `token` no body (ou `instance.token`) OU no header `x-instance-token`.',
          receivedKeys: keys,
        },
        400
      )
    }

    // Mapear status
    let statusBanco: 'criada' | 'conectada' | 'desconectada' | 'erro' = 'criada'
    const isConnected =
      (typeof dados === 'object' && dados !== null && (dados as any).status === 'connected') ||
      dados.instance?.status === 'connected' ||
      dados.status?.connected === true ||
      dados.status?.loggedIn === true
    
    if (isConnected) {
      statusBanco = 'conectada'
    } else if (dados.instance?.status === 'disconnected' || dados.status?.connected === false) {
      statusBanco = 'desconectada'
    }

    // Extrair telefone do campo owner
    const telefone =
      typeof dados === 'object' && dados !== null
        ? // @ts-ignore - payload externo
          (dados.instance?.owner || dados.telefone || null)
        : null

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
      return jsonResponse({ success: false, error: error.message }, 500)
    }

    if (!data || data.length === 0) {
      console.error('Nenhuma instância encontrada com esse token')
      return jsonResponse({ success: false, error: 'Instância não encontrada' }, 404)
    }

    console.log('Instância atualizada com sucesso:', data[0].nome)

    return jsonResponse(
      {
        success: true,
        message: 'Status atualizado com sucesso',
        instancia: data[0],
      },
      200
    )

  } catch (error: unknown) {
    console.error('Erro no webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return jsonResponse({ success: false, error: errorMessage }, 500)
  }
})