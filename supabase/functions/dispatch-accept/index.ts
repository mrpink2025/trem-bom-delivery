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

    const { offer_id } = await req.json()
    
    if (!offer_id) {
      throw new Error('offer_id is required')
    }

    console.log(`Courier ${user.id} accepting offer: ${offer_id}`)

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Usar a função stored procedure para aceitar a oferta
    const { data: result, error: acceptError } = await supabaseService
      .rpc('accept_dispatch_offer', {
        p_offer_id: offer_id,
        p_courier_id: user.id,
        p_order_id: null // será preenchido automaticamente pela função
      })

    if (acceptError || result?.error) {
      throw new Error(result?.error || acceptError.message)
    }

    // Buscar detalhes do pedido aceito
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select(`
        *,
        restaurants!inner(
          name,
          location
        )
      `)
      .eq('id', result.order_id)
      .single()

    if (orderError) {
      console.error('Erro ao buscar detalhes do pedido:', orderError)
    }

    console.log(`Offer ${offer_id} successfully accepted by courier ${user.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        order_id: result.order_id,
        courier_id: user.id,
        order_details: order,
        message: 'Offer successfully accepted'
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