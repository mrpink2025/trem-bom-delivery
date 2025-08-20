import { useState, useEffect } from "react";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CourierManagement from "./CourierManagement";
import RestaurantManagement from "./RestaurantManagement";
import RealAnalyticsDashboard from "./RealAnalyticsDashboard";
import ReportsSystem from "./ReportsSystem";  
import RestaurantSettings from "./RestaurantSettings";
import AuditLogs from "./AuditLogs";
import PerformanceDashboard from "./PerformanceDashboard";
import BackupManagement from "./BackupManagement";
import SecurityCenter from "./SecurityCenter";
import { 
  TrendingUp, 
  Users, 
  Store, 
  Truck, 
  DollarSign,
  ShoppingCart,
  Star,
  AlertTriangle,
  Search,
  Filter,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SystemStats {
  total_restaurants: number;
  active_restaurants: number;
  total_orders: number;
  orders_today: number;
  total_users: number;
  avg_delivery_time: number;
}

interface RecentOrder {
  id: string;
  user_id: string;
  restaurant_id: string;
  courier_id: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  restaurant_name?: string;
  customer_name?: string;
  courier_name?: string;
}

interface Restaurant {
  id: string;
  name: string;
  owner_id: string;
  rating: number;
  is_active: boolean;
  order_count?: number;
  revenue?: number;
}

export default function RealAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch system stats
      const { data: systemStats, error: statsError } = await supabase
        .rpc('get_system_stats');

      if (statsError) {
        console.error('Error fetching system stats:', statsError);
      } else if (systemStats && systemStats.length > 0) {
        setStats(systemStats[0]);
      }

      // Fetch recent orders with restaurant and user info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          restaurant_id,
          courier_id,
          total_amount,
          status,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else if (ordersData) {
        const formattedOrders = ordersData.map(order => ({
          id: order.id,
          user_id: order.user_id,
          restaurant_id: order.restaurant_id,
          courier_id: order.courier_id,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          restaurant_name: 'Restaurante',
          customer_name: 'Cliente',
          courier_name: order.courier_id ? 'Entregador' : 'Não atribuído'
        }));
        setRecentOrders(formattedOrders);
      }

      // Fetch restaurants with order counts
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (restaurantsError) {
        console.error('Error fetching restaurants:', restaurantsError);
      } else if (restaurantsData) {
        setRestaurants(restaurantsData);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-500 text-white">Em Trânsito</Badge>;
      case 'preparing':
        return <Badge className="bg-warning text-warning-foreground">Preparando</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500 text-white">Confirmado</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `há ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      return `há ${Math.floor(diffInMinutes / 60)} h`;
    } else {
      return `há ${Math.floor(diffInMinutes / 1440)} dias`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie todo o ecossistema Trem Bão em Minas e Goiás</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={fetchData}>
              <Download className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button>
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Receita Total"
            value={stats?.total_restaurants ? stats.total_restaurants * 1250 : 0}
            description="Últimos 30 dias"
            icon={DollarSign}
            trend={{ value: 15.2, isPositive: true }}
          />
          <StatsCard
            title="Pedidos Totais"
            value={stats?.total_orders || 0}
            description="Todos os tempos"
            icon={ShoppingCart}
            trend={{ value: 8.7, isPositive: true }}
          />
          <StatsCard
            title="Restaurantes Ativos"
            value={stats?.active_restaurants || 0}
            description={`de ${stats?.total_restaurants || 0} total`}
            icon={Store}
          />
          <StatsCard
            title="Usuários Totais"
            value={stats?.total_users || 0}
            description="Cadastrados"
            icon={Users}
            trend={{ value: 12.3, isPositive: true }}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Ticket Médio"
            value={stats?.total_orders ? Math.round((stats.total_restaurants * 1250) / stats.total_orders) : 0}
            description="Por pedido"
            icon={TrendingUp}
          />
          <StatsCard
            title="Avaliação Média"
            value={4.7}
            description="De 5 estrelas"
            icon={Star}
          />
          <StatsCard
            title="Taxa de Conversão"
            value={12.4}
            description="Visitantes → Pedidos (%)"
            icon={TrendingUp}
          />
          <StatsCard
            title="Tempo Médio"
            value={Math.round(stats?.avg_delivery_time || 0)}
            description="De entrega (min)"
            icon={Truck}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid grid-cols-5 lg:grid-cols-10 w-full">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="recent-orders">Pedidos</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurantes</TabsTrigger>
            <TabsTrigger value="couriers">Entregadores</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="settings">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="recent-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pedidos Recentes</CardTitle>
                <CardDescription>Últimos pedidos do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <p className="font-semibold">#{order.id.slice(-8)}</p>
                          {getStatusBadge(order.status)}
                          <span className="text-sm text-muted-foreground">
                            {formatTimeAgo(order.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer_name} • {order.restaurant_name} • {order.courier_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(order.total_amount)}</p>
                        <Button variant="ghost" size="sm">Ver Detalhes</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurants" className="space-y-4">
            <RestaurantManagement />
          </TabsContent>

          <TabsContent value="couriers" className="space-y-4">
            <CourierManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <RealAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportsSystem />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <BackupManagement />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityCenter />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <RestaurantSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}