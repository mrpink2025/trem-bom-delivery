import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Phone, MessageCircle, MapPin, Clock, DollarSign, Package, CheckCircle, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderStateMachine } from '@/hooks/useOrderStateMachine';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderStatusManager } from '@/components/orders/OrderStatusManager';
import { RealTimeDelivery } from '@/components/delivery/RealTimeDelivery';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  status: string;
  user_id: string;
  restaurant_id: string;
  total_amount: number;
  items: any;
  delivery_address: any;
  restaurant_address: any;
  stripe_session_id?: string;
  created_at: string;
  estimated_delivery_time?: string;
}

const ORDER_STATUSES = {
  pending_payment: { label: 'Aguardando Pagamento', icon: Clock, color: 'bg-yellow-100 text-yellow-800', progress: 10 },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'bg-green-100 text-green-800', progress: 25 },
  preparing: { label: 'Preparando', icon: Package, color: 'bg-blue-100 text-blue-800', progress: 50 },
  ready: { label: 'Pronto', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800', progress: 65 },
  courier_assigned: { label: 'Entregador Designado', icon: Truck, color: 'bg-blue-100 text-blue-800', progress: 75 },
  en_route_to_store: { label: 'Indo para Loja', icon: Truck, color: 'bg-blue-100 text-blue-800', progress: 80 },
  picked_up: { label: 'Pedido Coletado', icon: Package, color: 'bg-purple-100 text-purple-800', progress: 85 },
  out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'bg-orange-100 text-orange-800', progress: 90 },
  arrived_at_destination: { label: 'Chegou no Destino', icon: MapPin, color: 'bg-green-100 text-green-800', progress: 95 },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'bg-green-100 text-green-800', progress: 100 },
  cancelled: { label: 'Cancelado', icon: Clock, color: 'bg-red-100 text-red-800', progress: 0 },
};

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const {
    order,
    isLoading,
    error,
    getOrderProgress,
    statusLabels,
    statusFlow
  } = useOrderStateMachine(orderId);

  // Verificar sucesso do pagamento via URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';
    const sessionId = urlParams.get('session_id');
    
    if ((paymentSuccess || sessionId) && orderId) {
      if (sessionId) {
        verifyPayment(sessionId);
      } else {
        // Payment was successful, show toast
        toast({
          title: 'Pagamento Confirmado!',
          description: 'Seu pedido foi confirmado e está sendo preparado.',
        });
      }
      // Clean up URL
      navigate(`/tracking/${orderId}`, { replace: true });
    }
  }, [orderId, toast, navigate]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Pagamento confirmado!',
          description: 'Seu pedido foi processado com sucesso.',
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    }
  };

  if (!orderId) {
    return (
      <ErrorState 
        title="ID do pedido inválido"
        description="Não foi possível encontrar o pedido solicitado."
        action={{
          label: "Voltar",
          onClick: () => navigate('/')
        }}
      />
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !order) {
    const errorMessage = error instanceof Error ? error.message : 
                         typeof error === 'string' ? error : 
                         "Não foi possível carregar as informações do pedido.";
    
    return (
      <ErrorState 
        title="Pedido não encontrado"
        description={errorMessage}
        action={{
          label: "Tentar novamente",
          onClick: () => window.location.reload()
        }}
      />
    );
  }

  const progress = getOrderProgress();
  const userRole = profile?.role || 'client';
  
  // Determinar se o usuário pode gerenciar o status
  const canManageStatus = () => {
    if (userRole === 'admin') return true;
    if (userRole === 'seller' && order.restaurant_id) {
      // Verificar se é o dono do restaurante (implementar lógica baseada no owner_id)
      return true;
    }
    if (userRole === 'courier') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Acompanhar Pedido</h1>
            <p className="text-muted-foreground">Pedido #{order.id.substring(0, 8)}</p>
          </div>
        </div>

        {/* Status Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Status Atual</h3>
                <Badge variant="outline" className="mt-1">
                  {statusLabels[order.status] || order.status}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Pedido realizado</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            
            {order.status !== 'cancelled' && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="mb-4" />
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Timeline */}
          <div className="space-y-6">
            <OrderTimeline
              currentStatus={order.status}
              statusHistory={order.status_history}
              createdAt={order.created_at}
              progress={progress}
              statusLabels={statusLabels}
              statusFlow={statusFlow}
            />

            {/* Status Management */}
            <OrderStatusManager
              orderId={order.id}
              userRole={userRole as 'restaurant' | 'courier' | 'admin' | 'client'}
              courierId={user?.id}
            />
          </div>

          {/* Order Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(order.items) ? order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {item.quantity}
                        </p>
                        {item.special_instructions && (
                          <p className="text-sm text-muted-foreground italic">
                            Obs: {item.special_instructions}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground">Itens não disponíveis</p>
                  )}
                  
                  <div className="flex justify-between items-center pt-3 border-t border-border font-semibold">
                    <span>Total</span>
                    <span className="text-lg">R$ {order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {order.delivery_address?.street}, {order.delivery_address?.number}
                  {order.delivery_address?.complement && ` - ${order.delivery_address.complement}`}
                </p>
                <p className="text-muted-foreground">
                  {order.delivery_address?.neighborhood} - {order.delivery_address?.city}
                </p>
                <p className="text-muted-foreground">
                  CEP: {order.delivery_address?.zip_code || order.delivery_address?.zipcode}
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              {order.courier_id && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/chat/${order.id}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat com Entregador
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Show support contact info
                  toast({
                    title: 'Suporte',
                    description: 'Entre em contato pelo WhatsApp: (11) 99999-9999',
                  });
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Suporte
              </Button>
            </div>
          </div>
        </div>

        {/* Real-time delivery tracking for active deliveries */}
        {['courier_assigned', 'en_route_to_store', 'picked_up', 'out_for_delivery', 'arrived_at_destination', 'delivered'].includes(order.status) && (
          <div className="mt-6">
            <RealTimeDelivery orderId={order.id} />
          </div>
        )}
      </div>
    </div>
  );
}
