import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting - max 1 ping per 2 seconds per courier for real-time tracking
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 2000

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

    const { lat, lng, speed, heading, accuracy, battery_pct } = await req.json()
    
    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required')
    }

    // Rate limiting check
    const now = Date.now()
    const lastPing = rateLimitMap.get(user.id) || 0
    if (now - lastPing < RATE_LIMIT_MS) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limited - wait 2 seconds between pings',
          retry_after: Math.ceil((RATE_LIMIT_MS - (now - lastPing)) / 1000)
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    rateLimitMap.set(user.id, now)

    console.log(`Location ping from courier ${user.id}: ${lat}, ${lng}`)

    // Enhanced logging for audit trail
    const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const timestamp = new Date().toISOString()

    // 1. Update courier session with latest location
    const { error: sessionError } = await supabaseService
      .from('courier_sessions')
      .upsert({
        courier_id: user.id,
        is_online: true,
        last_seen: timestamp,
        battery_pct,
        location: `POINT(${lng} ${lat})`,
        updated_at: timestamp
      })

    if (sessionError) {
      console.error('Session update error:', sessionError)
    }

    // 2. Store high-frequency location
    const { error: locationError } = await supabaseService
      .from('courier_locations')
      .insert({
        courier_id: user.id,
        location: `POINT(${lng} ${lat})`,
        speed_mps: speed || null,
        heading_deg: heading || null,
        accuracy_m: accuracy || null,
        timestamp
      })

    if (locationError) {
      console.error('Location insert error:', locationError)
    }

    // Log location update for audit trail
    const { error: auditError } = await supabaseService
      .from('location_audit_logs')
      .insert({
        courier_id: user.id,
        event_type: 'location_update',
        location_lat: lat,
        location_lng: lng,
        metadata: {
          speed_mps: speed,
          heading_deg: heading,
          accuracy_m: accuracy,
          battery_pct
        },
        ip_address: clientIP,
        user_agent: userAgent
      })

    if (auditError) {
      console.error('Audit log error:', auditError)
    }

    // 3. Check for active orders and update order locations
    const { data: activeOrders, error: ordersError } = await supabaseService
      .from('orders')
      .select(`
        id, 
        user_id, 
        restaurant_id,
        status,
        delivery_address,
        arrive_radius_client_m,
        restaurants (
          latitude,
          longitude, 
          arrive_radius_m
        )
      `)
      .eq('courier_id', user.id)
      .in('status', [
        'COURIER_ASSIGNED', 
        'EN_ROUTE_TO_STORE', 
        'PICKED_UP', 
        'OUT_FOR_DELIVERY', 
        'ARRIVED_AT_DESTINATION'
      ])

    if (ordersError) {
      console.error('Orders fetch error:', ordersError)
    }

    const responses = []

    if (activeOrders && activeOrders.length > 0) {
      for (const order of activeOrders) {
        try {
          let eta_min = null
          let distance_km = null
          let shouldUpdateStatus = false
          let newStatus = null

          // Calculate distance to restaurant or customer based on order status
          const isGoingToStore = ['COURIER_ASSIGNED', 'EN_ROUTE_TO_STORE'].includes(order.status)
          const isDelivering = ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status)

          if (isGoingToStore && order.restaurants) {
            // Calculate distance to restaurant
            distance_km = await calculateDistance(
              lat, lng, 
              order.restaurants.latitude, 
              order.restaurants.longitude
            )
            
            // Check if courier arrived at restaurant
            const arriveRadius = order.restaurants.arrive_radius_m || 60
            if (distance_km * 1000 <= arriveRadius) {
              if (order.status === 'COURIER_ASSIGNED') {
                shouldUpdateStatus = true
                newStatus = 'EN_ROUTE_TO_STORE'
              }
            }

            // Simple ETA calculation (assuming 30 km/h average speed)
            eta_min = Math.ceil((distance_km / 30) * 60)

          } else if (isDelivering && order.delivery_address) {
            // Calculate distance to customer
            const customerLat = order.delivery_address.latitude
            const customerLng = order.delivery_address.longitude
            
            if (customerLat && customerLng) {
              distance_km = await calculateDistance(lat, lng, customerLat, customerLng)
              
              // Check if courier arrived at customer
              const arriveRadius = order.arrive_radius_client_m || 60
              if (distance_km * 1000 <= arriveRadius && order.status === 'OUT_FOR_DELIVERY') {
                shouldUpdateStatus = true
                newStatus = 'ARRIVED_AT_DESTINATION'
              }

              eta_min = Math.ceil((distance_km / 30) * 60)
            }
          }

          // Update order location (sampled every ~10s)
          const { error: orderLocationError } = await supabaseService
            .from('order_locations')
            .insert({
              order_id: order.id,
              courier_id: user.id,
              location: `POINT(${lng} ${lat})`,
              eta_min,
              distance_km,
              timestamp
            })

          if (orderLocationError) {
            console.error('Order location insert error:', orderLocationError)
          }

          // Update order status if geofence triggered
          if (shouldUpdateStatus && newStatus) {
            const { error: statusError } = await supabaseService
              .rpc('update_order_status_v3', {
                p_order_id: order.id,
                p_to_status: newStatus,
                p_actor_id: user.id,
                p_actor_role: 'courier',
                p_notes: 'Automatic status update based on location'
              })

            if (statusError) {
              console.error('Status update error:', statusError)
            } else {
              console.log(`Order ${order.id} status updated to ${newStatus}`)
            }
          }

          // Broadcast realtime update
          await supabaseService
            .channel(`order:${order.id}`)
            .send({
              type: 'broadcast',
              event: 'location_update',
              payload: {
                courier_id: user.id,
                lat,
                lng,
                eta_min,
                distance_km,
                status: newStatus || order.status,
                timestamp
              }
            })

          responses.push({
            order_id: order.id,
            status: newStatus || order.status,
            eta_min,
            distance_km,
            status_updated: shouldUpdateStatus
          })

        } catch (orderError) {
          console.error(`Error processing order ${order.id}:`, orderError)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        courier_id: user.id,
        location: { lat, lng },
        active_orders: responses.length,
        orders: responses,
        timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Location ping error:', error)
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

// Helper function to calculate distance using Haversine formula
async function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c // Distance in kilometers
}