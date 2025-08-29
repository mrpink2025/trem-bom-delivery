import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Battery, 
  Wifi, 
  Zap, 
  Settings,
  Eye,
  EyeOff,
  Gauge,
  Signal
} from 'lucide-react';

interface MobileMetrics {
  isOnline: boolean;
  connectionType: string;
  batteryLevel: number;
  deviceMemory: number;
  viewportWidth: number;
  viewportHeight: number;
  isLowPowerMode: boolean;
  reducedMotion: boolean;
}

interface OptimizationSettings {
  adaptiveQuality: boolean;
  batterySaver: boolean;
  reducedAnimations: boolean;
  compressImages: boolean;
  prefetchDisabled: boolean;
}

export const MobileOptimization: React.FC = () => {
  const [metrics, setMetrics] = useState<MobileMetrics>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    batteryLevel: 1,
    deviceMemory: (navigator as any).deviceMemory || 4,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    isLowPowerMode: false,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  });

  const [settings, setSettings] = useState<OptimizationSettings>({
    adaptiveQuality: true,
    batterySaver: false,
    reducedAnimations: false,
    compressImages: true,
    prefetchDisabled: false
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  // Monitor device metrics
  const updateMetrics = useCallback(async () => {
    try {
      // Battery API
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        setMetrics(prev => ({
          ...prev,
          batteryLevel: battery.level,
          isLowPowerMode: battery.level < 0.2
        }));
      }

      // Network Information API
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setMetrics(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown'
        }));
      }

      // Viewport
      setMetrics(prev => ({
        ...prev,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        isOnline: navigator.onLine
      }));

    } catch (error) {
      console.warn('Failed to update mobile metrics:', error);
    }
  }, []);

  // Auto-optimization based on device state
  const autoOptimize = useCallback(() => {
    if (!settings.adaptiveQuality) return;

    const shouldOptimize = 
      metrics.batteryLevel < 0.3 || 
      metrics.connectionType === 'slow-2g' ||
      metrics.connectionType === '2g' ||
      metrics.deviceMemory < 2;

    if (shouldOptimize && !isOptimizing) {
      setIsOptimizing(true);
      setSettings(prev => ({
        ...prev,
        batterySaver: true,
        reducedAnimations: true,
        compressImages: true,
        prefetchDisabled: true
      }));
    } else if (!shouldOptimize && isOptimizing) {
      setIsOptimizing(false);
      setSettings(prev => ({
        ...prev,
        batterySaver: false,
        reducedAnimations: metrics.reducedMotion,
        prefetchDisabled: false
      }));
    }
  }, [metrics, settings.adaptiveQuality, isOptimizing]);

  // Apply optimizations to DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Reduced animations
    if (settings.reducedAnimations || metrics.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.1s');
      root.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--animation-duration');
      root.classList.remove('reduce-motion');
    }

    // Battery saver mode
    if (settings.batterySaver) {
      root.classList.add('battery-saver');
      // Reduce refresh rates, disable non-essential features
    } else {
      root.classList.remove('battery-saver');
    }

    // Low power mode styling
    if (metrics.isLowPowerMode) {
      root.classList.add('low-power');
    } else {
      root.classList.remove('low-power');
    }

  }, [settings, metrics.reducedMotion, metrics.isLowPowerMode]);

  // Setup event listeners
  useEffect(() => {
    const handleOnline = () => setMetrics(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setMetrics(prev => ({ ...prev, isOnline: false }));
    const handleResize = () => setMetrics(prev => ({
      ...prev,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', handleResize);

    // Initial update and periodic monitoring
    updateMetrics();
    const interval = setInterval(updateMetrics, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [updateMetrics]);

  // Auto-optimization effect
  useEffect(() => {
    autoOptimize();
  }, [autoOptimize]);

  const getConnectionBadge = () => {
    if (!metrics.isOnline) {
      return { variant: 'destructive' as const, text: 'Desconectado' };
    }
    
    switch (metrics.connectionType) {
      case '4g':
        return { variant: 'default' as const, text: '4G' };
      case '3g':
        return { variant: 'secondary' as const, text: '3G' };
      case '2g':
      case 'slow-2g':
        return { variant: 'destructive' as const, text: '2G' };
      default:
        return { variant: 'outline' as const, text: 'WiFi' };
    }
  };

  const getBatteryColor = () => {
    if (metrics.batteryLevel > 0.5) return 'text-green-600';
    if (metrics.batteryLevel > 0.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const connectionBadge = getConnectionBadge();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6" />
            Otimização Mobile
          </h2>
          <p className="text-muted-foreground">
            Adaptação automática para dispositivos móveis
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettings(prev => ({ 
            ...prev, 
            adaptiveQuality: !prev.adaptiveQuality 
          }))}
        >
          {settings.adaptiveQuality ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
          {settings.adaptiveQuality ? 'Automático' : 'Manual'}
        </Button>
      </div>

      {/* Device Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bateria</p>
                <div className="flex items-center gap-2 mt-1">
                  <Battery className={`w-4 h-4 ${getBatteryColor()}`} />
                  <span className={`text-xl font-bold ${getBatteryColor()}`}>
                    {Math.round(metrics.batteryLevel * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conexão</p>
                <div className="flex items-center gap-2 mt-1">
                  {metrics.isOnline ? <Wifi className="w-4 h-4" /> : <Signal className="w-4 h-4" />}
                  <Badge variant={connectionBadge.variant}>{connectionBadge.text}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Memória</p>
                <p className="text-2xl font-bold">{metrics.deviceMemory}GB</p>
              </div>
              <Gauge className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Viewport</p>
                <p className="text-lg font-bold">
                  {metrics.viewportWidth}×{metrics.viewportHeight}
                </p>
              </div>
              <Smartphone className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Status */}
      {isOptimizing && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">Modo de Economia Ativo</h3>
                <p className="text-sm text-yellow-700">
                  Otimizações automáticas aplicadas devido às condições do dispositivo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Otimização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Qualidade Adaptativa</label>
                <p className="text-xs text-muted-foreground">
                  Ajusta automaticamente baseado no dispositivo
                </p>
              </div>
              <Switch
                checked={settings.adaptiveQuality}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, adaptiveQuality: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Modo Economia</label>
                <p className="text-xs text-muted-foreground">
                  Reduz consumo de bateria
                </p>
              </div>
              <Switch
                checked={settings.batterySaver}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, batterySaver: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Animações Reduzidas</label>
                <p className="text-xs text-muted-foreground">
                  Menos movimento na interface
                </p>
              </div>
              <Switch
                checked={settings.reducedAnimations}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, reducedAnimations: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Compressão de Imagens</label>
                <p className="text-xs text-muted-foreground">
                  Reduz qualidade para economizar dados
                </p>
              </div>
              <Switch
                checked={settings.compressImages}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, compressImages: checked }))
                }
              />
            </div>
          </div>

          {/* Battery Level Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Nível da Bateria</span>
              <span>{Math.round(metrics.batteryLevel * 100)}%</span>
            </div>
            <Progress value={metrics.batteryLevel * 100} className="h-2" />
            {metrics.isLowPowerMode && (
              <p className="text-xs text-red-600">
                ⚠️ Dispositivo em modo de baixa energia
              </p>
            )}
          </div>

          {/* Performance Tips */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">💡 Dicas de Performance</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {metrics.batteryLevel < 0.3 && (
                <li>• Considere carregar o dispositivo para melhor performance</li>
              )}
              {metrics.connectionType === '2g' && (
                <li>• Conexão lenta detectada - otimizações aplicadas automaticamente</li>
              )}
              {metrics.deviceMemory < 4 && (
                <li>• Memória limitada - considere fechar outras abas ou apps</li>
              )}
              {metrics.reducedMotion && (
                <li>• Preferência por movimento reduzido detectada</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};