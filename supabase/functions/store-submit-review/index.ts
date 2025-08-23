import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Store submit review function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface StoreSubmitRequest {
  storeData: {
    id: string
    name?: string
    description?: string
    phone?: string
    email?: string
    address_json?: any
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

    const body: StoreSubmitRequest = await req.json()
    
    if (!body.storeData) {
      return new Response(
        JSON.stringify({ error: 'storeData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { storeData } = body;

    console.log(`Submitting store for review: ${user.id}`)

    // Verificar se o usuário tem permissão para essa loja
    if (storeData.id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User can only submit their own store' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se a loja existe
    const { data: existingStore, error: storeError } = await supabase
      .from('restaurants')
      .select('id, is_active, name')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !existingStore) {
      return new Response(
        JSON.stringify({ error: 'Store not found. Please save your store data first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se já está ativa (aprovada)
    if (existingStore.is_active) {
      return new Response(
        JSON.stringify({ error: 'Store is already active and approved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar dados obrigatórios
    if (!storeData.name || !storeData.phone || !storeData.email || !storeData.address_json) {
      return new Response(
        JSON.stringify({ error: 'Required fields missing: name, phone, email, address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Atualizar com os dados finais e marcar como aguardando aprovação
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
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
        is_active: false,  // Aguarda aprovação admin
        is_open: false,
        submitted_for_review_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('owner_id', user.id)

    if (updateError) {
      console.error('Error updating restaurant for review:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to submit restaurant for review' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log de auditoria
    await supabase.from('audit_logs').insert({
      table_name: 'restaurants',
      operation: 'STORE_SUBMITTED',
      record_id: existingStore.id,
      user_id: user.id,
      new_values: {
        submitted_for_review_at: new Date().toISOString(),
        status: 'UNDER_REVIEW'
      }
    })

    // Notificar admins (opcional)
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'store_submitted',
          store_id: existingStore.id,
          store_name: storeData.name,
          message: 'Nova loja enviada para análise'
        }
      })
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
      // Não falhar a operação por causa da notificação
    }

    console.log(`Store ${storeData.name} submitted for review successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Loja enviada para análise. Aguarde aprovação do administrador.',
        store_id: existingStore.id,
        status: 'UNDER_REVIEW'
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