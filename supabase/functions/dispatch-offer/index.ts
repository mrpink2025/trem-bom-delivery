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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { order_id } = await req.json()
    
    if (!order_id) {
      throw new Error('order_id is required')
    }

    console.log(`Processing dispatch offer for order: ${order_id}`)

    // Get order details with restaurant location
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        restaurant:restaurants (
          id,
          name,
          latitude,
          longitude,
          arrive_radius_m
        )
      `)
      .eq('id', order_id)
      .eq('status', 'READY')
      .single()

    if (orderError || !order) {
      throw new Error(`Order not found or not ready: ${orderError?.message}`)
    }

    const restaurantLat = order.restaurant.latitude
    const restaurantLng = order.restaurant.longitude

    if (!restaurantLat || !restaurantLng) {
      throw new Error('Restaurant location not available')
    }

    // Find nearby online couriers
    const { data: nearbyCouriers, error: couriersError } = await supabaseClient
      .rpc('get_nearby_couriers', {
        p_latitude: restaurantLat,
        p_longitude: restaurantLng,
        p_radius_km: 5.0,
        p_limit: 3
      })

    if (couriersError) {
      throw new Error(`Error finding couriers: ${couriersError.message}`)
    }

    if (!nearbyCouriers || nearbyCouriers.length === 0) {
      console.log('No nearby couriers available')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No couriers available in the area',
          couriers_found: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${nearbyCouriers.length} nearby couriers`)

    // Create order assignments for each courier
    const assignments = nearbyCouriers.map(courier => ({
      order_id,
      courier_id: courier.courier_id,
      assigned_at: new Date().toISOString(),
      declined: false
    }))

    const { error: assignmentError } = await supabaseClient
      .from('order_assignments')
      .upsert(assignments)

    if (assignmentError) {
      throw new Error(`Error creating assignments: ${assignmentError.message}`)
    }

    // Send push notifications to couriers
    for (const courier of nearbyCouriers) {
      try {
        await supabaseClient.functions.invoke('send-notification', {
          body: {
            user_id: courier.courier_id,
            title: 'Nova Corrida Disponível!',
            message: `Pedido de ${order.restaurant.name} - ${courier.distance_km.toFixed(1)}km`,
            type: 'ORDER_OFFER',
            data: {
              order_id,
              restaurant_name: order.restaurant.name,
              distance_km: courier.distance_km,
              estimated_value: (order.total_amount * 0.1).toFixed(2) // 10% commission example
            }
          }
        })
      } catch (notificationError) {
        console.error(`Failed to send notification to courier ${courier.courier_id}:`, notificationError)
      }
    }

    // Log the dispatch event
    await supabaseClient
      .from('order_events')
      .insert({
        order_id,
        status: 'COURIER_ASSIGNED',
        actor_role: 'system',
        notes: `Dispatch offered to ${nearbyCouriers.length} couriers`
      })

    return new Response(
      JSON.stringify({
        success: true,
        couriers_found: nearbyCouriers.length,
        assignments_created: assignments.length,
        couriers: nearbyCouriers.map(c => ({
          courier_id: c.courier_id,
          distance_km: c.distance_km,
          battery_pct: c.battery_pct
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Dispatch offer error:', error)
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