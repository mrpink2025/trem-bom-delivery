import React, { useState, useEffect } from 'react';
import { Navigation, Phone, MessageCircle, Camera, CheckCircle, MapPin, Clock, DollarSign, Package, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliveryTracking } from '@/hooks/useDeliveryTracking';
import { DeliveryConfirmationDialog } from './DeliveryConfirmationDialog';

interface ActiveOrder {
  id: string;
  status: string;
  restaurant: {
    name: string;
    location: any;
    phone?: string;
  };
  customer: {
    name: string;
    phone?: string;
  };
  customer_phone?: string;
  delivery_address: any;
  items: any[];
  total_amount: number;
  delivery_fee: number;
  estimated_delivery_time?: string;
}

interface ActiveDeliveryTrackerProps {
  orderId: string;
}

export function ActiveDeliveryTracker({ orderId }: ActiveDeliveryTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  const {
    locations,
    currentLocation,
    isTracking,
    startTracking,
    stopTracking,
    updateDeliveryStatus
  } = useDeliveryTracking({ orderId });

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
  }, [orderId]);

  useEffect(() => {
    // Auto-start tracking when component loads
    if (order && !isTracking) {
      startTracking();
    }
    
    return () => {
      stopTracking();
    };
  }, [order]);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          delivery_address,
          total_amount,
          estimated_delivery_time,
          user_id,
          restaurants(
            name,
            location,
            phone
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Get customer profile separately
      let customerPhone = undefined;
      if (data.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('phone_number, phone_verified')
          .eq('user_id', data.user_id)
          .single();
        
        customerPhone = profileData?.phone_number;
      }

      setOrder({
        id: data.id,
        status: data.status,
        restaurant: {
          name: data.restaurants?.name || 'Restaurante',
          location: data.restaurants?.location,
          phone: data.restaurants?.phone
        },
        customer: {
          name: 'Cliente',
          phone: customerPhone
        },
        customer_phone: customerPhone,
        delivery_address: data.delivery_address,
        items: [], // Simplified for now
        total_amount: data.total_amount,
        delivery_fee: 500, // Default delivery fee in cents
        estimated_delivery_time: data.estimated_delivery_time
      });
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do pedido.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: "picked_up" | "in_transit" | "delivered") => {
    setUpdating(true);
    try {
      await updateDeliveryStatus(newStatus);
      
      // Update local state
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      
      const statusMessages = {
        'picked_up': 'Pedido coletado no restaurante',
        'in_transit': 'A caminho do cliente',
        'delivered': 'Pedido entregue com sucesso'
      };
      
      toast({
        title: "Status atualizado!",
        description: statusMessages[newStatus],
      });
      
      // If delivered, stop tracking
      if (newStatus === 'delivered') {
        stopTracking();
      }
      
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case 'confirmed': return 25;
      case 'preparing': return 50;
      case 'ready': return 65;
      case 'picked_up': return 75;
      case 'in_transit': return 90;
      case 'delivered': return 100;
      default: return 0;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'picked_up': return 'Coletado';
      case 'in_transit': return 'A caminho';
      case 'delivered': return 'Entregue';
      default: return status;
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return 'Endereço não disponível';
    return `${address.street}, ${address.number} - ${address.neighborhood}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando pedido...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma entrega ativa</h3>
          <p className="text-muted-foreground">
            Aceite uma corrida para começar a entrega
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pedido #{order.id.slice(-8)}</CardTitle>
            <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
              {getStatusLabel(order.status)}
            </Badge>
          </div>
          <Progress value={getProgressValue(order.status)} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="font-semibold">R$ {(order.total_amount / 100).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total do Pedido</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Package className="h-4 w-4" />
              </div>
              <div className="font-semibold">{order.items.length}</div>
              <div className="text-xs text-muted-foreground">Itens</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div className="font-semibold text-green-600">
                R$ {(order.delivery_fee / 100).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Sua Taxa</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restaurant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Retirada - {order.restaurant.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {/* Restaurant address would be formatted here */}
              Local de retirada
            </span>
            <div className="flex gap-2">
              {order.restaurant.phone && (
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {order.status === 'ready' && (
            <Button 
              onClick={() => handleStatusUpdate('picked_up')}
              disabled={updating}
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updating ? 'Confirmando...' : 'Confirmar Retirada'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Entrega - {order.customer.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium mb-1">Endereço de Entrega:</div>
            <div className="text-sm text-muted-foreground">
              {formatAddress(order.delivery_address)}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Cliente: {order.customer.name}
            </span>
            <div className="flex gap-2">
              {order.customer.phone && (
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm">
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {order.status === 'picked_up' && (
            <Button 
              onClick={() => handleStatusUpdate('in_transit')}
              disabled={updating}
              className="w-full"
            >
              <Navigation className="w-4 h-4 mr-2" />
              {updating ? 'Confirmando...' : 'Iniciar Entrega'}
            </Button>
          )}
          
          {order.status === 'in_transit' && (
            <Button 
              onClick={() => setShowConfirmationDialog(true)}
              disabled={updating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              Confirmar Entrega
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Delivery Confirmation Dialog */}
      <DeliveryConfirmationDialog
        open={showConfirmationDialog}
        onOpenChange={setShowConfirmationDialog}
        orderId={order.id}
        customerPhone={order.customer_phone}
        onConfirmed={() => {
          // Reload order data to reflect delivery status
          loadOrderData();
        }}
      />

      {/* Tracking Info */}
      {isTracking && currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status do Rastreamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>📍 Localização atualizada em tempo real</div>
              <div>🕐 {locations.length} atualizações de localização</div>
              {currentLocation.eta_minutes && (
                <div>⏱️ ETA: {currentLocation.eta_minutes} minutos</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}