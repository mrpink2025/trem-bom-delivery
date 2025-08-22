import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Clock, Download, Filter } from 'lucide-react';
import { useAdminPanel } from '@/hooks/useAdminPanel';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminReportsModule() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedStore, setSelectedStore] = useState('');
  const [reportType, setReportType] = useState('kpi');

  const { generateReport } = useAdminPanel();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['admin-reports', reportType, dateRange, selectedStore],
    queryFn: () => generateReport({
      report_type: reportType as any,
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
      store_id: selectedStore || undefined,
    }),
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  const kpis = reportData?.kpis;
  const ordersData = reportData?.orders;
  const performanceData = reportData?.performance_metrics;

  // Mock data for charts
  const revenueChartData = [
    { day: '01', revenue: 12500, orders: 45 },
    { day: '02', revenue: 15200, orders: 52 },
    { day: '03', revenue: 11800, orders: 41 },
    { day: '04', revenue: 18900, orders: 67 },
    { day: '05', revenue: 16300, orders: 58 },
    { day: '06', revenue: 21100, orders: 75 },
    { day: '07', revenue: 19700, orders: 69 },
  ];

  const categoryDistribution = [
    { name: 'Comida Brasileira', value: 35, count: 245 },
    { name: 'Pizza', value: 25, count: 175 },
    { name: 'Lanches', value: 20, count: 140 },
    { name: 'Japonesa', value: 12, count: 84 },
    { name: 'Outros', value: 8, count: 56 },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e KPIs</h1>
          <p className="text-muted-foreground">Análises detalhadas e métricas da plataforma</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">Carregando relatórios...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios e KPIs</h1>
        <p className="text-muted-foreground">
          Análises detalhadas e métricas da plataforma
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2">
              <Label>Período</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <div className="space-y-2">
              <Label>Loja (opcional)</Label>
              <Input
                placeholder="ID da loja"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-48"
              />
            </div>
            <Button>
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="kpi">KPIs Principais</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi" className="space-y-6">
          {/* Main KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(kpis?.total_revenue || 0)}</p>
                    <p className="text-xs text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12.5% vs mês anterior
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Pedidos</p>
                    <p className="text-2xl font-bold">{kpis?.total_orders || 0}</p>
                    <p className="text-xs text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +8.3% vs mês anterior
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">{formatCurrency(kpis?.average_ticket || 0)}</p>
                    <p className="text-xs text-red-600 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -2.1% vs mês anterior
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Cancelamento</p>
                    <p className="text-2xl font-bold">{kpis?.cancel_rate?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-green-600 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -1.2% vs mês anterior
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução da Receita (Últimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : value,
                    name === 'revenue' ? 'Receita' : 'Pedidos'
                  ]} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pedidos por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Platform Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lojas Ativas</p>
                    <p className="text-2xl font-bold">{kpis?.active_stores || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Couriers Ativos</p>
                    <p className="text-2xl font-bold">{kpis?.active_couriers || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Take Rate</p>
                    <p className="text-2xl font-bold">{kpis?.take_rate?.toFixed(1) || 0}%</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Relatório detalhado de pedidos em construção...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Tempo Médio de Preparo</p>
                      <p className="text-2xl font-bold">{performanceData?.avg_preparation_time?.toFixed(1) || 0} min</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">SLA Compliance</p>
                      <p className="text-2xl font-bold">{performanceData?.sla_compliance || 0}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Pedidos Analisados</p>
                      <p className="text-2xl font-bold">{performanceData?.total_orders_analyzed || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}