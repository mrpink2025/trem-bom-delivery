import React from 'react';
import { Zap, Play, RotateCcw, TrendingUp, Clock, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

export const PerformanceMonitorDashboard: React.FC = () => {
  const { 
    isMonitoring, 
    metrics, 
    queryLog, 
    runBenchmark, 
    clearMetrics,
    getPerformanceRecommendations 
  } = usePerformanceMonitor();

  const getPerformanceColor = (time: number) => {
    if (time < 100) return 'text-green-600';
    if (time < 300) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (time: number) => {
    if (time < 100) return { variant: 'default' as const, text: 'Rápido' };
    if (time < 300) return { variant: 'secondary' as const, text: 'Médio' };
    return { variant: 'destructive' as const, text: 'Lento' };
  };

  const recommendations = getPerformanceRecommendations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Monitor de Performance</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {queryLog.length > 0 && (
            <Button
              variant="outline"
              onClick={clearMetrics}
              disabled={isMonitoring}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
          <Button
            onClick={runBenchmark}
            disabled={isMonitoring}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isMonitoring ? 'Executando...' : 'Executar Benchmark'}
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.averageQueryTime)}`}>
              {metrics.averageQueryTime.toFixed(2)}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total de Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQueries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Queries/Segundo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.queriesPerSecond.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.averageQueryTime < 300 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">Bom</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-yellow-600 font-medium">Atenção</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isMonitoring && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Executando Benchmark...</span>
                <span>Aguarde</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slowest Queries */}
      {metrics.slowestQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Queries Mais Lentas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.slowestQueries.map((query, index) => {
                const badge = getPerformanceBadge(query.executionTime);
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{query.query}</span>
                        <Badge variant={badge.variant}>{badge.text}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tabela: {query.table} • Operação: {query.operation}
                        {query.rowsAffected && ` • ${query.rowsAffected} registros`}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${getPerformanceColor(query.executionTime)}`}>
                      {query.executionTime}ms
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Statistics */}
      {Object.keys(metrics.tableStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas por Tabela</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.tableStats).map(([table, stats]) => (
                <div key={table} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium capitalize">{table}</h4>
                    <div className="text-sm text-muted-foreground">
                      {stats.count} queries executadas
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`font-bold ${getPerformanceColor(stats.avgTime)}`}>
                      Média: {stats.avgTime.toFixed(2)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Mais lenta: {stats.slowest}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3">
                {recommendation.includes('Performance está') ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                )}
                <div>
                  <p className="text-sm">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Query Log */}
      {queryLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Log de Queries Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {queryLog.slice(-20).reverse().map((query, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{query.query}</span>
                      <span className="text-muted-foreground">
                        {query.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <span className={getPerformanceColor(query.executionTime)}>
                      {query.executionTime}ms
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};