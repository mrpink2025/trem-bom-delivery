import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action } = await req.json()

    switch (action) {
      case 'cleanup_audit_logs':
        // Limpar logs de auditoria antigos (mais de 90 dias)
        const { error: cleanupError } = await supabaseClient
          .from('audit_logs')
          .delete()
          .lt('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

        if (cleanupError) throw cleanupError

        return new Response(
          JSON.stringify({ message: 'Logs de auditoria limpos com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'optimize_database':
        // Executar operações de otimização do banco
        const optimizations = [
          'VACUUM ANALYZE public.orders;',
          'VACUUM ANALYZE public.restaurants;',
          'VACUUM ANALYZE public.menu_items;',
          'VACUUM ANALYZE public.profiles;',
          'REINDEX INDEX idx_orders_user_status;',
          'REINDEX INDEX idx_restaurants_active_rating;'
        ]

        for (const sql of optimizations) {
          const { error } = await supabaseClient.rpc('execute_sql', { sql_query: sql })
          if (error) console.error('Optimization error:', error)
        }

        return new Response(
          JSON.stringify({ message: 'Otimizações aplicadas com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'performance_stats':
        // Coletar estatísticas de performance
        const { data: dbStats } = await supabaseClient
          .rpc('get_system_stats')

        const { data: slowQueries } = await supabaseClient
          .from('pg_stat_statements')
          .select('query, mean_exec_time, calls')
          .order('mean_exec_time', { ascending: false })
          .limit(10)

        const performanceData = {
          system_stats: dbStats,
          slow_queries: slowQueries,
          timestamp: new Date().toISOString()
        }

        return new Response(
          JSON.stringify(performanceData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'cache_warm_up':
        // Aquecer caches com consultas comuns
        const warmUpQueries = [
          { table: 'restaurants', query: { is_active: true } },
          { table: 'menu_items', query: { is_available: true } },
          { table: 'categories', query: { is_active: true } }
        ]

        for (const { table, query } of warmUpQueries) {
          await supabaseClient.from(table).select('*').match(query).limit(100)
        }

        return new Response(
          JSON.stringify({ message: 'Cache aquecido com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Performance monitor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})