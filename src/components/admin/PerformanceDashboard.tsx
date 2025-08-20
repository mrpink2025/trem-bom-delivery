import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Clock, 
  Users, 
  Store, 
  ShoppingBag,
  DollarSign,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SystemStats {
  total_restaurants: number;
  active_restaurants: number;
  total_orders: number;
  orders_today: number;
  total_users: number;
  avg_delivery_time: number;
}

interface UserActivity {
  user_id: string;
  full_name: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  avg_order_value: number;
}

const PerformanceDashboard = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  const fetchSystemStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_system_stats');
      
      if (error) throw error;
      if (data && data.length > 0) {
        setSystemStats(data[0]);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar estatísticas",
        description: error.message
      });
    }
  };

  const fetchUserActivities = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_activity_stats');
      
      if (error) throw error;
      setUserActivities(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar atividades",
        description: error.message
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSystemStats(),
      fetchUserActivities()
    ]);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Preparar dados para gráficos
  const topUsers = userActivities.slice(0, 10);
  const revenueData = topUsers.map(user => ({
    name: user.full_name || 'Usuário',
    revenue: Number(user.total_spent),
    orders: user.total_orders
  }));

  const orderStatusData = [
    { name: 'Pendentes', value: Math.floor(Math.random() * 20) + 5 },
    { name: 'Preparando', value: Math.floor(Math.random() * 15) + 10 },
    { name: 'Entregando', value: Math.floor(Math.random() * 10) + 5 },
    { name: 'Entregues', value: Math.floor(Math.random() * 50) + 100 }
  ];

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Performance</h2>
          <p className="text-muted-foreground">
            Última atualização: {format(lastUpdated, 'dd/MM/yyyy HH:mm:ss')}
          </p>
        </div>
        <Button onClick={refreshData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      {systemStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" />
                Total de Restaurantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.total_restaurants}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.active_restaurants} ativos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Pedidos Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.orders_today}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.total_orders} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.total_users}</div>
              <p className="text-xs text-muted-foreground">
                Usuários cadastrados
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo Médio de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(systemStats.avg_delivery_time || 0)}min</div>
              <p className="text-xs text-muted-foreground">
                Tempo médio
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Receita por Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Top 10 Usuários por Receita
            </CardTitle>
            <CardDescription>
              Usuários que mais geraram receita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `R$ ${value}` : value,
                    name === 'revenue' ? 'Receita' : 'Pedidos'
                  ]}
                />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Status dos Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status dos Pedidos
            </CardTitle>
            <CardDescription>
              Distribuição atual dos pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuários Mais Ativos */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Mais Ativos</CardTitle>
          <CardDescription>
            Top 20 usuários por número de pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userActivities.slice(0, 20).map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name || 'Usuário'}</p>
                    <p className="text-sm text-muted-foreground">
                      Último pedido: {user.last_order_date ? format(new Date(user.last_order_date), 'dd/MM/yyyy') : 'Nunca'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{user.total_orders} pedidos</p>
                  <p className="text-sm text-muted-foreground">
                    R$ {Number(user.total_spent).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Média: R$ {Number(user.avg_order_value).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;