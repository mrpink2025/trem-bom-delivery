import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <Card className="bg-gradient-warm text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/80">Faturamento Total</p>
                  <p className="text-3xl font-bold">R$ {mockStats.totalRevenue.toLocaleString('pt-BR')}</p>
                </div>
                <DollarSign className="w-10 h-10 text-primary-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Total de Pedidos</p>
                  <p className="text-3xl font-bold">{mockStats.totalOrders.toLocaleString('pt-BR')}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Restaurantes Ativos</p>
                  <p className="text-3xl font-bold">{mockStats.activeRestaurants}</p>
                </div>
                <Store className="w-10 h-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Entregadores Ativos</p>
                  <p className="text-3xl font-bold">{mockStats.activeCouriers}</p>
                </div>
                <Truck className="w-10 h-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg font-bold">R$ {mockStats.avgOrderValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Avaliação Média</p>
                  <p className="text-lg font-bold">{mockStats.avgRating} ⭐</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-sky" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                  <p className="text-lg font-bold">{mockStats.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Disputas</p>
                  <p className="text-lg font-bold">{mockStats.disputes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Pedidos Recentes</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurantes</TabsTrigger>
            <TabsTrigger value="couriers">Entregadores</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gestão de Restaurantes</CardTitle>
                  <Button>Adicionar Restaurante</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRestaurants.map((restaurant) => (
                    <div key={restaurant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <p className="font-semibold">{restaurant.name}</p>
                          {getStatusBadge(restaurant.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Proprietário: {restaurant.owner} • {restaurant.rating} ⭐ • {restaurant.orders} pedidos
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold">R$ {restaurant.revenue.toLocaleString('pt-BR')}</p>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">Editar</Button>
                          <Button variant="ghost" size="sm">Ver Detalhes</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="couriers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Entregadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Funcionalidade em desenvolvimento</p>
                  <p className="text-sm">Em breve você poderá gerenciar todos os entregadores</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Avançados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Dashboard de Analytics</p>
                  <p className="text-sm">Gráficos e relatórios detalhados em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}