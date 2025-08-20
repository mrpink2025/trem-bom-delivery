import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  DollarSign, 
  Package, 
  CheckCircle2,
  Phone,
  Route
} from "lucide-react";

const mockDeliveries = [
  {
    id: "#DEL-001",
    restaurant: "Dona Maria Cozinha Mineira",
    customer: "João Silva",
    customerAddress: "Rua das Flores, 123 - Savassi",
    restaurantAddress: "Av. Getúlio Vargas, 456 - Centro",
    distance: "2.3 km",
    payment: 8.50,
    status: "available",
    estimatedTime: "25 min"
  },
  {
    id: "#DEL-002", 
    restaurant: "Pizzaria Trem Bom",
    customer: "Maria Santos",
    customerAddress: "Rua da Paz, 789 - Funcionários",
    restaurantAddress: "Av. Afonso Pena, 321 - Centro",
    distance: "1.8 km",
    payment: 6.00,
    status: "in_progress",
    estimatedTime: "15 min"
  }
];

export default function CourierDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [deliveries, setDeliveries] = useState(mockDeliveries);

  const todayStats = {
    deliveries: 12,
    earnings: 89.50,
    distance: 45.2,
    rating: 4.9
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-success text-success-foreground">Disponível</Badge>;
      case 'in_progress':
        return <Badge className="bg-sky text-sky-foreground">Em Andamento</Badge>;
      case 'completed':
        return <Badge variant="secondary">Concluída</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const acceptDelivery = (deliveryId: string) => {
    setDeliveries(deliveries.map(delivery => 
      delivery.id === deliveryId ? { ...delivery, status: 'in_progress' } : delivery
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-8">
        
        {/* Status Header */}
        <Card className={`${isOnline ? 'bg-gradient-fresh' : 'bg-muted'} text-foreground`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Carlos Entregador</h2>
                <p className="text-sm opacity-90">
                  {isOnline ? 'Online • Disponível para entregas' : 'Offline • Não recebendo pedidos'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <Switch
                  checked={isOnline}
                  onCheckedChange={setIsOnline}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entregas</p>
                  <p className="text-2xl font-bold">{todayStats.deliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ganhos</p>
                  <p className="text-2xl font-bold">R$ {todayStats.earnings.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-sky/10 rounded-lg">
                  <Route className="w-5 h-5 text-sky" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Distância</p>
                  <p className="text-2xl font-bold">{todayStats.distance} km</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avaliação</p>
                  <p className="text-2xl font-bold">{todayStats.rating} ⭐</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Deliveries */}
        {isOnline && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-success" />
                <span>Entregas Disponíveis</span>
                <Badge variant="secondary">
                  {deliveries.filter(d => d.status === 'available').length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveries.filter(delivery => delivery.status === 'available').map((delivery) => (
                <div key={delivery.id} className="p-4 border rounded-lg space-y-4 animate-bounce-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{delivery.id}</p>
                      <p className="text-sm text-muted-foreground">{delivery.restaurant}</p>
                    </div>
                    {getStatusBadge(delivery.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">Retirada:</span>
                      </div>
                      <p className="text-sm pl-6">{delivery.restaurantAddress}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span className="font-medium">Entrega:</span>
                      </div>
                      <p className="text-sm pl-6">{delivery.customerAddress}</p>
                      <p className="text-xs text-muted-foreground pl-6">Cliente: {delivery.customer}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Route className="w-4 h-4 text-muted-foreground" />
                        <span>{delivery.distance}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{delivery.estimatedTime}</span>
                      </div>
                      <div className="flex items-center space-x-1 font-bold text-success">
                        <DollarSign className="w-4 h-4" />
                        <span>R$ {delivery.payment.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Ver Rota
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => acceptDelivery(delivery.id)}
                      >
                        Aceitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Current Delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-sky" />
              <span>Entrega Atual</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.filter(delivery => delivery.status === 'in_progress').length > 0 ? (
              <div className="space-y-4">
                {deliveries.filter(delivery => delivery.status === 'in_progress').map((delivery) => (
                  <div key={delivery.id} className="p-4 border-2 border-sky rounded-lg space-y-4 bg-sky/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{delivery.id}</p>
                        <p className="text-sm text-muted-foreground">{delivery.restaurant}</p>
                      </div>
                      {getStatusBadge(delivery.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium">Retirada:</span>
                        </div>
                        <p className="text-sm pl-6">{delivery.restaurantAddress}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="w-4 h-4 text-accent" />
                          <span className="font-medium">Entrega:</span>
                        </div>
                        <p className="text-sm pl-6">{delivery.customerAddress}</p>
                        <p className="text-xs text-muted-foreground pl-6">Cliente: {delivery.customer}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="w-4 h-4 mr-2" />
                        Ligar Cliente
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Navigation className="w-4 h-4 mr-2" />
                        Navegar
                      </Button>
                      <Button size="sm" className="flex-1">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirmar Entrega
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma entrega em andamento</p>
                {!isOnline && (
                  <p className="text-sm mt-2">Ative o status online para receber entregas</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}