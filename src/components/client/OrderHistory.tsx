import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock, ShoppingBag, Star, RefreshCw } from "lucide-react";

const mockOrders = [
  {
    id: "#ORD-1001",
    restaurant: "Tempero Goiano",
    items: ["1x Pequi com Frango", "1x Arroz com Pequi"],
    total: 35.90,
    status: "delivered",
    date: "Hoje, 14:30",
    rating: 5
  },
  {
    id: "#ORD-1002",
    restaurant: "Pizzaria Trem Bom",
    items: ["1x Pizza Margherita G", "1x Coca-Cola"],
    total: 42.00,
    status: "delivered",
    date: "Ontem, 19:45",
    rating: 4
  },
  {
    id: "#ORD-1003",
    restaurant: "Pamonharia Central",
    items: ["2x Pamonha Doce", "1x Café Goiano"],
    total: 18.50,
    status: "cancelled",
    date: "2 dias atrás",
    rating: null
  }
];

export function OrderHistory() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
      case 'in_transit':
        return <Badge className="bg-sky text-sky-foreground">Em Trânsito</Badge>;
      case 'preparing':
        return <Badge className="bg-warning text-warning-foreground">Preparando</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-warning fill-warning' : 'text-muted-foreground'}`} 
      />
    ));
  };

  if (mockOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum pedido ainda"
            description="Quando você fizer seu primeiro pedido, ele aparecerá aqui."
            action={{
              label: "Explorar restaurantes",
              onClick: () => console.log("Navigate to restaurants")
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Pedidos
          </CardTitle>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockOrders.map((order) => (
            <div 
              key={order.id} 
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{order.id}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-muted-foreground">{order.restaurant}</p>
                  <p className="text-sm text-muted-foreground">{order.date}</p>
                </div>
                <span className="font-bold">R$ {order.total.toFixed(2)}</span>
              </div>

              <div className="space-y-1 mb-3">
                {order.items.map((item, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    {item}
                  </p>
                ))}
              </div>

              <div className="flex items-center justify-between">
                {order.rating ? (
                  <div className="flex items-center gap-1">
                    {renderStars(order.rating)}
                    <span className="text-sm text-muted-foreground ml-2">
                      Sua avaliação
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {order.status === 'cancelled' ? 'Pedido cancelado' : 'Não avaliado'}
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === 'delivered' && !order.rating && (
                    <Button size="sm" variant="outline">
                      Avaliar
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    Ver detalhes
                  </Button>
                  {order.status === 'delivered' && (
                    <Button size="sm">
                      Pedir novamente
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}