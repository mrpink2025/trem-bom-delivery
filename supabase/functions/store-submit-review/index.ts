import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Store submit review function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface StoreSubmissionRequest {
  storeData: {
    id: string
    name: string
    description?: string
    phone: string
    email: string
    address_json: any
    logo_url?: string
    cuisine_type?: string
    min_order_value?: number
    delivery_fee?: number
    estimated_delivery_time?: number
    operating_hours?: any
    payment_methods?: string[]
    features?: string[]
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: StoreSubmissionRequest = await req.json()
    
    if (!body.storeData) {
      return new Response(
        JSON.stringify({ error: 'storeData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { storeData } = body;

    console.log(`Submitting store for review: ${storeData.name} (${user.id})`)

    // Verificar se o usuário tem permissão para essa loja
    if (storeData.id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User can only submit their own store' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Atualizar ou inserir loja na tabela restaurants
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .upsert({
        id: storeData.id,
        name: storeData.name,
        description: storeData.description,
        phone: storeData.phone,
        email: storeData.email,
        address: storeData.address_json,
        image_url: storeData.logo_url,
        cuisine_type: storeData.cuisine_type,
        minimum_order: storeData.min_order_value,
        delivery_fee: storeData.delivery_fee,
        delivery_time_min: storeData.estimated_delivery_time ? storeData.estimated_delivery_time - 5 : 20,
        delivery_time_max: storeData.estimated_delivery_time ? storeData.estimated_delivery_time + 5 : 40,
        opening_hours: storeData.operating_hours,
        is_active: true,
        is_open: true,
        owner_id: user.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (restaurantError) {
      console.error('Error upserting restaurant:', restaurantError)
      return new Response(
        JSON.stringify({ error: 'Failed to submit restaurant for review' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log da submissão
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        table_name: 'restaurants',
        operation: 'SUBMIT_FOR_REVIEW',
        new_values: {
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          submitted_by: user.id,
          submission_date: new Date().toISOString()
        },
        user_id: user.id
      })

    if (auditError) {
      console.error('Error creating audit log:', auditError)
      // Não falhar a operação por causa do audit log
    }

    console.log(`Restaurant ${restaurant.name} submitted for review successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: restaurant,
        message: 'Restaurante enviado para análise com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in store submit review:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})