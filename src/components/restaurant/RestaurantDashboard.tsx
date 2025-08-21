import { useState, useEffect } from "react";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { 
  Clock, 
  CheckCircle, 
  Package, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag,
  Timer,
  Phone
} from "lucide-react";

type Order = Database['public']['Tables']['orders']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      fetchOrders();
    }
  }, [restaurant?.id]);

  const fetchRestaurantData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.user.id)
        .maybeSingle();

      if (error) throw error;
      setRestaurant(data);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados do restaurante",
        variant: "destructive"
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !restaurant?.id) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('restaurant_id', restaurant.id)
        .in('status', ['placed', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;
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

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('restaurant_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return <Badge className="bg-warning text-warning-foreground">Novo</Badge>;
      case 'confirmed':
        return <Badge className="bg-warning text-warning-foreground">Confirmado</Badge>;
      case 'preparing':
        return <Badge className="bg-blue-500 text-white">Preparando</Badge>;
      case 'ready':
        return <Badge className="bg-success text-success-foreground">Pronto</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'confirmed' | 'preparing' | 'ready') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "Status do pedido atualizado com sucesso"
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive"
      });
    }
  };

  const todayOrders = orders.filter(order => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.created_at).toDateString();
    return today === orderDate;
  });

  const todayStats = {
    totalOrders: todayOrders.length,
    revenue: todayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0),
    avgTicket: todayOrders.length > 0 ? todayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0) / todayOrders.length : 0,
    pendingOrders: orders.filter(order => ['placed', 'confirmed'].includes(order.status)).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-8">
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Pedidos hoje"
            value={todayStats.totalOrders}
            icon={ShoppingBag}
            description="Pedidos recebidos hoje"
            trend={{ value: 15.3, isPositive: true }}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Faturamento"
            value={todayStats.revenue}
            prefix="R$ "
            icon={DollarSign}
            description="Receita de hoje"
            trend={{ value: 12.8, isPositive: true }}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Ticket médio"
            value={todayStats.avgTicket}
            prefix="R$ "
            icon={TrendingUp}
            description="Valor médio por pedido"
            trend={{ value: -2.1, isPositive: false }}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Pendentes"
            value={todayStats.pendingOrders}
            icon={Timer}
            description="Pedidos aguardando"
            className="hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Restaurant Status */}
        <Card className="bg-gradient-fresh text-accent-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">{restaurant?.name || 'Restaurante'}</h2>
                <p className="text-accent-foreground/90">
                  Status: {restaurant?.is_open ? 'Aberto' : 'Fechado'} • 
                  Tempo médio: {restaurant?.delivery_time_min}-{restaurant?.delivery_time_max} min
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  {restaurant?.is_open ? 'Pausar Pedidos' : 'Abrir Pedidos'}
                </Button>
                <Button variant="secondary" size="sm">
                  Configurações
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* New Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-warning" />
                <span>Novos Pedidos</span>
                <Badge variant="secondary">{orders.filter(order => ['placed', 'confirmed'].includes(order.status)).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.filter(order => ['placed', 'confirmed'].includes(order.status)).map((order) => {
                const customerName = (order as any).profiles?.full_name || 'Cliente';
                const orderItems = Array.isArray(order.items) ? order.items : [];
                const timeAgo = new Date(order.created_at).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });

                return (
                  <div key={order.id} className="p-4 border rounded-lg space-y-3 animate-fade-in">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{customerName}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="space-y-1">
                      {orderItems.map((item: any, index: number) => (
                        <p key={index} className="text-sm">
                          {item.quantity}x {item.name} - R$ {Number(item.price * item.quantity).toFixed(2)}
                        </p>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <p className="font-bold">R$ {Number(order.total_amount).toFixed(2)}</p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="destructive">
                          Rejeitar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                        >
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {orders.filter(order => ['placed', 'confirmed'].includes(order.status)).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum pedido novo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preparing Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-500" />
                <span>Em Preparo</span>
                <Badge variant="secondary">{orders.filter(order => order.status === 'preparing').length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.filter(order => order.status === 'preparing').map((order) => {
                const customerName = (order as any).profiles?.full_name || 'Cliente';
                const orderItems = Array.isArray(order.items) ? order.items : [];
                const timeAgo = new Date(order.created_at).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });

                return (
                  <div key={order.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{customerName}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="space-y-1">
                      {orderItems.map((item: any, index: number) => (
                        <p key={index} className="text-sm">
                          {item.quantity}x {item.name} - R$ {Number(item.price * item.quantity).toFixed(2)}
                        </p>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-warning">
                      <Timer className="w-4 h-4" />
                      <span>Tempo estimado: {restaurant?.delivery_time_min || 30} min</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <p className="font-bold">R$ {Number(order.total_amount).toFixed(2)}</p>
                      <Button 
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                      >
                        Marcar Pronto
                      </Button>
                    </div>
                  </div>
                );
              })}
              {orders.filter(order => order.status === 'preparing').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum pedido em preparo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ready Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Prontos</span>
                <Badge variant="secondary">{orders.filter(order => order.status === 'ready').length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.filter(order => order.status === 'ready').map((order) => {
                const customerName = (order as any).profiles?.full_name || 'Cliente';
                const orderItems = Array.isArray(order.items) ? order.items : [];
                const timeAgo = new Date(order.created_at).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });

                return (
                  <div key={order.id} className="p-4 border rounded-lg space-y-3 bg-success/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{customerName}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="space-y-1">
                      {orderItems.map((item: any, index: number) => (
                        <p key={index} className="text-sm">
                          {item.quantity}x {item.name} - R$ {Number(item.price * item.quantity).toFixed(2)}
                        </p>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <p className="font-bold">R$ {Number(order.total_amount).toFixed(2)}</p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4 mr-1" />
                          Ligar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                        >
                          Entregue
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {orders.filter(order => order.status === 'ready').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum pedido pronto</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}