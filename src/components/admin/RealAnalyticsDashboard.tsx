import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock,
  Download,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsData {
  total_revenue: number;
  total_orders: number;
  total_users: number;
  avg_delivery_time: number;
  revenue_growth: number;
  orders_growth: number;
  monthly_data: any;
}

// Status do pedido com cores do design system
const orderStatusData = [
  { name: 'Entregues', value: 0, color: 'hsl(var(--success))' },
  { name: 'Em Preparo', value: 0, color: 'hsl(var(--warning))' },
  { name: 'Em Trânsito', value: 0, color: 'hsl(var(--blue-500))' },
  { name: 'Cancelados', value: 0, color: 'hsl(var(--destructive))' }
];

export default function RealAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const { toast } = useToast();

  const fetchAnalyticsData = async (daysBack: number = 30) => {
    try {
      setLoading(true);
      
      // Buscar dados de analytics
      const { data: analytics, error: analyticsError } = await supabase
        .rpc('get_analytics_data', { days_back: daysBack });

      if (analyticsError) {
        console.error('Error fetching analytics:', analyticsError);
        toast({
          title: "Erro ao carregar analytics",
          description: "Não foi possível carregar os dados de analytics.",
          variant: "destructive",
        });
        return;
      }

      if (analytics && analytics.length > 0) {
        const data = analytics[0];
        // Parse monthly_data if it's a string
        if (typeof data.monthly_data === 'string') {
          data.monthly_data = JSON.parse(data.monthly_data);
        }
        setAnalyticsData(data);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData(parseInt(selectedPeriod));
  }, [selectedPeriod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <div className={`flex items-center text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
        {isPositive ? '+' : ''}{growth.toFixed(1)}%
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Avançados</h2>
          <p className="text-muted-foreground">Análises detalhadas de performance e métricas</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">
                        {analyticsData ? formatCurrency(analyticsData.total_revenue) : 'R$ 0,00'}
                      </p>
                      {analyticsData && formatGrowth(analyticsData.revenue_growth)}
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Pedidos</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">
                        {analyticsData ? analyticsData.total_orders.toLocaleString('pt-BR') : '0'}
                      </p>
                      {analyticsData && formatGrowth(analyticsData.orders_growth)}
                    </div>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Usuários</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">
                        {analyticsData ? analyticsData.total_users.toLocaleString('pt-BR') : '0'}
                      </p>
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">
                        {analyticsData ? 
                          `${Math.round(analyticsData.avg_delivery_time || 0)} min` : 
                          '0 min'
                        }
                      </p>
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Receita Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={Array.isArray(analyticsData?.monthly_data) ? analyticsData.monthly_data : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={Array.isArray(analyticsData?.monthly_data) ? analyticsData.monthly_data : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="pedidos" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name="Pedidos"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="usuarios" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={3}
                      name="Novos Usuários"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={Array.isArray(analyticsData?.monthly_data) ? analyticsData.monthly_data : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pedidos" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Pedidos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="usuarios" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={3}
                    name="Novos Usuários"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Receita por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={Array.isArray(analyticsData?.monthly_data) ? analyticsData.monthly_data : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                    name="Receita (R$)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pedidos Concluídos</span>
                    <span className="font-bold">
                      {analyticsData ? `${Math.round((analyticsData.total_orders / (analyticsData.total_orders + 50)) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-success h-2 rounded-full" 
                      style={{ 
                        width: analyticsData ? 
                          `${Math.round((analyticsData.total_orders / (analyticsData.total_orders + 50)) * 100)}%` : 
                          '0%' 
                      }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tempo Médio de Entrega</span>
                    <span className="font-bold">
                      {analyticsData ? `${Math.round(analyticsData.avg_delivery_time || 0)} min` : '0 min'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Crescimento de Receita</span>
                    <span className="font-bold">
                      {analyticsData ? `${analyticsData.revenue_growth > 0 ? '+' : ''}${analyticsData.revenue_growth.toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">
                      {analyticsData ? analyticsData.total_users : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total de usuários</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">
                      {analyticsData ? formatCurrency(analyticsData.total_revenue / (analyticsData.total_orders || 1)) : 'R$ 0,00'}
                    </div>
                    <div className="text-sm text-muted-foreground">Ticket médio</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}