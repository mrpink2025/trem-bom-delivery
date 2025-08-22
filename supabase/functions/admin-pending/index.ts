import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    db: { schema: 'public' }
  }
)

interface PendingFilters {
  q?: string // Search query
  kind?: 'merchant' | 'courier' | 'all'
  city?: string
  state?: string
  page?: number
  pageSize?: number
  expiring_soon?: boolean // Documentos vencendo em 30 dias
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse query parameters
    const url = new URL(req.url)
    const filters: PendingFilters = {
      q: url.searchParams.get('q') || undefined,
      kind: (url.searchParams.get('kind') as any) || 'all',
      city: url.searchParams.get('city') || undefined,
      state: url.searchParams.get('state') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '20'),
      expiring_soon: url.searchParams.get('expiring_soon') === 'true'
    }

    const offset = (filters.page! - 1) * filters.pageSize!

    let merchants: any[] = []
    let couriers: any[] = []
    let totalMerchants = 0
    let totalCouriers = 0

    // Buscar merchants pendentes
    if (filters.kind === 'all' || filters.kind === 'merchant') {
      let merchantQuery = supabase
        .from('merchants')
        .select(`
          id,
          legal_name,
          trade_name,
          cnpj,
          phone,
          email,
          address_json,
          status,
          submitted_at,
          rejection_reason,
          created_at
        `)
        .eq('status', 'UNDER_REVIEW')

      // Aplicar filtros
      if (filters.q) {
        merchantQuery = merchantQuery.or(`trade_name.ilike.%${filters.q}%,legal_name.ilike.%${filters.q}%,cnpj.ilike.%${filters.q}%,email.ilike.%${filters.q}%`)
      }

      if (filters.city) {
        merchantQuery = merchantQuery.contains('address_json', { city: filters.city })
      }

      if (filters.state) {
        merchantQuery = merchantQuery.contains('address_json', { state: filters.state })
      }

      const { data: merchantsData, count: merchantsCount } = await merchantQuery
        .range(offset, offset + filters.pageSize! - 1)
        .order('submitted_at', { ascending: false })

      merchants = merchantsData || []
      totalMerchants = merchantsCount || 0

      // Buscar documentos para cada merchant
      for (const merchant of merchants) {
        const { data: docs } = await supabase
          .from('merchant_documents')
          .select('type, verified, created_at')
          .eq('merchant_id', merchant.id)

        const { data: storeUnits, count: storeUnitsCount } = await supabase
          .from('store_units')
          .select('id', { count: 'exact' })
          .eq('merchant_id', merchant.id)

        // Documentos obrigatórios
        const requiredDocs = ['CNPJ', 'CONTRATO_SOCIAL', 'ALVARA', 'VISA_SANITARIA', 'ENDERECO', 'LOGO']
        const existingDocTypes = docs?.map(doc => doc.type) || []
        const missingDocs = requiredDocs.filter(doc => !existingDocTypes.includes(doc))
        const completionPercentage = Math.round(((requiredDocs.length - missingDocs.length) / requiredDocs.length) * 100)

        merchant.documents = docs || []
        merchant.missing_documents = missingDocs
        merchant.completion_percentage = completionPercentage
        merchant.store_units_count = storeUnitsCount || 0
        merchant.days_waiting = Math.ceil((new Date().getTime() - new Date(merchant.submitted_at).getTime()) / (1000 * 60 * 60 * 24))

        // Gerar signed URLs para documentos
        merchant.document_urls = {}
        for (const doc of docs || []) {
          if (doc.type) {
            try {
              const { data: signedUrl } = await supabase.storage
                .from('merchant-docs')
                .createSignedUrl(`${merchant.id}/${doc.type}`, 300) // 5 minutos TTL

              if (signedUrl) {
                merchant.document_urls[doc.type] = signedUrl.signedUrl
              }
            } catch (error) {
              console.error(`Error generating signed URL for ${doc.type}:`, error)
            }
          }
        }
      }
    }

    // Buscar couriers pendentes  
    if (filters.kind === 'all' || filters.kind === 'courier') {
      let courierQuery = supabase
        .from('couriers')
        .select(`
          id,
          full_name,
          cpf,
          phone,
          birth_date,
          plate,
          vehicle_brand,
          vehicle_model,
          address_json,
          status,
          submitted_at,
          rejection_reason,
          cnh_valid_until,
          crlv_valid_until,
          created_at
        `)
        .eq('status', 'UNDER_REVIEW')

      // Aplicar filtros
      if (filters.q) {
        courierQuery = courierQuery.or(`full_name.ilike.%${filters.q}%,cpf.ilike.%${filters.q}%,plate.ilike.%${filters.q}%,phone.ilike.%${filters.q}%`)
      }

      if (filters.city) {
        courierQuery = courierQuery.contains('address_json', { city: filters.city })
      }

      if (filters.state) {
        courierQuery = courierQuery.contains('address_json', { state: filters.state })
      }

      // Filtro por documentos vencendo
      if (filters.expiring_soon) {
        const in30Days = new Date()
        in30Days.setDate(in30Days.getDate() + 30)
        courierQuery = courierQuery.or(`cnh_valid_until.lte.${in30Days.toISOString().split('T')[0]},crlv_valid_until.lte.${in30Days.toISOString().split('T')[0]}`)
      }

      const { data: couriersData, count: couriersCount } = await courierQuery
        .range(offset, offset + filters.pageSize! - 1)
        .order('submitted_at', { ascending: false })

      couriers = couriersData || []
      totalCouriers = couriersCount || 0

      // Buscar documentos para cada courier
      for (const courier of couriers) {
        const { data: docs } = await supabase
          .from('courier_documents')
          .select('type, verified, created_at')
          .eq('courier_id', courier.id)

        // Documentos obrigatórios
        const requiredDocs = ['CNH_FRENTE', 'SELFIE', 'CRLV', 'FOTO_VEICULO', 'FOTO_PLACA']
        const existingDocTypes = docs?.map(doc => doc.type) || []
        const missingDocs = requiredDocs.filter(doc => !existingDocTypes.includes(doc))
        const completionPercentage = Math.round(((requiredDocs.length - missingDocs.length) / requiredDocs.length) * 100)

        courier.documents = docs || []
        courier.missing_documents = missingDocs
        courier.completion_percentage = completionPercentage
        courier.days_waiting = Math.ceil((new Date().getTime() - new Date(courier.submitted_at).getTime()) / (1000 * 60 * 60 * 24))

        // Verificar documentos expirando
        const today = new Date()
        const in30Days = new Date()
        in30Days.setDate(today.getDate() + 30)

        courier.cnh_expiring_soon = courier.cnh_valid_until && new Date(courier.cnh_valid_until) <= in30Days
        courier.crlv_expiring_soon = courier.crlv_valid_until && new Date(courier.crlv_valid_until) <= in30Days
        courier.cnh_expired = courier.cnh_valid_until && new Date(courier.cnh_valid_until) <= today
        courier.crlv_expired = courier.crlv_valid_until && new Date(courier.crlv_valid_until) <= today

        // Gerar signed URLs para documentos
        courier.document_urls = {}
        for (const doc of docs || []) {
          if (doc.type) {
            try {
              const { data: signedUrl } = await supabase.storage
                .from('courier-docs')
                .createSignedUrl(`${courier.id}/${doc.type}`, 300) // 5 minutos TTL

              if (signedUrl) {
                courier.document_urls[doc.type] = signedUrl.signedUrl
              }
            } catch (error) {
              console.error(`Error generating signed URL for ${doc.type}:`, error)
            }
          }
        }
      }
    }

    // Combinar resultados
    const results = []
    if (filters.kind === 'all') {
      // Intercalar merchants e couriers por data de submissão
      const allItems = [
        ...merchants.map(m => ({ ...m, kind: 'merchant' })),
        ...couriers.map(c => ({ ...c, kind: 'courier' }))
      ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

      results.push(...allItems.slice(0, filters.pageSize))
    } else if (filters.kind === 'merchant') {
      results.push(...merchants.map(m => ({ ...m, kind: 'merchant' })))
    } else {
      results.push(...couriers.map(c => ({ ...c, kind: 'courier' })))
    }

    const totalCount = filters.kind === 'all' ? totalMerchants + totalCouriers : 
                      filters.kind === 'merchant' ? totalMerchants : totalCouriers

    return new Response(JSON.stringify({
      success: true,
      data: results,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / filters.pageSize!),
        hasNext: filters.page! * filters.pageSize! < totalCount,
        hasPrev: filters.page! > 1
      },
      filters: filters,
      summary: {
        total_pending: totalCount,
        merchants_pending: totalMerchants,
        couriers_pending: totalCouriers
      }
    }), {
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