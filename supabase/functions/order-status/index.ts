import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { order_id, to_status, notes } = await req.json()
    
    if (!order_id || !to_status) {
      throw new Error('order_id and to_status are required')
    }

    console.log(`Status update request: ${order_id} -> ${to_status} by ${user.id}`)

    // Get user role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const userRole = profile?.role || 'client'

    // Use service role for the actual update
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate user permissions for the order
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(owner_id, name)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Check permissions based on role and relationship to order
    let hasPermission = false
    
    switch (userRole) {
      case 'admin':
        hasPermission = true
        break
      case 'client':
        hasPermission = order.user_id === user.id && to_status === 'CANCELLED'
        break
      case 'seller':
        hasPermission = order.restaurant?.owner_id === user.id
        break
      case 'courier':
        hasPermission = order.courier_id === user.id
        break
    }

    if (!hasPermission) {
      throw new Error('Insufficient permissions to update this order status')
    }

    // Update the order status using the secure function
    const { data: updateResult, error: updateError } = await supabaseService
      .rpc('update_order_status_v3', {
        p_order_id: order_id,
        p_to_status: to_status,
        p_actor_id: user.id,
        p_actor_role: userRole,
        p_notes: notes || null
      })

    if (updateError) {
      throw new Error(`Status update failed: ${updateError.message}`)
    }

    // Send notifications based on status change
    const statusNotifications: Record<string, { title: string; message: string; users: string[] }> = {
      'CONFIRMED': {
        title: 'Pedido Confirmado',
        message: `Seu pedido foi confirmado pelo ${order.restaurant?.name}`,
        users: [order.user_id]
      },
      'PREPARING': {
        title: 'Preparando seu pedido',
        message: `${order.restaurant?.name} está preparando seu pedido`,
        users: [order.user_id]
      },
      'READY': {
        title: 'Pedido pronto!',
        message: 'Seu pedido está pronto e aguardando entregador',
        users: [order.user_id]
      },
      'COURIER_ASSIGNED': {
        title: 'Entregador designado',
        message: 'Um entregador foi designado para seu pedido',
        users: [order.user_id]
      },
      'PICKED_UP': {
        title: 'Pedido retirado',
        message: 'O entregador retirou seu pedido e está a caminho',
        users: [order.user_id]
      },
      'OUT_FOR_DELIVERY': {
        title: 'Saiu para entrega',
        message: 'Seu pedido saiu para entrega',
        users: [order.user_id]
      },
      'ARRIVED_AT_DESTINATION': {
        title: 'Entregador chegou',
        message: 'O entregador chegou ao seu endereço',
        users: [order.user_id]
      },
      'DELIVERED': {
        title: 'Pedido entregue!',
        message: 'Seu pedido foi entregue com sucesso',
        users: [order.user_id, order.restaurant?.owner_id].filter(Boolean)
      },
      'CANCELLED': {
        title: 'Pedido cancelado',
        message: 'O pedido foi cancelado',
        users: [order.user_id, order.restaurant?.owner_id, order.courier_id].filter(Boolean)
      }
    }

    const notification = statusNotifications[to_status]
    if (notification) {
      for (const userId of notification.users) {
        try {
          await supabaseService.functions.invoke('send-notification', {
            body: {
              user_id: userId,
              title: notification.title,
              message: notification.message,
              type: 'ORDER_STATUS_UPDATE',
              data: {
                order_id,
                status: to_status,
                restaurant_name: order.restaurant?.name
              }
            }
          })
        } catch (notificationError) {
          console.error(`Failed to send notification to ${userId}:`, notificationError)
        }
      }
    }

    // Broadcast realtime update
    await supabaseService
      .channel(`order:${order_id}`)
      .send({
        type: 'broadcast',
        event: 'status_update',
        payload: {
          order_id,
          status: to_status,
          actor_id: user.id,
          actor_role: userRole,
          timestamp: new Date().toISOString(),
          notes
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        order_id,
        from_status: order.status,
        to_status,
        actor_id: user.id,
        actor_role: userRole,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Order status update error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})