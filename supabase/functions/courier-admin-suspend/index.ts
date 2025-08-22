import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Courier admin suspend function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SuspensionRequest {
  courier_id: string
  reason: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação e role de admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: SuspensionRequest = await req.json()
    
    if (!body.courier_id || !body.reason) {
      return new Response(
        JSON.stringify({ error: 'courier_id and reason are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing suspension for courier: ${body.courier_id}`)

    // Verificar se existe 
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('*')
      .eq('id', body.courier_id)
      .single()

    if (courierError || !courier) {
      return new Response(
        JSON.stringify({ error: 'Courier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (courier.status === 'SUSPENDED') {
      return new Response(
        JSON.stringify({ 
          error: 'Courier is already suspended',
          current_status: courier.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Suspender courier
    const { data: updatedCourier, error: updateError } = await supabase
      .from('couriers')
      .update({ 
        status: 'SUSPENDED',
        suspended_reason: body.reason
      })
      .eq('id', body.courier_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error suspending courier:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to suspend courier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cancelar pedidos em andamento (se houver)
    const { error: ordersError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled'
      })
      .eq('courier_id', body.courier_id)
      .in('status', ['confirmed', 'preparing', 'ready', 'picked_up'])

    if (ordersError) {
      console.error('Error cancelling orders:', ordersError)
    }

    // Criar notificação para o courier
    await supabase
      .from('notifications')
      .insert({
        user_id: body.courier_id,
        type: 'courier_suspended',
        title: 'Conta suspensa',
        message: `Sua conta de entregador foi suspensa. Motivo: ${body.reason}. Entre em contato com o suporte para mais informações.`,
        data: {
          reason: body.reason,
          suspended_at: new Date().toISOString()
        }
      })

    console.log(`Courier suspended successfully: ${body.courier_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Courier suspended successfully',
        courier: updatedCourier
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in courier admin suspend:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})