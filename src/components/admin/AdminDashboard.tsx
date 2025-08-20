import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CourierManagement from "./CourierManagement";
import RestaurantManagement from "./RestaurantManagement";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ReportsSystem from "./ReportsSystem";
import RestaurantSettings from "./RestaurantSettings";
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

const mockStats = {
  totalRevenue: 125420.50,
  totalOrders: 3248,
  activeRestaurants: 145,
  activeCouriers: 89,
  avgOrderValue: 38.60,
  avgRating: 4.6,
  conversionRate: 12.4,
  disputes: 23
};

const mockRecentOrders = [
  {
    id: "#ORD-1001",
    customer: "Maria Silva",
    restaurant: "Tempero Goiano",
    courier: "João Entregador",
    value: 45.90,
    status: "delivered",
    time: "há 5 min"
  },
  {
    id: "#ORD-1002", 
    customer: "Carlos Santos",
    restaurant: "Pizzaria Trem Bom",
    courier: "Ana Delivery",
    value: 67.50,
    status: "in_transit",
    time: "há 12 min"
  },
  {
    id: "#ORD-1003",
    customer: "Fernanda Costa",
    restaurant: "Pamonharia Central", 
    courier: "Pedro Moto",
    value: 32.80,
    status: "preparing",
    time: "há 18 min"
  }
];

const mockRestaurants = [
  {
    id: "REST-001",
    name: "Dona Maria Cozinha Mineira",
    owner: "Maria Oliveira",
    rating: 4.8,
    orders: 156,
    revenue: 6780.50,
    status: "active"
  },
  {
    id: "REST-002",
    name: "Tempero Goiano",
    owner: "Sebastião Goiás", 
    rating: 4.7,
    orders: 203,
    revenue: 8945.20,
    status: "active"
  },
  {
    id: "REST-003",
    name: "Pizzaria Trem Bom", 
    owner: "Giuseppe Romano",
    rating: 4.6,
    orders: 203,
    revenue: 8945.20,
    status: "active"
  },
  {
    id: "REST-004",
    name: "Pamonharia Central",
    owner: "Antônio Silva",
    rating: 4.9,
    orders: 89,
    revenue: 3456.80,
    status: "pending"
  }
];

export default function AdminDashboard() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      case 'in_transit':
        return <Badge className="bg-sky text-sky-foreground">Em Trânsito</Badge>;
      case 'preparing':
        return <Badge className="bg-warning text-warning-foreground">Preparando</Badge>;
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inativo</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

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
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
            <Button>
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Faturamento Total"
            value={mockStats.totalRevenue}
            prefix="R$ "
            icon={DollarSign}
            description="Receita total mensal"
            trend={{ value: 15.5, isPositive: true }}
            className="bg-gradient-warm text-primary-foreground hover:scale-105 transition-transform duration-200"
          />
          
          <StatsCard
            title="Total de Pedidos"
            value={mockStats.totalOrders}
            icon={ShoppingCart}
            description="Pedidos este mês"
            trend={{ value: 8.2, isPositive: true }}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Restaurantes Ativos"
            value={mockStats.activeRestaurants}
            icon={Store}
            description="Parceiros ativos"
            trend={{ value: 12.1, isPositive: true }}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Entregadores Ativos"
            value={mockStats.activeCouriers}
            icon={Truck}
            description="Entregadores online"
            trend={{ value: -2.3, isPositive: false }}
            className="hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Ticket Médio"
            value={mockStats.avgOrderValue}
            prefix="R$ "
            icon={TrendingUp}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Avaliação Média"
            value={mockStats.avgRating}
            suffix="/5"
            icon={Star}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Taxa Conversão"
            value={mockStats.conversionRate}
            suffix="%"
            icon={Users}
            className="hover:scale-105 transition-transform duration-200"
          />

          <StatsCard
            title="Disputas"
            value={mockStats.disputes}
            icon={AlertTriangle}
            className="hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Pedidos Recentes</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurantes</TabsTrigger>
            <TabsTrigger value="couriers">Entregadores</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pedidos Recentes</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar pedidos..." className="pl-10 w-64" />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <p className="font-semibold">{order.id}</p>
                          {getStatusBadge(order.status)}
                          <span className="text-sm text-muted-foreground">{order.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer} • {order.restaurant} • {order.courier}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R$ {order.value.toFixed(2)}</p>
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
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportsSystem />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <RestaurantSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}