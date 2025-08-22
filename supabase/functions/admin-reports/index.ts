import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface ReportsQuery {
  from?: string
  to?: string
  store_id?: string
  merchant_id?: string
  report_type?: 'kpi' | 'orders' | 'revenue' | 'performance'
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

    if (!adminUser || !['SUPERADMIN', 'ADMIN', 'AUDITOR'].includes(adminUser.role)) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const query: ReportsQuery = {
        from: url.searchParams.get('from') || undefined,
        to: url.searchParams.get('to') || undefined,
        store_id: url.searchParams.get('store_id') || undefined,
        merchant_id: url.searchParams.get('merchant_id') || undefined,
        report_type: url.searchParams.get('report_type') as any || 'kpi'
      }

      const fromDate = query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const toDate = query.to || new Date().toISOString()

      let reportData = {}

      if (query.report_type === 'kpi' || !query.report_type) {
        // KPIs principais
        const [
          ordersResult,
          revenueResult,
          activeStoresResult,
          activeCouriersResult,
          cancelRateResult
        ] = await Promise.all([
          // Total de pedidos
          supabase
            .from('orders')
            .select('id, total_amount, status', { count: 'exact' })
            .gte('created_at', fromDate)
            .lte('created_at', toDate),

          // Receita total
          supabase
            .from('orders')
            .select('total_amount')
            .eq('status', 'DELIVERED')
            .gte('created_at', fromDate)
            .lte('created_at', toDate),

          // Lojas ativas
          supabase
            .from('restaurants')
            .select('id', { count: 'exact' })
            .eq('is_active', true),

          // Couriers ativos
          supabase
            .from('courier_presence')
            .select('courier_id', { count: 'exact' })
            .eq('is_online', true),

          // Taxa de cancelamento
          supabase
            .from('orders')
            .select('status')
            .in('status', ['CANCELLED', 'DELIVERED', 'COMPLETED'])
            .gte('created_at', fromDate)
            .lte('created_at', toDate)
        ])

        const totalOrders = ordersResult.count || 0
        const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
        const activeStores = activeStoresResult.count || 0
        const activeCouriers = activeCouriersResult.count || 0
        
        const cancelledOrders = cancelRateResult.data?.filter(o => o.status === 'CANCELLED').length || 0
        const completedOrders = cancelRateResult.data?.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length || 0
        const cancelRate = completedOrders > 0 ? (cancelledOrders / (cancelledOrders + completedOrders)) * 100 : 0

        // Calcular ticket médio
        const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

        // Calcular take rate efetivo (assumindo 15% como padrão)
        const platformRevenue = totalRevenue * 0.15
        const takeRate = totalRevenue > 0 ? (platformRevenue / totalRevenue) * 100 : 0

        reportData = {
          kpis: {
            total_orders: totalOrders,
            total_revenue: totalRevenue,
            average_ticket: averageTicket,
            take_rate: takeRate,
            platform_revenue: platformRevenue,
            active_stores: activeStores,
            active_couriers: activeCouriers,
            cancel_rate: cancelRate
          },
          period: {
            from: fromDate,
            to: toDate
          }
        }
      }

      if (query.report_type === 'orders') {
        // Relatório detalhado de pedidos
        let ordersQuery = supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            status,
            created_at,
            restaurant_id,
            user_id,
            restaurants(name),
            profiles(full_name)
          `)
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('created_at', { ascending: false })

        if (query.store_id) {
          ordersQuery = ordersQuery.eq('restaurant_id', query.store_id)
        }

        const { data: orders, error: ordersError } = await ordersQuery.limit(1000)

        if (ordersError) {
          throw ordersError
        }

        reportData = {
          orders,
          total_count: orders?.length || 0,
          period: {
            from: fromDate,
            to: toDate
          }
        }
      }

      if (query.report_type === 'performance') {
        // Relatório de performance (SLA, tempos)
        const { data: performanceData, error: perfError } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            created_at,
            updated_at,
            restaurant_id,
            restaurants(name)
          `)
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('created_at', { ascending: false })

        if (perfError) {
          throw perfError
        }

        // Calcular métricas de SLA
        const avgPreparationTime = performanceData?.map(order => {
          const created = new Date(order.created_at)
          const updated = new Date(order.updated_at)
          return (updated.getTime() - created.getTime()) / (1000 * 60) // minutos
        }).reduce((sum, time) => sum + time, 0) / (performanceData?.length || 1)

        reportData = {
          performance_metrics: {
            avg_preparation_time: avgPreparationTime,
            total_orders_analyzed: performanceData?.length || 0,
            sla_compliance: 85, // Placeholder - seria calculado baseado em SLA definido
          },
          period: {
            from: fromDate,
            to: toDate
          }
        }
      }

      // Registrar ação administrativa
      await supabase.from('admin_actions_log').insert({
        actor_admin_id: user.id,
        action: 'VIEW_REPORTS',
        target_table: 'orders',
        reason: `Generated ${query.report_type} report`,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

      return new Response(JSON.stringify(reportData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-reports function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})