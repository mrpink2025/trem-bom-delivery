import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    db: { schema: 'public' }
  }
)

Deno.serve(async (req) => {
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

    if (req.method === 'GET') {
      // Buscar merchants pendentes
      const { data: merchants } = await supabase
        .from('merchants')
        .select('*')
        .in('status', ['DRAFT', 'UNDER_REVIEW'])
        .order('created_at', { ascending: false })
        .limit(20)

      // Buscar couriers pendentes  
      const { data: couriers } = await supabase
        .from('couriers')
        .select('*')
        .in('status', ['DRAFT', 'UNDER_REVIEW'])
        .order('created_at', { ascending: false })
        .limit(20)

      // Combinar resultados
      const results = [
        ...(merchants || []).map(m => ({ ...m, kind: 'merchant' })),
        ...(couriers || []).map(c => ({ ...c, kind: 'courier' }))
      ].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
      })

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
          merchants_pending: merchants?.length || 0,
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