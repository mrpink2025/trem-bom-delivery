import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QueryPerformance {
  query: string;
  table: string;
  operation: string;
  executionTime: number;
  timestamp: Date;
  rowsAffected?: number;
}

interface PerformanceMetrics {
  averageQueryTime: number;
  slowestQueries: QueryPerformance[];
  totalQueries: number;
  queriesPerSecond: number;
  tableStats: Record<string, {
    count: number;
    avgTime: number;
    slowest: number;
  }>;
}

export const usePerformanceMonitor = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageQueryTime: 0,
    slowestQueries: [],
    totalQueries: 0,
    queriesPerSecond: 0,
    tableStats: {}
  });
  const [queryLog, setQueryLog] = useState<QueryPerformance[]>([]);
  const { toast } = useToast();

  // Benchmark queries for different tables
  const benchmarkQueries = [
    { name: 'profiles_select', query: () => supabase.from('profiles').select('*').limit(10) },
    { name: 'restaurants_select', query: () => supabase.from('restaurants').select('*').limit(10) },
    { name: 'orders_select', query: () => supabase.from('orders').select('*').limit(10) },
    { name: 'menu_items_select', query: () => supabase.from('menu_items').select('*').limit(10) },
    { name: 'reviews_select', query: () => supabase.from('reviews').select('*').limit(10) },
    { name: 'notifications_select', query: () => supabase.from('notifications').select('*').limit(10) },
    { name: 'cart_items_select', query: () => supabase.from('cart_items').select('*').limit(10) },
    
    // Complex joins
    { 
      name: 'orders_with_restaurant', 
      query: () => supabase
        .from('orders')
        .select(`
          *,
          restaurants (
            name,
            image_url,
            cuisine_type
          )
        `)
        .limit(5)
    },
    {
      name: 'menu_items_with_restaurant',
      query: () => supabase
        .from('menu_items')
        .select(`
          *,
          restaurants (
            name,
            cuisine_type
          )
        `)
        .limit(10)
    },
    {
      name: 'reviews_with_profiles',
      query: () => supabase
        .from('reviews')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .limit(10)
    }
  ];

  const executeQuery = async (queryName: string, queryFn: () => any): Promise<QueryPerformance> => {
    const startTime = Date.now();
    
    try {
      const { data, error, count } = await queryFn();
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      if (error) {
        throw error;
      }

      const performance: QueryPerformance = {
        query: queryName,
        table: queryName.split('_')[0],
        operation: 'SELECT',
        executionTime,
        timestamp: new Date(),
        rowsAffected: Array.isArray(data) ? data.length : count || 0
      };

      return performance;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        query: queryName + ' (ERROR)',
        table: queryName.split('_')[0],
        operation: 'SELECT',
        executionTime,
        timestamp: new Date(),
        rowsAffected: 0
      };
    }
  };

  const runBenchmark = async () => {
    setIsMonitoring(true);
    const results: QueryPerformance[] = [];
    
    try {
      // Run each benchmark query
      for (const benchmark of benchmarkQueries) {
        const result = await executeQuery(benchmark.name, benchmark.query);
        results.push(result);
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update query log
      setQueryLog(prev => [...prev, ...results].slice(-100)); // Keep last 100 queries

      // Calculate metrics
      const totalTime = results.reduce((sum, q) => sum + q.executionTime, 0);
      const averageTime = results.length > 0 ? totalTime / results.length : 0;
      const sortedByTime = [...results].sort((a, b) => b.executionTime - a.executionTime);

      // Table statistics
      const tableStats: Record<string, { count: number; avgTime: number; slowest: number }> = {};
      results.forEach(query => {
        if (!tableStats[query.table]) {
          tableStats[query.table] = { count: 0, avgTime: 0, slowest: 0 };
        }
        const stats = tableStats[query.table];
        stats.count++;
        stats.avgTime = (stats.avgTime * (stats.count - 1) + query.executionTime) / stats.count;
        stats.slowest = Math.max(stats.slowest, query.executionTime);
      });

      setMetrics({
        averageQueryTime: averageTime,
        slowestQueries: sortedByTime.slice(0, 5),
        totalQueries: results.length,
        queriesPerSecond: results.length / (totalTime / 1000),
        tableStats
      });

      toast({
        title: "Benchmark Concluído",
        description: `${results.length} queries executadas. Tempo médio: ${averageTime.toFixed(2)}ms`,
      });

    } catch (error) {
      toast({
        title: "Erro no Benchmark",
        description: "Falha ao executar benchmark de performance",
        variant: "destructive"
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  const clearMetrics = () => {
    setQueryLog([]);
    setMetrics({
      averageQueryTime: 0,
      slowestQueries: [],
      totalQueries: 0,
      queriesPerSecond: 0,
      tableStats: {}
    });
  };

  // Performance recommendations based on metrics
  const getPerformanceRecommendations = (): string[] => {
    const recommendations: string[] = [];

    if (metrics.averageQueryTime > 500) {
      recommendations.push("Tempo médio de query alto (>500ms). Considere otimizar queries ou adicionar índices.");
    }

    Object.entries(metrics.tableStats).forEach(([table, stats]) => {
      if (stats.avgTime > 1000) {
        recommendations.push(`Tabela '${table}' com performance lenta. Verifique índices e RLS policies.`);
      }
    });

    if (metrics.queriesPerSecond < 10) {
      recommendations.push("Throughput baixo. Considere otimização de banco de dados.");
    }

    const slowQueries = metrics.slowestQueries.filter(q => q.executionTime > 1000);
    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} queries muito lentas detectadas (>1000ms).`);
    }

    if (recommendations.length === 0) {
      recommendations.push("Performance está dentro dos parâmetros normais!");
    }

    return recommendations;
  };

  return {
    isMonitoring,
    metrics,
    queryLog,
    runBenchmark,
    clearMetrics,
    getPerformanceRecommendations
  };
};