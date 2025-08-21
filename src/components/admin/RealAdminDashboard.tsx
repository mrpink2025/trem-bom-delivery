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
import AdvancedAnalytics from "../analytics/AdvancedAnalytics";
import RealReportsSystem from "./RealReportsSystem";
import RestaurantSettings from "./RestaurantSettings";
import AuditLogs from "./AuditLogs";
import PerformanceDashboard from "./PerformanceDashboard";
import RealBackupManagement from "./RealBackupManagement";
import RealSecurityCenter from "./RealSecurityCenter";
import PerformanceOptimizer from "../performance/PerformanceOptimizer";
import { SecurityAuditDashboard } from './SecurityAuditDashboard';
import { PerformanceMonitorDashboard } from './PerformanceMonitorDashboard';
import { SecureUserManagement } from './SecureUserManagement';
import { SecureCourierCreation } from './SecureCourierCreation';
import { LoyaltyDashboard } from '@/components/loyalty/LoyaltyDashboard';
import { AdvancedSearchPanel } from '@/components/search/AdvancedSearchPanel';
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
import { MobileDashboardWrapper, MobileDashboardHeader, MobileDashboardGrid, MobileTabsWrapper } from "@/components/mobile/MobileDashboardWrapper";

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
    <MobileDashboardWrapper>
      <MobileDashboardHeader
        title="Painel Administrativo"
        description="Gerencie todo o ecossistema Trem Bão"
        actions={
          <>
            <Button variant="outline" onClick={fetchData} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button className="w-full sm:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </>
        }
      />

      <MobileDashboardGrid>
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
      </MobileDashboardGrid>

      {/* Secondary Metrics */}
      <MobileDashboardGrid>
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
      </MobileDashboardGrid>

      {/* Main Content Tabs */}
      <Tabs defaultValue="performance" className="space-y-4 sm:space-y-6">
        <MobileTabsWrapper>
          <TabsList className="admin-tabs-list">
            <TabsTrigger value="performance" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Performance</TabsTrigger>
            <TabsTrigger value="recent-orders" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Pedidos</TabsTrigger>
            <TabsTrigger value="restaurants" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Restaurantes</TabsTrigger>
            <TabsTrigger value="couriers" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Entregadores</TabsTrigger>
            <TabsTrigger value="user-management" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Usuários</TabsTrigger>
            <TabsTrigger value="courier-creation" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Criar Courier</TabsTrigger>
            <TabsTrigger value="loyalty" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Fidelidade</TabsTrigger>
            <TabsTrigger value="search" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Busca</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Relatórios</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Auditoria</TabsTrigger>
            <TabsTrigger value="security-audit" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">RLS Audit</TabsTrigger>
            <TabsTrigger value="perf-monitor" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Perf Mon</TabsTrigger>
            <TabsTrigger value="backup" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Backup</TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Segurança</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 py-1.5 min-w-0">Config</TabsTrigger>
          </TabsList>
        </MobileTabsWrapper>

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
                <div className="space-y-3 sm:space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <p className="font-semibold text-sm sm:text-base">#{order.id.slice(-8)}</p>
                          {getStatusBadge(order.status)}
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {formatTimeAgo(order.created_at)}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {order.customer_name} • {order.restaurant_name} • {order.courier_name}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1">
                        <p className="font-bold text-sm sm:text-base">{formatCurrency(order.total_amount)}</p>
                        <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 px-2 sm:px-3">Ver Detalhes</Button>
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

          <TabsContent value="user-management" className="space-y-4">
            <SecureUserManagement />
          </TabsContent>

          <TabsContent value="courier-creation" className="space-y-4">
            <SecureCourierCreation />
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-4">
            <LoyaltyDashboard />
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <AdvancedSearchPanel />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <AdvancedAnalytics />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <RealReportsSystem />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <RealBackupManagement />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <RealSecurityCenter />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <RestaurantSettings />
          </TabsContent>

          <TabsContent value="security-audit" className="space-y-4">
            <SecurityAuditDashboard />
          </TabsContent>

          <TabsContent value="perf-monitor" className="space-y-4">
            <PerformanceMonitorDashboard />
          </TabsContent>
        </Tabs>
    </MobileDashboardWrapper>
  );
}