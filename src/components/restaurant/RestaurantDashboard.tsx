import { useState, useEffect } from "react";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStoreRegistration } from "@/hooks/useStoreRegistration";
import { RestaurantRegistrationWizard } from "@/components/restaurant/RestaurantRegistrationWizard";
import { CatalogDashboard } from "@/components/restaurant/catalog/CatalogDashboard";
import type { Database } from "@/integrations/supabase/types";
import { 
  Clock, 
  CheckCircle, 
  Package, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag,
  Timer,
  Phone,
  FileText,
  Store,
  Truck,
  BarChart3,
  FolderOpen
} from "lucide-react";
import { DispatchBoard } from "@/components/restaurant/DispatchBoard";
import RestaurantSettings from "@/components/restaurant/RestaurantSettings";

type Order = Database['public']['Tables']['orders']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuStats, setMenuStats] = useState({
    totalItems: 0,
    totalCategories: 0,
    activeItems: 0
  });
  const { toast } = useToast();
  const { store, isLoading: storeLoading } = useStoreRegistration();

  useEffect(() => {
    fetchRestaurantData();
    fetchMenuStats();
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      fetchOrders();
      fetchMenuStats();
    }
  }, [restaurant?.id]);

  const fetchRestaurantData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Buscar apenas restaurantes que pertencem ao usuário logado
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
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuStats = async () => {
    try {
      if (!restaurant?.id) return;

      // Fetch menu statistics
      const [itemsResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('menu_items')
          .select('id, is_active')
          .eq('restaurant_id', restaurant.id),
        supabase
          .from('menu_categories')
          .select('id')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
      ]);

      const items = itemsResponse.data || [];
      const activeItems = items.filter(item => item.is_active);
      
      setMenuStats({
        totalItems: items.length,
        totalCategories: categoriesResponse.data?.length || 0,
        activeItems: activeItems.length
      });
    } catch (error) {
      console.error('Error fetching menu stats:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      if (!restaurant?.id) return;

      // Simplificar a consulta - sem JOIN com profiles por enquanto
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .in('status', ['placed', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Não mostrar toast de erro se não há pedidos - isso é normal
      if (error.code !== 'PGRST116') {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pedidos",
          variant: "destructive"
        });
      }
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('restaurant_updates')
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          fetchMenuStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_categories',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          fetchMenuStats();
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

  const toggleRestaurantStatus = async () => {
    try {
      if (!restaurant?.id) return;
      
      const newStatus = !restaurant.is_open;
      const { error } = await supabase
        .from('restaurants')
        .update({ 
          is_open: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      setRestaurant(prev => prev ? { ...prev, is_open: newStatus } : null);
      
      toast({
        title: newStatus ? "Restaurante Aberto" : "Restaurante Fechado",
        description: newStatus ? "Agora você está recebendo pedidos" : "Pausou o recebimento de pedidos"
      });
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status",
        variant: "destructive"
      });
    }
  };

  const [showSettings, setShowSettings] = useState(false);

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
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

  // Check if user needs to complete store registration
  const needsStoreRegistration = !storeLoading && (!store || store.status === 'DRAFT' || store.status === 'REJECTED');

  if (loading || storeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // If user needs to register store first
  if (needsStoreRegistration) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Store className="w-6 h-6" />
                <span>Cadastro de Restaurante</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {store?.status === 'REJECTED' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-medium text-destructive mb-2">Cadastro Rejeitado</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {store.rejection_reason || 'Seu cadastro foi rejeitado. Por favor, revise os dados e envie novamente.'}
                    </p>
                  </div>
                  <RestaurantRegistrationWizard />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="font-medium text-blue-700 mb-2">Bem-vindo ao Painel de Restaurante!</p>
                    <p className="text-sm text-blue-600">
                      Para acessar o painel de restaurante, você precisa completar seu cadastro como estabelecimento.
                    </p>
                  </div>
                  <RestaurantRegistrationWizard />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show different content based on store status
  if (store?.status === 'UNDER_REVIEW') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Cadastro em Análise</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Clock className="w-16 h-16 mx-auto text-warning" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aguardando Aprovação</h3>
              <p className="text-muted-foreground mb-4">
                Seu cadastro está sendo analisado pela nossa equipe. Você receberá uma notificação quando for aprovado.
              </p>
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                Em Análise
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (store?.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Loja Suspensa</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Store className="w-16 h-16 mx-auto text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Acesso Suspenso</h3>
              <p className="text-muted-foreground mb-4">
                Sua loja foi temporariamente suspensa. Entre em contato com o suporte para mais informações.
              </p>
              <Badge variant="destructive">
                Suspensa
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Se não há restaurante associado (fallback para o sistema antigo)
  if (!restaurant && !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Nenhum Restaurante Encontrado</h2>
          <p className="text-muted-foreground mb-4">
            Não foi possível encontrar um restaurante associado à sua conta. 
            Entre em contato com o suporte se você deveria ter acesso.
          </p>
          <Button onClick={() => window.history.back()}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Se estiver mostrando configurações, renderizar o painel de configurações
  if (showSettings) {
    return (
      <RestaurantSettings 
        restaurant={restaurant}
        onUpdate={fetchRestaurantData}
        onClose={closeSettings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-8">
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

          <StatsCard
            title="Itens no Menu"
            value={menuStats.activeItems}
            icon={Package}
            description={`${menuStats.totalItems} total, ${menuStats.totalCategories} categorias`}
            className="hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Restaurant Status */}
        <Card className="bg-gradient-fresh text-accent-foreground">
          <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">                
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">{store?.name || restaurant?.name || 'Restaurante'}</h2>
                  <p className="text-accent-foreground/90 text-sm">
                    Status: {restaurant?.is_open ? 'Aberto' : 'Fechado'} • 
                    Tempo médio: {restaurant?.delivery_time_min}-{restaurant?.delivery_time_max} min
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button variant="secondary" size="sm" onClick={toggleRestaurantStatus} className="min-h-[44px] text-sm">
                    {restaurant?.is_open ? 'Pausar Pedidos' : 'Abrir Pedidos'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={openSettings} className="min-h-[44px] text-sm">
                    Configurações
                  </Button>
                </div>
              </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Despacho
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
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
                const customerName = 'Cliente'; // Simplificado por enquanto
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
                const customerName = 'Cliente'; // Simplificado por enquanto
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
                const customerName = 'Cliente'; // Simplificado por enquanto
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
                        <Button size="sm" variant="outline">
                          Aguardar Coleta
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
      </TabsContent>

      {/* Catalog Tab */}
      <TabsContent value="catalog" className="space-y-6">
        <CatalogDashboard />
      </TabsContent>

      {/* Dispatch Tab */}
      <TabsContent value="dispatch" className="space-y-6">
        <DispatchBoard />
      </TabsContent>
    </Tabs>
  </div>
</div>
);
}
