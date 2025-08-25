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

    const { order_id, confirmation_code, location_lat, location_lng } = await req.json()
    
    if (!order_id || !confirmation_code) {
      throw new Error('Order ID and confirmation code are required')
    }

    console.log(`Delivery confirmation attempt for order ${order_id} by courier ${user.id}`)

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the validation function
    const { data: result, error: validationError } = await supabaseService
      .rpc('validate_delivery_confirmation', {
        p_order_id: order_id,
        p_courier_id: user.id,
        p_confirmation_code: confirmation_code,
        p_location_lat: location_lat,
        p_location_lng: location_lng
      })

    if (validationError) {
      console.error('Validation error:', validationError)
      throw new Error('Failed to validate delivery confirmation')
    }

    // If successful, update order status to delivered
    if (result.success) {
      const { error: statusError } = await supabaseService
        .rpc('update_order_status_v3', {
          p_order_id: order_id,
          p_to_status: 'DELIVERED',
          p_actor_id: user.id,
          p_actor_role: 'courier',
          p_notes: 'Delivery confirmed with customer code'
        })

      if (statusError) {
        console.error('Status update error:', statusError)
        throw new Error('Failed to update order status')
      }

      // Broadcast delivery completion
      await supabaseService
        .channel(`order:${order_id}`)
        .send({
          type: 'broadcast',
          event: 'delivery_confirmed',
          payload: {
            order_id,
            courier_id: user.id,
            confirmed_at: new Date().toISOString(),
            location_lat,
            location_lng
          }
        })

      console.log(`Order ${order_id} delivered successfully`)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Delivery confirmation error:', error)
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