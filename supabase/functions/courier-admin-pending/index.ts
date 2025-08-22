import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Courier admin pending function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface PendingFilters {
  page?: number
  limit?: number
  city?: string
  plate?: string
  submitted_after?: string
  submitted_before?: string
  expiring_soon?: boolean // CNH ou CRLV expirando em 30 dias
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

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse query parameters
    const url = new URL(req.url)
    const filters: PendingFilters = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20'),
      city: url.searchParams.get('city') || undefined,
      plate: url.searchParams.get('plate') || undefined,
      submitted_after: url.searchParams.get('submitted_after') || undefined,
      submitted_before: url.searchParams.get('submitted_before') || undefined,
      expiring_soon: url.searchParams.get('expiring_soon') === 'true'
    }

    console.log('Fetching pending couriers with filters:', filters)

    // Construir query
    let query = supabase
      .from('couriers')
      .select(`
        *,
        courier_documents!inner(type, verified, created_at)
      `)
      .eq('status', 'UNDER_REVIEW')

    // Aplicar filtros
    if (filters.city) {
      query = query.ilike('address_json->>city', `%${filters.city}%`)
    }

    if (filters.plate) {
      query = query.ilike('plate', `%${filters.plate}%`)
    }

    if (filters.submitted_after) {
      query = query.gte('submitted_at', filters.submitted_after)
    }

    if (filters.submitted_before) {
      query = query.lte('submitted_at', filters.submitted_before)
    }

    if (filters.expiring_soon) {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      const dateStr = thirtyDaysFromNow.toISOString().split('T')[0]
      
      query = query.or(`cnh_valid_until.lte.${dateStr},crlv_valid_until.lte.${dateStr}`)
    }

    // Aplicar paginação
    const offset = (filters.page! - 1) * filters.limit!
    query = query.range(offset, offset + filters.limit! - 1)

    // Ordenar por data de submissão (mais recentes primeiro)
    query = query.order('submitted_at', { ascending: false })

    const { data: couriers, error: couriersError } = await query

    if (couriersError) {
      console.error('Error fetching pending couriers:', couriersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending couriers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar contagem total para paginação
    let countQuery = supabase
      .from('couriers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'UNDER_REVIEW')

    if (filters.city) {
      countQuery = countQuery.ilike('address_json->>city', `%${filters.city}%`)
    }

    if (filters.plate) {
      countQuery = countQuery.ilike('plate', `%${filters.plate}%`)
    }

    if (filters.submitted_after) {
      countQuery = countQuery.gte('submitted_at', filters.submitted_after)
    }

    if (filters.submitted_before) {
      countQuery = countQuery.lte('submitted_at', filters.submitted_before)
    }

    if (filters.expiring_soon) {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      const dateStr = thirtyDaysFromNow.toISOString().split('T')[0]
      
      countQuery = countQuery.or(`cnh_valid_until.lte.${dateStr},crlv_valid_until.lte.${dateStr}`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting count:', countError)
    }

    // Processar dados dos couriers
    const processedCouriers = couriers?.map(courier => {
      const docs = courier.courier_documents || []
      const documentTypes = docs.map((doc: any) => doc.type)
      const verifiedDocs = docs.filter((doc: any) => doc.verified).length
      const totalDocs = docs.length

      // Verificar se documentos estão expirando
      const today = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(today.getDate() + 30)

      const cnhExpiring = courier.cnh_valid_until && new Date(courier.cnh_valid_until) <= thirtyDaysFromNow
      const crlvExpiring = courier.crlv_valid_until && new Date(courier.crlv_valid_until) <= thirtyDaysFromNow

      return {
        ...courier,
        document_types: documentTypes,
        verified_documents: verifiedDocs,
        total_documents: totalDocs,
        completion_percentage: totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0,
        cnh_expiring_soon: cnhExpiring,
        crlv_expiring_soon: crlvExpiring,
        days_waiting: courier.submitted_at 
          ? Math.floor((today.getTime() - new Date(courier.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }
    })

    const totalPages = Math.ceil((count || 0) / filters.limit!)

    console.log(`Found ${couriers?.length || 0} pending couriers`)

    return new Response(
      JSON.stringify({
        success: true,
        data: processedCouriers,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: count || 0,
          total_pages: totalPages,
          has_next: filters.page! < totalPages,
          has_prev: filters.page! > 1
        },
        filters: filters
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in courier admin pending:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})