import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Truck, 
  Clock, 
  MapPin, 
  Package,
  CheckCircle2,
  User
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database['public']['Tables']['orders']['Row'];

export function DispatchBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['confirmed', 'preparing', 'ready', 'courier_assigned', 'en_route_to_store', 'picked_up', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
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

  const updateOrderStatus = async (orderId: string, newStatus: Database['public']['Enums']['order_status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      fetchActiveOrders();
      toast({
        title: "Status atualizado!",
        description: `Pedido atualizado para ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive"
      });
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 };
      case 'preparing':
        return { label: 'Preparando', color: 'bg-yellow-100 text-yellow-800', icon: Package };
      case 'ready':
        return { label: 'Pronto', color: 'bg-green-100 text-green-800', icon: CheckCircle2 };
      case 'courier_assigned':
        return { label: 'Entregador Designado', color: 'bg-purple-100 text-purple-800', icon: User };
      case 'en_route_to_store':
        return { label: 'Indo para Loja', color: 'bg-blue-100 text-blue-800', icon: Truck };
      case 'picked_up':
        return { label: 'Coletado', color: 'bg-indigo-100 text-indigo-800', icon: Package };
      case 'out_for_delivery':
        return { label: 'Em Entrega', color: 'bg-orange-100 text-orange-800', icon: Truck };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>Central de Despacho</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando pedidos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Truck className="w-5 h-5" />
          <span>Central de Despacho</span>
          <Badge variant="secondary">
            {orders.length} pedidos ativos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum pedido ativo no momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const Icon = statusInfo.icon;
              const deliveryAddress = order.delivery_address as any;

              return (
                <div key={order.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                    <Badge className={statusInfo.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{deliveryAddress?.street || 'Endereço não disponível'}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {order.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="w-full"
                    >
                      Iniciar Preparo
                    </Button>
                  )}

                  {order.status === 'preparing' && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="w-full"
                    >
                      Marcar como Pronto
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}