import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeliveryMap } from '@/components/map/DeliveryMap';
import { useRealtimeDelivery } from '@/hooks/useRealtimeDelivery';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { MapPin, Clock, Phone, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RealTimeDeliveryProps {
  orderId: string;
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'secondary' as const },
  confirmed: { label: 'Confirmado', color: 'default' as const },
  preparing: { label: 'Preparando', color: 'default' as const },
  ready: { label: 'Pronto', color: 'default' as const },
  picked_up: { label: 'Coletado', color: 'default' as const },
  on_way: { label: 'A caminho', color: 'default' as const },
  delivered: { label: 'Entregue', color: 'default' as const },
  cancelled: { label: 'Cancelado', color: 'destructive' as const },
};

export const RealTimeDelivery = ({ orderId }: RealTimeDeliveryProps) => {
  const { order, tracking, currentLocation, loading, error, updateOrderStatus } = useRealtimeDelivery(orderId);

  if (loading) {
    return <LoadingScreen message="Carregando informações da entrega..." />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {error || 'Pedido não encontrado'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const restaurantAddress = order.restaurant_address as any;
  const deliveryAddress = order.delivery_address as any;
  const status = statusConfig[order.status as keyof typeof statusConfig];

  return (
    <div className="min-h-screen bg-gradient-warm p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Pedido #{order.id.slice(0, 8)}</CardTitle>
              <Badge variant={status.color}>{status.label}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {formatDistanceToNow(new Date(order.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{deliveryAddress.street}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total: R$ {order.total_amount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>Acompanhar Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryMap
              orderId={orderId}
              restaurantLocation={{ 
                lat: restaurantAddress.lat, 
                lng: restaurantAddress.lng 
              }}
              deliveryLocation={{ 
                lat: deliveryAddress.lat, 
                lng: deliveryAddress.lng 
              }}
              courierLocation={currentLocation || undefined}
              className="w-full h-96 rounded-lg"
            />
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(order.items as any[]).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qtd: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tracking History */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Rastreamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tracking.length > 0 ? (
                  tracking.map((point, index) => (
                    <div key={point.id} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm">
                          Localização atualizada
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(point.timestamp), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum ponto de rastreamento ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        {order.courier_id && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="flex-1" variant="outline">
                  <Phone className="w-4 h-4 mr-2" />
                  Ligar para Entregador
                </Button>
                {order.status === 'out_for_delivery' && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateOrderStatus('delivered')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Recebimento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};