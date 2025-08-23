import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, title, body, data, actions } = await req.json()

    console.log('Enviando notificação push para:', user_id)

    // Buscar tokens de dispositivo do usuário
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('active', true)

    if (tokenError) {
      console.error('Erro ao buscar tokens:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar tokens do dispositivo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log('Nenhum token encontrado para o usuário:', user_id)
      return new Response(
        JSON.stringify({ message: 'Nenhum dispositivo registrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Salvar notificação no banco
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        message: body,
        data,
        type: data?.type || 'system',
        read: false
      })

    if (insertError) {
      console.error('Erro ao salvar notificação:', insertError)
    }

    // Simular envio de notificação push
    console.log('Notificação push simulada enviada:', {
      tokens: deviceTokens.length,
      title,
      body,
      actions
    })

    return new Response(
      JSON.stringify({ success: true, tokens_sent: deviceTokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função push-notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})