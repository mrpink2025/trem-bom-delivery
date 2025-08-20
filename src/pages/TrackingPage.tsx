import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RealTimeDelivery } from '@/components/delivery/RealTimeDelivery';
import { OrderStatusUpdater } from '@/components/orders/OrderStatusUpdater';
import { ArrowLeft, Package, Clock, CheckCircle, Truck, MapPin, Phone, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  ready: { label: 'Pronto', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800', progress: 75 },
  out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'bg-orange-100 text-orange-800', progress: 90 },
  delivered: { label: 'Entregue', icon: MapPin, color: 'bg-green-100 text-green-800', progress: 100 },
  cancelled: { label: 'Cancelado', icon: Clock, color: 'bg-red-100 text-red-800', progress: 0 },
};

const TrackingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { order, loading, error } = useOrderTracking(orderId || '');

  // Check if payment was successful (from URL params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success' && orderId) {
      verifyPayment();
    }
  }, [orderId]);

  const verifyPayment = async () => {
    if (!orderId) return;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('stripe_session_id')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData?.stripe_session_id) return;

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: orderData.stripe_session_id },
      });

      if (error) throw error;

      if (data.paid) {
        toast({
          title: 'Pagamento confirmado!',
          description: 'Seu pedido foi confirmado e está sendo preparado.',
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    // Status will be updated via realtime subscription in the hook
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pedido não encontrado</h1>
          <p className="text-muted-foreground mb-4">ID do pedido inválido ou não fornecido</p>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="h-48 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pedido não encontrado</h1>
          <p className="text-muted-foreground mb-4">O pedido solicitado não existe</p>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
  const StatusIcon = currentStatus?.icon || Clock;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Acompanhar Pedido</h1>
              <p className="text-muted-foreground">#{orderId.slice(-8)}</p>
            </div>
            <Badge className={currentStatus?.color || 'bg-gray-100 text-gray-800'}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {currentStatus?.label || order.status}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso do Pedido</span>
                <span>{currentStatus?.progress || 0}%</span>
              </div>
              <Progress value={currentStatus?.progress || 0} className="h-2" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {Object.entries(ORDER_STATUSES).map(([key, status]) => {
                  const isActive = key === order.status;
                  const isPassed = (status.progress || 0) <= (currentStatus?.progress || 0);
                  return (
                    <div 
                      key={key}
                      className={`flex flex-col items-center p-2 rounded ${
                        isActive ? 'bg-primary/10 text-primary' : 
                        isPassed ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      <status.icon className="w-4 h-4 mb-1" />
                      <span className="text-center leading-tight">{status.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Itens do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(order.items) ? order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {item.quantity}
                        </p>
                        {item.special_instructions && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Obs: {item.special_instructions}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)} cada</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground">Itens não disponíveis</p>
                  )}
                  
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>R$ {order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {order.delivery_address.street}, {order.delivery_address.number}
                  </p>
                  {order.delivery_address.complement && (
                    <p className="text-sm text-muted-foreground">
                      {order.delivery_address.complement}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {order.delivery_address.neighborhood}, {order.delivery_address.city} - {order.delivery_address.state}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    CEP: {order.delivery_address.zipcode}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Order Status Updater for Restaurant/Courier/Admin */}
            {profile && ['restaurant', 'courier', 'admin'].includes(profile.role) && (
              <div className="p-4 border rounded-lg bg-muted/20">
                <h3 className="font-semibold mb-2">Gerenciar Status</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Use as opções abaixo para atualizar o status do pedido.
                </p>
                <Badge className={currentStatus?.color || 'bg-gray-100 text-gray-800'}>
                  Status Atual: {currentStatus?.label || order.status}
                </Badge>
              </div>
            )}

            {/* Real-time Delivery Tracking */}
            {order.status === 'out_for_delivery' && orderId && (
              <RealTimeDelivery orderId={orderId} />
            )}
          </div>

          {/* Right Column - Order Info */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Data do Pedido:</span>
                    <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Horário:</span>
                    <span>{new Date(order.created_at).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tempo estimado:</span>
                     <span>
                       {order.estimated_delivery_time ? 
                         formatDistanceToNow(new Date(order.estimated_delivery_time), {
                           locale: ptBR,
                           addSuffix: false,
                         }) : 'Não definido'
                       }
                     </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Store className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Restaurante</p>
                    <p className="text-sm text-muted-foreground">Entre em contato para dúvidas</p>
                  </div>
                </div>
                
                {order.status === 'out_for_delivery' && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Truck className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Entregador</p>
                      <p className="text-sm text-muted-foreground">A caminho da sua localização</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle>Precisa de ajuda?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Entre em contato conosco se tiver alguma dúvida sobre seu pedido.
                </p>
                <Button variant="outline" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Falar com Suporte
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;