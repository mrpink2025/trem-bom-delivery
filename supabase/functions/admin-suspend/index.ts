import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    db: { schema: 'public' }
  }
)

interface SuspensionRequest {
  kind: 'merchant' | 'courier'
  id: string
  reason: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { kind, id, reason }: SuspensionRequest = await req.json()

    if (!kind || !id || !reason || !['merchant', 'courier'].includes(kind)) {
      return new Response(JSON.stringify({ 
        error: 'kind (merchant|courier), id, and reason are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (kind === 'merchant') {
      // Suspender merchant
      const { data: merchant, error: fetchError } = await supabase
        .from('merchants')
        .select('id, status, owner_user_id, trade_name')
        .eq('id', id)
        .single()

      if (fetchError || !merchant) {
        return new Response(JSON.stringify({ error: 'Merchant not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (merchant.status === 'SUSPENDED') {
        return new Response(JSON.stringify({ 
          error: 'Merchant is already suspended' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Atualizar status do merchant
      const { error: updateError } = await supabase
        .from('merchants')
        .update({
          status: 'SUSPENDED',
          rejection_reason: reason // Usar mesmo campo para motivo da suspensão
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error suspending merchant:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to suspend merchant' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Desativar todas as store_units do merchant
      await supabase
        .from('store_units')
        .update({ is_open: false })
        .eq('merchant_id', id)

      // Cancelar pedidos ativos (se houver)
      await supabase
        .from('orders')
        .update({ 
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', id)
        .in('status', ['CONFIRMED', 'PREPARING', 'READY'])

      // Log admin action
      await supabase.from('admin_actions_log').insert({
        actor_admin_id: user.id,
        action: 'MERCHANT_SUSPENDED',
        target_table: 'merchants',
        target_id: id,
        reason: reason,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

      // Notificar o merchant
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: merchant.owner_user_id,
            type: 'merchant_suspended',
            title: 'Loja Suspensa',
            message: `Sua loja "${merchant.trade_name}" foi suspensa. Motivo: ${reason}`,
            data: { merchant_id: id, reason }
          }
        })
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Merchant suspended successfully',
        merchant_id: id,
        status: 'SUSPENDED',
        reason: reason
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      // Suspender courier
      const { data: courier, error: fetchError } = await supabase
        .from('couriers')
        .select('id, status, full_name')
        .eq('id', id)
        .single()

      if (fetchError || !courier) {
        return new Response(JSON.stringify({ error: 'Courier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (courier.status === 'SUSPENDED') {
        return new Response(JSON.stringify({ 
          error: 'Courier is already suspended' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Atualizar status do courier
      const { error: updateError } = await supabase
        .from('couriers')
        .update({
          status: 'SUSPENDED',
          rejection_reason: reason // Usar mesmo campo para motivo da suspensão
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error suspending courier:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to suspend courier' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Forçar courier offline
      await supabase
        .from('courier_presence')
        .update({ is_online: false })
        .eq('courier_id', id)

      // Cancelar ofertas ativas
      await supabase
        .from('dispatch_offers')
        .update({ status: 'CANCELLED' })
        .eq('courier_id', id)
        .eq('status', 'PENDING')

      // Log admin action
      await supabase.from('admin_actions_log').insert({
        actor_admin_id: user.id,
        action: 'COURIER_SUSPENDED',
        target_table: 'couriers',
        target_id: id,
        reason: reason,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

      // Notificar o courier
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: id,
            type: 'courier_suspended',
            title: 'Conta Suspensa',
            message: `Olá ${courier.full_name}, sua conta foi suspensa. Motivo: ${reason}`,
            data: { courier_id: id, reason }
          }
        })
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Courier suspended successfully',
        courier_id: id,
        status: 'SUSPENDED',
        reason: reason
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Error in admin-suspend:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})