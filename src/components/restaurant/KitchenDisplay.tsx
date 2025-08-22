import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ChefHat, CheckCircle, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KitchenTicket {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  notes?: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'SERVED';
  station?: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface AggregatedItem {
  item_name: string;
  total_quantity: number;
  tickets: KitchenTicket[];
  avg_priority: number;
  oldest_ticket: string;
}

interface KitchenDisplayProps {
  restaurantId: string;
}

export function KitchenDisplay({ restaurantId }: KitchenDisplayProps) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [windowMinutes, setWindowMinutes] = useState(10);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const stations = ['all', 'grill', 'fryer', 'salads', 'drinks', 'desserts'];

  useEffect(() => {
    loadKitchenData();
    
    // Realtime subscription para tickets
    const channel = supabase
      .channel(`restaurant:${restaurantId}:kitchen`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_tickets',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          loadKitchenData();
        }
      )
      .subscribe();

    // Auto refresh a cada 30 segundos
    const interval = setInterval(loadKitchenData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [restaurantId, windowMinutes]);

  const loadKitchenData = async () => {
    try {
      // Carregar dados da edge function
      const { data, error } = await supabase.functions.invoke('ops-kds-aggregate', {
        body: {
          restaurant_id: restaurantId,
          window_minutes: windowMinutes
        }
      });

      if (error) throw error;

      setTickets(data.tickets || []);
      setAggregatedItems(data.aggregated_items || []);
    } catch (error) {
      console.error('Erro ao carregar dados da cozinha:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados da cozinha",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase.functions.invoke('ops-kds-aggregate', {
        body: {
          ticket_id: ticketId,
          status: newStatus
        }
      });

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Item movido para ${newStatus}`,
      });

    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do item",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUEUED': return 'bg-orange-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'READY': return 'bg-green-500';
      case 'SERVED': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED': return <Clock className="h-4 w-4" />;
      case 'IN_PROGRESS': return <ChefHat className="h-4 w-4" />;
      case 'READY': return <CheckCircle className="h-4 w-4" />;
      case 'SERVED': return <CheckCircle className="h-4 w-4" />;
      default: return <Timer className="h-4 w-4" />;
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return diffMinutes;
  };

  const filteredItems = selectedStation === 'all' 
    ? aggregatedItems 
    : aggregatedItems.filter(item => 
        item.tickets.some(ticket => ticket.station === selectedStation)
      );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando cozinha...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Kitchen Display System</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {filteredItems.length} itens na fila
            </Badge>
            <select 
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value))}
              className="px-3 py-1 border rounded"
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
            </select>
          </div>
        </div>

        {/* Estações */}
        <Tabs value={selectedStation} onValueChange={setSelectedStation} className="mt-4">
          <TabsList className="grid grid-cols-6 w-full">
            {stations.map(station => (
              <TabsTrigger key={station} value={station} className="capitalize">
                {station === 'all' ? 'Todas' : station}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Items Grid */}
      <div className="p-6 h-full overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const oldestTicket = item.tickets.reduce((oldest, current) => 
              new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
            );
            const elapsedMinutes = getTimeElapsed(oldestTicket.created_at);
            const isUrgent = elapsedMinutes > 15;

            return (
              <Card 
                key={`${item.item_name}-${oldestTicket.id}`}
                className={`relative transition-all duration-200 ${
                  isUrgent ? 'border-red-500 border-2 shadow-lg' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.item_name}</CardTitle>
                    <Badge 
                      variant="secondary" 
                      className="text-lg font-bold px-3 py-1"
                    >
                      {item.total_quantity}x
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    <span className={isUrgent ? 'text-red-600 font-semibold' : ''}>
                      {elapsedMinutes} min
                    </span>
                    {oldestTicket.station && (
                      <Badge variant="outline" className="ml-auto">
                        {oldestTicket.station}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Status dos tickets */}
                  <div className="grid grid-cols-2 gap-2">
                    {['QUEUED', 'IN_PROGRESS', 'READY', 'SERVED'].map(status => {
                      const count = item.tickets.filter(t => t.status === status).length;
                      if (count === 0) return null;
                      
                      return (
                        <div 
                          key={status}
                          className="flex items-center gap-1 text-xs"
                        >
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                          <span>{count}x {status}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notas especiais */}
                  {item.tickets.some(t => t.notes) && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      <strong>Obs:</strong> {item.tickets.find(t => t.notes)?.notes}
                    </div>
                  )}

                  {/* Ações rápidas */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {oldestTicket.status === 'QUEUED' && (
                      <Button
                        size="sm"
                        onClick={() => updateTicketStatus(oldestTicket.id, 'IN_PROGRESS')}
                        className="w-full"
                      >
                        <ChefHat className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    
                    {oldestTicket.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        onClick={() => updateTicketStatus(oldestTicket.id, 'READY')}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Pronto
                      </Button>
                    )}

                    {oldestTicket.status === 'READY' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus(oldestTicket.id, 'SERVED')}
                        className="w-full"
                      >
                        Servido
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum item na fila</h3>
            <p className="text-muted-foreground">
              Não há itens para preparar na estação selecionada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}