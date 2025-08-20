import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Zap, 
  Activity, 
  Database, 
  Globe, 
  Smartphone,
  MonitorSpeaker,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  threshold: {
    excellent: number;
    good: number;
    poor: number;
  };
  recommendations?: string[];
}

interface ComponentPerformance {
  component: string;
  renderCount: number;
  avgRenderTime: number;
  memoryUsage: number;
  isOptimized: boolean;
  suggestions: string[];
}

const PerformanceOptimizer = React.memo(() => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [componentStats, setComponentStats] = useState<ComponentPerformance[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const { toast } = useToast();

  // Performance monitoring hook
  const measurePerformance = useCallback(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      // Core Web Vitals
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      lcp: 0, // Would need to implement LCP observer
      cls: 0, // Would need to implement CLS observer
      fid: 0, // Would need to implement FID observer
      
      // Network metrics
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      request: navigation.responseStart - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      domLoad: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      windowLoad: navigation.loadEventEnd - navigation.loadEventStart,
      
      // Memory (if available)
      memory: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }, []);

  const analyzeComponents = useCallback(() => {
    // Simulate component analysis (in real app, would use React DevTools data)
    const mockComponents: ComponentPerformance[] = [
      {
        component: 'AdminDashboard',
        renderCount: 12,
        avgRenderTime: 45,
        memoryUsage: 2.3,
        isOptimized: false,
        suggestions: [
          'Usar React.memo para evitar re-renders desnecessários',
          'Implementar useMemo para cálculos pesados',
          'Considerar lazy loading para componentes não visíveis'
        ]
      },
      {
        component: 'RestaurantCard',
        renderCount: 156,
        avgRenderTime: 8,
        memoryUsage: 0.5,
        isOptimized: true,
        suggestions: []
      },
      {
        component: 'OrdersList',
        renderCount: 34,
        avgRenderTime: 23,
        memoryUsage: 1.8,
        isOptimized: false,
        suggestions: [
          'Implementar virtualização para listas grandes',
          'Usar useCallback para event handlers',
          'Otimizar queries com pagination'
        ]
      },
      {
        component: 'NotificationCenter',
        renderCount: 89,
        avgRenderTime: 12,
        memoryUsage: 0.8,
        isOptimized: true,
        suggestions: []
      }
    ];

    return mockComponents;
  }, []);

  const runPerformanceAnalysis = useCallback(async () => {
    try {
      setAnalyzing(true);
      
      // Measure current performance
      const perfData = measurePerformance();
      const components = analyzeComponents();
      
      // Generate performance metrics
      const performanceMetrics: PerformanceMetric[] = [
        {
          name: 'First Contentful Paint',
          value: perfData.fcp,
          unit: 'ms',
          status: perfData.fcp < 1800 ? 'excellent' : perfData.fcp < 3000 ? 'good' : 'needs_improvement',
          threshold: { excellent: 1800, good: 3000, poor: 4000 },
          recommendations: perfData.fcp > 3000 ? [
            'Otimizar carregamento de recursos críticos',
            'Implementar code splitting',
            'Usar service workers para cache'
          ] : []
        },
        {
          name: 'DOM Content Loaded',
          value: perfData.domLoad,
          unit: 'ms',
          status: perfData.domLoad < 2000 ? 'excellent' : perfData.domLoad < 4000 ? 'good' : 'needs_improvement',
          threshold: { excellent: 2000, good: 4000, poor: 6000 },
          recommendations: perfData.domLoad > 4000 ? [
            'Reduzir JavaScript blocking',
            'Otimizar CSS crítico',
            'Implementar lazy loading'
          ] : []
        },
        {
          name: 'DNS Lookup',
          value: perfData.dns,
          unit: 'ms',
          status: perfData.dns < 20 ? 'excellent' : perfData.dns < 50 ? 'good' : 'needs_improvement',
          threshold: { excellent: 20, good: 50, poor: 100 },
          recommendations: perfData.dns > 50 ? [
            'Usar DNS prefetch',
            'Considerar CDN para static assets',
            'Otimizar DNS provider'
          ] : []
        },
        {
          name: 'Server Response',
          value: perfData.response,
          unit: 'ms',
          status: perfData.response < 200 ? 'excellent' : perfData.response < 500 ? 'good' : 'needs_improvement',
          threshold: { excellent: 200, good: 500, poor: 1000 },
          recommendations: perfData.response > 500 ? [
            'Otimizar queries do banco de dados',
            'Implementar cache no servidor',
            'Usar CDN para conteúdo estático'
          ] : []
        }
      ];

      if (perfData.memory) {
        const memoryUsagePercent = (perfData.memory.used / perfData.memory.limit) * 100;
        performanceMetrics.push({
          name: 'Uso de Memória',
          value: memoryUsagePercent,
          unit: '%',
          status: memoryUsagePercent < 30 ? 'excellent' : memoryUsagePercent < 60 ? 'good' : 'needs_improvement',
          threshold: { excellent: 30, good: 60, poor: 80 },
          recommendations: memoryUsagePercent > 60 ? [
            'Identificar vazamentos de memória',
            'Otimizar estruturas de dados',
            'Implementar garbage collection manual'
          ] : []
        });
      }

      setMetrics(performanceMetrics);
      setComponentStats(components);

      // Calculate overall score
      const scores = performanceMetrics.map(metric => {
        switch (metric.status) {
          case 'excellent': return 100;
          case 'good': return 75;
          case 'needs_improvement': return 50;
          case 'poor': return 25;
          default: return 0;
        }
      });
      
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      setOverallScore(avgScore);

      toast({
        title: "Análise de performance concluída",
        description: `Score geral: ${avgScore.toFixed(0)}/100`,
      });

    } catch (error) {
      console.error('Error analyzing performance:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível completar a análise de performance.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  }, [measurePerformance, analyzeComponents, toast]);

  const getStatusColor = useCallback((status: PerformanceMetric['status']) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'needs_improvement':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  const getStatusIcon = useCallback((status: PerformanceMetric['status']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'good':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'needs_improvement':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'poor':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  }, []);

  const getScoreColor = useCallback((score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  useEffect(() => {
    const initializeAnalysis = async () => {
      setLoading(true);
      // Small delay to allow page to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      await runPerformanceAnalysis();
      setLoading(false);
    };

    initializeAnalysis();
  }, [runPerformanceAnalysis]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <Gauge className="w-6 h-6 text-primary" />
            <span>Otimizador de Performance</span>
          </h2>
          <p className="text-muted-foreground">
            Monitore e otimize a performance da aplicação em tempo real
          </p>
        </div>
        <Button onClick={runPerformanceAnalysis} disabled={analyzing || loading}>
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-2" />
              Nova Análise
            </>
          )}
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Score Geral de Performance</h3>
              <div className="flex items-center space-x-4">
                <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore.toFixed(0)}
                </div>
                <div>
                  <Progress value={overallScore} className="w-32 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {overallScore >= 90 ? 'Excelente' : 
                     overallScore >= 70 ? 'Bom' : 
                     overallScore >= 50 ? 'Precisa melhorar' : 'Crítico'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Web Vitals</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Última análise: {new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="components">Componentes</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <Card key={index} className={`border-2 ${getStatusColor(metric.status)}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{metric.name}</h3>
                    {getStatusIcon(metric.status)}
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {metric.value.toFixed(0)} {metric.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Excelente: &lt; {metric.threshold.excellent}{metric.unit} | 
                      Bom: &lt; {metric.threshold.good}{metric.unit}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {metric.status === 'excellent' ? 'Excelente' :
                       metric.status === 'good' ? 'Bom' :
                       metric.status === 'needs_improvement' ? 'Precisa melhorar' : 'Crítico'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <div className="space-y-4">
            {componentStats.map((component, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{component.component}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {component.isOptimized ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Otimizado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-200 text-yellow-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Precisa otimizar
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{component.renderCount}</div>
                      <div className="text-xs text-muted-foreground">Renders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{component.avgRenderTime}ms</div>
                      <div className="text-xs text-muted-foreground">Tempo médio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{component.memoryUsage}MB</div>
                      <div className="text-xs text-muted-foreground">Memória</div>
                    </div>
                  </div>
                  
                  {component.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Sugestões de Otimização:</h4>
                      <ul className="space-y-1">
                        {component.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start space-x-2">
                            <TrendingUp className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {metrics
              .filter(metric => metric.recommendations && metric.recommendations.length > 0)
              .map((metric, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{metric.name} - Precisa Atenção</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ul className="space-y-1">
                      {metric.recommendations?.map((rec, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ))
            }
            
            {metrics.every(metric => !metric.recommendations || metric.recommendations.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Performance Excelente!</h3>
                  <p className="text-muted-foreground">
                    Todas as métricas estão dentro dos padrões recomendados. 
                    Continue monitorando regularmente para manter a qualidade.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

PerformanceOptimizer.displayName = 'PerformanceOptimizer';

export default PerformanceOptimizer;