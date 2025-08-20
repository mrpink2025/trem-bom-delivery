import { useState } from "react";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

const mockOrders = [
  {
    id: "#1234",
    customer: "Maria Silva",
    items: ["2x Pamonha Doce", "1x Café Goiano", "1x Curau de Milho"],
    total: 28.50,
    status: "new",
    time: "há 2 min",
    estimatedTime: 25
  },
  {
    id: "#1235", 
    customer: "João Santos",
    items: ["1x Pequi com Frango", "1x Arroz com Pequi", "1x Feijão Tropeiro"],
    total: 35.90,
    status: "preparing",
    time: "há 8 min",
    estimatedTime: 15
  },
  {
    id: "#1236",
    customer: "Ana Oliveira", 
    items: ["1x Pizza Margherita G", "1x Coca-Cola"],
    total: 42.00,
    status: "ready",
    time: "há 20 min",
    estimatedTime: 0
  }
];

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState(mockOrders);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-warning text-warning-foreground">Novo</Badge>;
      case 'preparing':
        return <Badge className="bg-sky text-sky-foreground">Preparando</Badge>;
      case 'ready':
        return <Badge className="bg-success text-success-foreground">Pronto</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const todayStats = {
    totalOrders: 28,
    revenue: 1245.60,
    avgTicket: 44.50,
    pendingOrders: 3
  };

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
                <h2 className="text-xl font-bold mb-1">Tempero Goiano</h2>
                <p className="text-accent-foreground/90">Status: Aberto • Tempo médio: 20-30 min</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  Pausar Pedidos
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
                <Badge variant="secondary">1</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.filter(order => order.status === 'new').map((order) => (
                <div key={order.id} className="p-4 border rounded-lg space-y-3 animate-bounce-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.time}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <p key={index} className="text-sm">{item}</p>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <p className="font-bold">R$ {order.total.toFixed(2)}</p>
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
              ))}
            </CardContent>
          </Card>

          {/* Preparing Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-sky" />
                <span>Em Preparo</span>
                <Badge variant="secondary">1</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.filter(order => order.status === 'preparing').map((order) => (
                <div key={order.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.time}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <p key={index} className="text-sm">{item}</p>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-warning">
                    <Timer className="w-4 h-4" />
                    <span>Tempo estimado: {order.estimatedTime} min</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <p className="font-bold">R$ {order.total.toFixed(2)}</p>
                    <Button 
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                    >
                      Marcar Pronto
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ready Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Prontos</span>
                <Badge variant="secondary">1</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.filter(order => order.status === 'ready').map((order) => (
                <div key={order.id} className="p-4 border rounded-lg space-y-3 bg-success/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.time}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <p key={index} className="text-sm">{item}</p>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <p className="font-bold">R$ {order.total.toFixed(2)}</p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-1" />
                        Ligar
                      </Button>
                      <Button size="sm" variant="success">
                        Entregue
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}