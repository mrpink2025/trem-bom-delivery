import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Courier admin reject function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RejectionRequest {
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

    const body: RejectionRequest = await req.json()
    
    if (!body.courier_id || !body.reason) {
      return new Response(
        JSON.stringify({ error: 'courier_id and reason are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing rejection for courier: ${body.courier_id}`)

    // Verificar se existe e está UNDER_REVIEW
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

    if (courier.status !== 'UNDER_REVIEW') {
      return new Response(
        JSON.stringify({ 
          error: 'Courier must be under review to reject',
          current_status: courier.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rejeitar courier
    const { data: updatedCourier, error: updateError } = await supabase
      .from('couriers')
      .update({ 
        status: 'REJECTED',
        rejection_reason: body.reason,
        approved_at: null
      })
      .eq('id', body.courier_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting courier:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to reject courier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar notificação para o courier
    await supabase
      .from('notifications')
      .insert({
        user_id: body.courier_id,
        type: 'courier_rejected',
        title: 'Cadastro rejeitado',
        message: `Seu cadastro de entregador foi rejeitado. Motivo: ${body.reason}. Você pode corrigir os problemas e enviar novamente.`,
        data: {
          reason: body.reason,
          rejected_at: new Date().toISOString()
        }
      })

    console.log(`Courier rejected successfully: ${body.courier_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Courier rejected successfully',
        courier: updatedCourier
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in courier admin reject:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})