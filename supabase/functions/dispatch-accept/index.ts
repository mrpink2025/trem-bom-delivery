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

    const { order_id } = await req.json()
    
    if (!order_id) {
      throw new Error('order_id is required')
    }

    console.log(`Courier ${user.id} accepting order: ${order_id}`)

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if courier has an active assignment for this order
    const { data: assignment, error: assignmentError } = await supabaseService
      .from('order_assignments')
      .select('*')
      .eq('order_id', order_id)
      .eq('courier_id', user.id)
      .eq('declined', false)
      .is('accepted_at', null)
      .single()

    if (assignmentError || !assignment) {
      throw new Error('No valid assignment found for this order')
    }

    // Check if order is still available
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*, restaurant:restaurants(name, latitude, longitude)')
      .eq('id', order_id)
      .in('status', ['READY', 'COURIER_ASSIGNED'])
      .is('courier_id', null)
      .single()

    if (orderError || !order) {
      throw new Error('Order is no longer available')
    }

    // Begin transaction-like operations
    const now = new Date().toISOString()

    // 1. Update the assignment as accepted
    const { error: updateAssignmentError } = await supabaseService
      .from('order_assignments')
      .update({ 
        accepted_at: now,
        updated_at: now 
      })
      .eq('order_id', order_id)
      .eq('courier_id', user.id)

    if (updateAssignmentError) {
      throw new Error(`Failed to update assignment: ${updateAssignmentError.message}`)
    }

    // 2. Assign courier to order and update status
    const { error: updateOrderError } = await supabaseService
      .from('orders')
      .update({
        courier_id: user.id,
        status: 'COURIER_ASSIGNED',
        status_updated_at: now,
        updated_at: now
      })
      .eq('id', order_id)

    if (updateOrderError) {
      throw new Error(`Failed to assign courier to order: ${updateOrderError.message}`)
    }

    // 3. Decline other assignments for this order
    const { error: declineOthersError } = await supabaseService
      .from('order_assignments')
      .update({ 
        declined: true,
        updated_at: now 
      })
      .eq('order_id', order_id)
      .neq('courier_id', user.id)

    if (declineOthersError) {
      console.error('Failed to decline other assignments:', declineOthersError)
    }

    // 4. Log the acceptance event
    await supabaseService
      .from('order_events')
      .insert({
        order_id,
        status: 'COURIER_ASSIGNED',
        actor_id: user.id,
        actor_role: 'courier',
        notes: 'Order accepted by courier'
      })

    // 5. Notify customer and restaurant
    try {
      // Notify customer
      await supabaseService.functions.invoke('send-notification', {
        body: {
          user_id: order.user_id,
          title: 'Entregador a caminho!',
          message: `Seu pedido foi aceito e o entregador está a caminho do ${order.restaurant.name}`,
          type: 'ORDER_ACCEPTED',
          data: { order_id, status: 'COURIER_ASSIGNED' }
        }
      })

      // Notify restaurant  
      if (order.restaurant?.owner_id) {
        await supabaseService.functions.invoke('send-notification', {
          body: {
            user_id: order.restaurant.owner_id,
            title: 'Entregador designado',
            message: `Entregador foi designado para o pedido #${order_id.substr(-8)}`,
            type: 'COURIER_ASSIGNED',
            data: { order_id, courier_id: user.id }
          }
        })
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError)
    }

    console.log(`Order ${order_id} successfully accepted by courier ${user.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        order_id,
        courier_id: user.id,
        status: 'COURIER_ASSIGNED',
        restaurant: {
          name: order.restaurant?.name,
          latitude: order.restaurant?.latitude,
          longitude: order.restaurant?.longitude
        },
        message: 'Order successfully accepted'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Dispatch accept error:', error)
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