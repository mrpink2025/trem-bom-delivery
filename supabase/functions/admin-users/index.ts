import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface UserQuery {
  q?: string
  role?: string
  status?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Autenticar o usuário
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

    // Verificar se o usuário tem permissão administrativa
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser || !['SUPERADMIN', 'ADMIN', 'SUPPORT', 'AUDITOR'].includes(adminUser.role)) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const query: UserQuery = {
        q: url.searchParams.get('q') || undefined,
        role: url.searchParams.get('role') || undefined,
        status: url.searchParams.get('status') || undefined,
        from: url.searchParams.get('from') || undefined,
        to: url.searchParams.get('to') || undefined,
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '20')
      }

      // Construir query para buscar usuários - simplified query for basic user listing
      let usersQuery = supabase
        .from('profiles')
        .select(`
          *
        `)

      // Aplicar filtros
      if (query.q) {
        usersQuery = usersQuery.or(`full_name.ilike.%${query.q}%,email.ilike.%${query.q}%,phone.ilike.%${query.q}%`)
      }

      if (query.role && query.role !== 'all') {
        usersQuery = usersQuery.eq('role', query.role)
      }

      if (query.from) {
        usersQuery = usersQuery.gte('created_at', query.from)
      }

      if (query.to) {
        usersQuery = usersQuery.lte('created_at', query.to)
      }

      // Paginação
      const offset = ((query.page || 1) - 1) * (query.limit || 20)
      usersQuery = usersQuery.range(offset, offset + (query.limit || 20) - 1)

      const { data: users, error: usersError } = await usersQuery.order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error fetching users:', usersError)
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Contar total para paginação
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Registrar ação administrativa - simplified logging
      console.log(`Admin action: User ${user.id} viewed users list`)

      return new Response(JSON.stringify({
        users: users || [],
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: count || 0
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
    console.error('Error in admin-users function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})