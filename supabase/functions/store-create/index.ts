import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Store create function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface StoreCreateRequest {
  storeData: {
    id: string
    name?: string
    description?: string
    phone?: string
    email?: string
    address_json?: any
    logo_url?: string
    status?: string
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

    const body: StoreCreateRequest = await req.json()
    
    if (!body.storeData) {
      return new Response(
        JSON.stringify({ error: 'storeData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { storeData } = body;

    console.log(`Creating/updating store for user: ${user.id}`)

    // Verificar se o usuário tem permissão para essa loja
    if (storeData.id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User can only create/update their own store' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inserir ou atualizar loja na tabela stores
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .upsert({
        id: storeData.id,
        name: storeData.name,
        description: storeData.description,
        phone: storeData.phone,
        email: storeData.email,
        address_json: storeData.address_json,
        logo_url: storeData.logo_url,
        status: storeData.status || 'DRAFT',
        cuisine_type: storeData.cuisine_type,
        min_order_value: storeData.min_order_value,
        delivery_fee: storeData.delivery_fee,
        estimated_delivery_time: storeData.estimated_delivery_time,
        operating_hours: storeData.operating_hours,
        payment_methods: storeData.payment_methods,
        features: storeData.features,
        created_by: user.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error upserting store:', storeError)
      return new Response(
        JSON.stringify({ error: 'Failed to create/update store' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Store ${store.name || 'Draft'} created/updated successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        store: store,
        message: 'Loja salva com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in store create:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})