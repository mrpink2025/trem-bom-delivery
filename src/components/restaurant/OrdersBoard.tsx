import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Package, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_address: any;
  profiles: { full_name: string; phone: string };
  order_items: Array<{
    quantity: number;
    menu_items: { name: string };
  }>;
  sla: {
    elapsedMinutes: number;
    remainingMinutes: number;
    timerStatus: 'green' | 'yellow' | 'red';
    isOverdue: boolean;
  };
}

interface OrdersBoardProps {
  restaurantId: string;
}

export function OrdersBoard({ restaurantId }: OrdersBoardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const statusColumns = [
    { key: 'placed', title: 'Novos', color: 'bg-blue-100' },
    { key: 'confirmed', title: 'Confirmados', color: 'bg-yellow-100' },
    { key: 'preparing', title: 'Preparando', color: 'bg-orange-100' },
    { key: 'ready', title: 'Prontos', color: 'bg-green-100' },
    { key: 'courier_assigned', title: 'Entregador', color: 'bg-purple-100' }
  ];

  useEffect(() => {
    fetchOrders();
    
    // Realtime subscription
    const channel = supabase
      .channel(`restaurant:${restaurantId}`)
      .on('broadcast', { event: 'order_update' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const fetchOrders = async () => {
    try {
      const response = await supabase.functions.invoke('ops-orders-board', {
        method: 'GET',
        body: { restaurant_id: restaurantId }
      });

      if (response.error) throw response.error;
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await supabase.functions.invoke('ops-orders-board', {
        method: 'PATCH',
        body: { order_id: orderId, to_status: newStatus }
      });

      if (response.error) throw response.error;
      
      fetchOrders();
      toast({
        title: "Status atualizado!",
        description: `Pedido movido para ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pedido",
        variant: "destructive"
      });
    }
  };

  const getTimerColor = (timerStatus: string) => {
    switch (timerStatus) {
      case 'green': return 'text-green-600';
      case 'yellow': return 'text-yellow-600';
      case 'red': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return <div className="p-6">Carregando pedidos...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex space-x-6 overflow-x-auto">
        {statusColumns.map(column => {
          const columnOrders = orders.filter(order => order.status === column.key);
          
          return (
            <div key={column.key} className="flex-shrink-0 w-80">
              <div className={`${column.color} p-3 rounded-t-lg`}>
                <h3 className="font-semibold">{column.title}</h3>
                <Badge variant="secondary">{columnOrders.length}</Badge>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto p-3 border border-t-0 rounded-b-lg">
                {columnOrders.map(order => (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm">#{order.id.slice(0, 8)}</CardTitle>
                        <div className={`flex items-center space-x-1 ${getTimerColor(order.sla.timerStatus)}`}>
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-medium">
                            {order.sla.isOverdue ? '+' : ''}{order.sla.elapsedMinutes}min
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{order.profiles.full_name}</span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm">
                        <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          {order.order_items.slice(0, 2).map((item, idx) => (
                            <div key={idx}>
                              {item.quantity}x {item.menu_items.name}
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <div className="text-muted-foreground">
                              +{order.order_items.length - 2} itens
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="font-semibold text-sm">
                          R$ {Number(order.total_amount).toFixed(2)}
                        </span>
                        
                        {order.status === 'placed' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          >
                            Confirmar
                          </Button>
                        )}
                        
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                          >
                            Preparar
                          </Button>
                        )}
                        
                        {order.status === 'preparing' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                          >
                            Pronto
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {columnOrders.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum pedido
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}