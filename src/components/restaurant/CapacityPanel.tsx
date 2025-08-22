import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Timer, 
  Settings, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MerchantCapacity {
  store_id: string;
  is_busy: boolean;
  auto_accept: boolean;
  auto_reject_when_queue_gt?: number;
  prep_time_base_minutes: number;
  prep_time_busy_minutes: number;
  max_parallel_orders?: number;
  surge_prep_increment: number;
}

interface CapacityStats {
  current_queue: number;
  avg_prep_time: number;
  on_time_rate: number;
  active_orders: number;
}

interface CapacityPanelProps {
  restaurantId: string;
}

export function CapacityPanel({ restaurantId }: CapacityPanelProps) {
  const [capacity, setCapacity] = useState<MerchantCapacity | null>(null);
  const [stats, setStats] = useState<CapacityStats>({
    current_queue: 0,
    avg_prep_time: 0,
    on_time_rate: 0,
    active_orders: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCapacityData();
    loadStats();
    
    // Realtime updates
    const channel = supabase
      .channel(`restaurant:${restaurantId}:capacity`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merchant_capacity',
          filter: `store_id=eq.${restaurantId}`
        },
        () => {
          loadCapacityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const loadCapacityData = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_capacity')
        .select('*')
        .eq('store_id', restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') { // Não existe ainda
        console.error('Erro ao carregar capacidade:', error);
        return;
      }

      if (data) {
        setCapacity(data);
      } else {
        // Criar configuração padrão
        setCapacity({
          store_id: restaurantId,
          is_busy: false,
          auto_accept: false,
          auto_reject_when_queue_gt: undefined,
          prep_time_base_minutes: 15,
          prep_time_busy_minutes: 25,
          max_parallel_orders: undefined,
          surge_prep_increment: 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar capacidade:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Buscar estatísticas da fila atual
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('restaurant_id', restaurantId)
        .in('status', ['placed', 'confirmed', 'preparing', 'ready'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const queuedOrders = orders?.filter(o => ['placed', 'confirmed'].includes(o.status)) || [];
      const activeOrders = orders?.filter(o => ['preparing', 'ready'].includes(o.status)) || [];

      setStats({
        current_queue: queuedOrders.length,
        active_orders: activeOrders.length,
        avg_prep_time: 20, // Calcularia de order_events
        on_time_rate: 85    // Calcularia de SLA
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const updateCapacity = async (updates: Partial<MerchantCapacity>) => {
    if (!capacity) return;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('ops-capacity-set', {
        body: {
          store_id: restaurantId,
          ...updates
        }
      });

      if (error) throw error;

      setCapacity(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Configuração atualizada",
        description: "As mudanças foram salvas com sucesso",
      });

    } catch (error: any) {
      console.error('Erro ao atualizar capacidade:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Falha ao atualizar configuração",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleBusyMode = () => {
    if (!capacity) return;
    updateCapacity({ is_busy: !capacity.is_busy });
  };

  const getStatusColor = () => {
    if (!capacity) return 'gray';
    if (capacity.is_busy) return 'orange';
    if (stats.current_queue > 5) return 'red';
    return 'green';
  };

  const getStatusText = () => {
    if (!capacity) return 'Carregando...';
    if (capacity.is_busy) return 'Ocupado';
    if (stats.current_queue > 5) return 'Fila alta';
    return 'Normal';
  };

  if (loading || !capacity) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status da Loja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className={`w-4 h-4 rounded-full bg-${getStatusColor()}-500`} />
              </div>
              <div className="font-semibold">{getStatusText()}</div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-semibold">{stats.current_queue}</div>
              <div className="text-sm text-muted-foreground">Na fila</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-semibold">{stats.avg_prep_time}min</div>
              <div className="text-sm text-muted-foreground">Preparo médio</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-semibold">{stats.on_time_rate}%</div>
              <div className="text-sm text-muted-foreground">No prazo</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de capacidade */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Capacidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Modo ocupado */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Modo Ocupado</Label>
              <p className="text-sm text-muted-foreground">
                Aumenta automaticamente o tempo de preparo
              </p>
            </div>
            <Switch
              checked={capacity.is_busy}
              onCheckedChange={toggleBusyMode}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Auto aceitar */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Auto Aceitar</Label>
              <p className="text-sm text-muted-foreground">
                Aceita pedidos automaticamente
              </p>
            </div>
            <Switch
              checked={capacity.auto_accept}
              onCheckedChange={(checked) => updateCapacity({ auto_accept: checked })}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Tempos de preparo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prep-base">Tempo base (min)</Label>
              <Input
                id="prep-base"
                type="number"
                value={capacity.prep_time_base_minutes}
                onChange={(e) => setCapacity(prev => prev ? {
                  ...prev,
                  prep_time_base_minutes: Number(e.target.value)
                } : null)}
                onBlur={() => updateCapacity({ 
                  prep_time_base_minutes: capacity.prep_time_base_minutes 
                })}
                min="5"
                max="60"
                disabled={saving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prep-busy">Tempo ocupado (min)</Label>
              <Input
                id="prep-busy"
                type="number"
                value={capacity.prep_time_busy_minutes}
                onChange={(e) => setCapacity(prev => prev ? {
                  ...prev,
                  prep_time_busy_minutes: Number(e.target.value)
                } : null)}
                onBlur={() => updateCapacity({ 
                  prep_time_busy_minutes: capacity.prep_time_busy_minutes 
                })}
                min="5"
                max="90"
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Limites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-orders">Máx. pedidos simultâneos</Label>
              <Input
                id="max-orders"
                type="number"
                value={capacity.max_parallel_orders || ''}
                onChange={(e) => setCapacity(prev => prev ? {
                  ...prev,
                  max_parallel_orders: e.target.value ? Number(e.target.value) : undefined
                } : null)}
                onBlur={() => updateCapacity({ 
                  max_parallel_orders: capacity.max_parallel_orders 
                })}
                placeholder="Sem limite"
                min="1"
                max="50"
                disabled={saving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="auto-reject">Auto rejeitar se fila &gt;</Label>
              <Input
                id="auto-reject"
                type="number"
                value={capacity.auto_reject_when_queue_gt || ''}
                onChange={(e) => setCapacity(prev => prev ? {
                  ...prev,
                  auto_reject_when_queue_gt: e.target.value ? Number(e.target.value) : undefined
                } : null)}
                onBlur={() => updateCapacity({ 
                  auto_reject_when_queue_gt: capacity.auto_reject_when_queue_gt 
                })}
                placeholder="Sem limite"
                min="1"
                max="20"
                disabled={saving}
              />
            </div>
          </div>

          {/* Alertas */}
          {stats.current_queue > 5 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                Fila alta detectada. Considere ativar o modo ocupado.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={capacity.is_busy ? "destructive" : "default"}
              onClick={toggleBusyMode}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Timer className="h-4 w-4" />
              {capacity.is_busy ? 'Sair do Ocupado' : 'Entrar em Ocupado'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => updateCapacity({ 
                prep_time_base_minutes: capacity.prep_time_base_minutes + 5 
              })}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              +5min Preparo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}