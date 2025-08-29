import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Timer, 
  Users, 
  Zap,
  Settings,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

interface ConnectionMetrics {
  isConnected: boolean;
  latency: number;
  reconnectAttempts: number;
  messagesReceived: number;
  messagesPerSecond: number;
  lastActivity: Date | null;
}

interface RealtimeConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  batchUpdates: boolean;
  throttleUpdates: boolean;
  updateInterval: number;
}

export const RealTimeOptimizer: React.FC = () => {
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    isConnected: false,
    latency: 0,
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesPerSecond: 0,
    lastActivity: null
  });

  const [config, setConfig] = useState<RealtimeConfig>({
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    batchUpdates: true,
    throttleUpdates: true,
    updateInterval: 1000
  });

  const [isOptimizationEnabled, setIsOptimizationEnabled] = useState(true);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const metricsRef = useRef<ConnectionMetrics>(metrics);
  const messageBuffer = useRef<any[]>([]);
  const lastProcessTime = useRef<number>(Date.now());
  const { toast } = useToast();

  // Update refs when state changes
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  // Optimized message processing with batching and throttling
  const processMessages = useCallback(() => {
    if (!config.batchUpdates || messageBuffer.current.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastProcess = now - lastProcessTime.current;

    if (config.throttleUpdates && timeSinceLastProcess < config.updateInterval) {
      return;
    }

    // Process batched messages
    const messages = messageBuffer.current.splice(0);
    lastProcessTime.current = now;

    // Group messages by type for efficient processing
    const groupedMessages = messages.reduce((acc, msg) => {
      const type = msg.type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(msg);
      return acc;
    }, {} as Record<string, any[]>);

    // Process each group
    Object.entries(groupedMessages).forEach(([type, msgs]) => {
      console.log(`Processing ${Array.isArray(msgs) ? msgs.length : 0} ${type} messages`);
      // Here you would dispatch to specific handlers
    });

    // Update metrics
    setMetrics(prev => ({
      ...prev,
      messagesReceived: prev.messagesReceived + messages.length,
      messagesPerSecond: messages.length / (timeSinceLastProcess / 1000),
      lastActivity: new Date()
    }));
  }, [config]);

  // Setup message processing interval
  useEffect(() => {
    if (!isOptimizationEnabled) return;

    const interval = setInterval(processMessages, config.updateInterval);
    return () => clearInterval(interval);
  }, [processMessages, config.updateInterval, isOptimizationEnabled]);

  // Connection monitoring
  const measureLatency = useCallback(async () => {
    const start = Date.now();
    try {
      await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;
      
      setMetrics(prev => ({
        ...prev,
        latency,
        isConnected: true
      }));
    } catch (error) {
      setMetrics(prev => ({
        ...prev,
        isConnected: false
      }));
    }
  }, []);

  // Setup connection monitoring
  useEffect(() => {
    const interval = setInterval(measureLatency, 5000);
    measureLatency(); // Initial measurement
    
    return () => clearInterval(interval);
  }, [measureLatency]);

  // Optimized channel subscription with automatic cleanup
  const subscribeToChannel = useCallback((channelName: string, config: any = {}) => {
    if (!isOptimizationEnabled) return null;

    // Check if channel already exists
    const existingChannel = channelsRef.current.find(ch => ch.topic === channelName);
    if (existingChannel) {
      return existingChannel;
    }

    const channel = supabase.channel(channelName);

    // Optimized message handler
    channel.on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log(`Real-time postgres change from ${channelName}:`, payload);
      
      if (config.batchUpdates) {
        messageBuffer.current.push({
          channel: channelName,
          type: payload.eventType || 'postgres_change',
          eventType: payload.eventType,
          table: payload.table,
          schema: payload.schema,
          new: payload.new,
          old: payload.old,
          timestamp: Date.now()
        });
      } else {
        // Process immediately
        console.log(`Real-time postgres change from ${channelName}:`, {
          eventType: payload.eventType,
          table: payload.table,
          schema: payload.schema
        });
        setMetrics(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
          lastActivity: new Date()
        }));
      }
    });

    // Connection event handlers
    channel.on('system', { event: 'error' }, (payload) => {
      console.error('Channel error:', payload);
      setMetrics(prev => ({
        ...prev,
        isConnected: false
      }));
    });

    channel.on('system', { event: 'connect' }, () => {
      setMetrics(prev => ({
        ...prev,
        isConnected: true,
        reconnectAttempts: 0
      }));
    });

    channel.on('system', { event: 'disconnect' }, () => {
      setMetrics(prev => ({
        ...prev,
        isConnected: false,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    });

    channel.subscribe();

    setChannels(prev => [...prev, channel]);
    return channel;
  }, [isOptimizationEnabled, config.batchUpdates]);

  // Cleanup channels on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(channel => {
        channel.unsubscribe();
      });
    };
  }, []);

  // Auto-optimization based on connection quality
  useEffect(() => {
    if (!isOptimizationEnabled) return;

    if (metrics.latency > 1000) {
      // High latency - increase batching
      setConfig(prev => ({
        ...prev,
        batchUpdates: true,
        updateInterval: Math.min(prev.updateInterval * 1.5, 5000)
      }));
    } else if (metrics.latency < 200) {
      // Low latency - reduce batching delay
      setConfig(prev => ({
        ...prev,
        updateInterval: Math.max(prev.updateInterval * 0.8, 500)
      }));
    }
  }, [metrics.latency, isOptimizationEnabled]);

  const getConnectionStatus = () => {
    if (!metrics.isConnected) {
      return { text: 'Desconectado', color: 'destructive', icon: WifiOff };
    }
    
    if (metrics.latency < 200) {
      return { text: 'Excelente', color: 'default', icon: Wifi };
    } else if (metrics.latency < 500) {
      return { text: 'Boa', color: 'secondary', icon: Wifi };
    } else {
      return { text: 'Lenta', color: 'destructive', icon: Wifi };
    }
  };

  const status = getConnectionStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Otimizador Real-Time
          </h2>
          <p className="text-muted-foreground">
            Monitor e otimização de conexões em tempo real
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="optimization-toggle" className="text-sm font-medium">
              Otimização
            </label>
            <Switch
              id="optimization-toggle"
              checked={isOptimizationEnabled}
              onCheckedChange={setIsOptimizationEnabled}
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              channels.forEach(ch => ch.unsubscribe());
              setChannels([]);
              setMetrics(prev => ({ ...prev, messagesReceived: 0 }));
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conexão</p>
                <div className="flex items-center gap-2 mt-1">
                  <status.icon className="w-4 h-4" />
                  <Badge variant={status.color as any}>{status.text}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Latência</p>
                <p className="text-2xl font-bold">{metrics.latency}ms</p>
              </div>
              <Timer className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens</p>
                <p className="text-2xl font-bold">{metrics.messagesReceived}</p>
              </div>
              <Activity className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canais</p>
                <p className="text-2xl font-bold">{channels.length}</p>
              </div>
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Otimização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Agrupar atualizações</label>
              <Switch
                checked={config.batchUpdates}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, batchUpdates: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Controlar frequência</label>
              <Switch
                checked={config.throttleUpdates}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, throttleUpdates: checked }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Intervalo de atualização: {config.updateInterval}ms
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={config.updateInterval}
              onChange={(e) => 
                setConfig(prev => ({ 
                  ...prev, 
                  updateInterval: parseInt(e.target.value) 
                }))
              }
              className="w-full"
            />
          </div>

          {metrics.lastActivity && (
            <div className="text-xs text-muted-foreground">
              Última atividade: {metrics.lastActivity.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeOptimizer;