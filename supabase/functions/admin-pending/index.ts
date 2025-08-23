import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    db: { schema: 'public' }
  }
)

// Helper functions to calculate completion and missing documents
function calculateRestaurantCompletion(restaurant: any): number {
  const requiredFields = ['legal_name', 'trade_name', 'cnpj', 'responsible_name', 'responsible_cpf', 'phone', 'email', 'address_json']
  const completedFields = requiredFields.filter(field => restaurant[field])
  return Math.round((completedFields.length / requiredFields.length) * 100)
}

function getMissingRestaurantDocuments(restaurant: any): string[] {
  const missing = []
  if (!restaurant.legal_name) missing.push('Razão Social')
  if (!restaurant.trade_name) missing.push('Nome Fantasia')
  if (!restaurant.cnpj) missing.push('CNPJ')
  if (!restaurant.responsible_name) missing.push('Nome do Responsável')
  if (!restaurant.responsible_cpf) missing.push('CPF do Responsável')
  if (!restaurant.phone) missing.push('Telefone')
  if (!restaurant.email) missing.push('Email')
  if (!restaurant.address_json) missing.push('Endereço')
  return missing
}

function calculateCourierCompletion(courier: any): number {
  const requiredFields = ['full_name', 'birth_date', 'cpf', 'phone', 'address_json', 'vehicle_brand', 'vehicle_model', 'vehicle_year', 'plate', 'cnh_valid_until', 'crlv_valid_until', 'pix_key_type', 'pix_key']
  const completedFields = requiredFields.filter(field => courier[field])
  return Math.round((completedFields.length / requiredFields.length) * 100)
}

function getMissingCourierDocuments(courier: any): string[] {
  const missing = []
  if (!courier.full_name) missing.push('Nome Completo')
  if (!courier.birth_date) missing.push('Data de Nascimento')
  if (!courier.cpf) missing.push('CPF')
  if (!courier.phone) missing.push('Telefone')
  if (!courier.address_json) missing.push('Endereço')
  if (!courier.vehicle_brand) missing.push('Marca do Veículo')
  if (!courier.vehicle_model) missing.push('Modelo do Veículo')
  if (!courier.vehicle_year) missing.push('Ano do Veículo')
  if (!courier.plate) missing.push('Placa')
  if (!courier.cnh_valid_until) missing.push('CNH')
  if (!courier.crlv_valid_until) missing.push('CRLV')
  if (!courier.pix_key_type) missing.push('Tipo Chave PIX')
  if (!courier.pix_key) missing.push('Chave PIX')
  if (!courier.selfie_url) missing.push('Selfie')
  return missing
}

Deno.serve(async (req) => {
  console.log(`[admin-pending] Method: ${req.method}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se é admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      // Buscar restaurants pendentes (equivalente aos merchants)
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (restaurantsError) {
        console.error('Error fetching restaurants:', restaurantsError)
      }

      // Buscar couriers pendentes  
      const { data: couriers, error: couriersError } = await supabase
        .from('couriers')
        .select('*')
        .in('status', ['DRAFT', 'UNDER_REVIEW'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (couriersError) {
        console.error('Error fetching couriers:', couriersError)
      }

      // Formatar dados dos restaurants
      const formattedRestaurants = (restaurants || []).map(r => ({
        ...r,
        kind: 'merchant', // Changed from 'restaurant' to 'merchant' to match component expectations
        completion_percentage: calculateRestaurantCompletion(r),
        missing_documents: getMissingRestaurantDocuments(r),
        city: r.address_json?.city || '',
        state: r.address_json?.state || '',
        submission_date: r.created_at,
        waiting_days: Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }))

      // Formatar dados dos couriers
      const formattedCouriers = (couriers || []).map(c => ({
        ...c,
        kind: 'courier',
        completion_percentage: calculateCourierCompletion(c),
        missing_documents: getMissingCourierDocuments(c),
        city: c.address_json?.city || '',
        state: c.address_json?.state || '',
        submission_date: c.created_at,
        waiting_days: Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        cnh_expired: c.cnh_valid_until ? new Date(c.cnh_valid_until) < new Date() : false,
        crlv_expired: c.crlv_valid_until ? new Date(c.crlv_valid_until) < new Date() : false,
        cnh_expiring_soon: c.cnh_valid_until ? new Date(c.cnh_valid_until) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false,
        crlv_expiring_soon: c.crlv_valid_until ? new Date(c.crlv_valid_until) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false,
      }))

      // Combinar resultados
      const results = [...formattedRestaurants, ...formattedCouriers].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
      })

      console.log(`[admin-pending] Found ${restaurants?.length || 0} restaurants, ${couriers?.length || 0} couriers`)

      return new Response(JSON.stringify({
        success: true,
        data: results,
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: results.length,
          totalPages: Math.ceil(results.length / 20),
          hasNext: false,
          hasPrev: false
        },
        summary: {
          total_pending: results.length,
          merchants_pending: restaurants?.length || 0,
          couriers_pending: couriers?.length || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-pending:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})