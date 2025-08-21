import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Package, Clock, CheckCircle, Truck, MapPin } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  user_id: string;
  restaurant_id: string;
  total_amount: number;
  items: any[];
  delivery_address: any;
  created_at: string;
  estimated_delivery_time: string;
}

interface OrderStatusUpdaterProps {
  order: Order;
  userRole: 'restaurant' | 'courier' | 'admin';
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
}

const ORDER_STATUSES = {
  pending_payment: { label: 'Aguardando Pagamento', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  preparing: { label: 'Preparando', icon: Package, color: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Pronto', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800' },
  out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Entregue', icon: MapPin, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', icon: Clock, color: 'bg-red-100 text-red-800' },
};

const STATUS_TRANSITIONS = {
  restaurant: {
    confirmed: ['preparing'],
    preparing: ['ready', 'cancelled'],
    ready: [], // Restaurant can't change after ready
  },
  courier: {
    ready: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
  },
  admin: {
    pending_payment: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'cancelled'],
  },
};

export function OrderStatusUpdater({ order, userRole, onStatusUpdate }: OrderStatusUpdaterProps) {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const currentStatus = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
  const StatusIcon = currentStatus?.icon || Clock;
  
  const availableTransitions = STATUS_TRANSITIONS[userRole]?.[order.status as keyof typeof STATUS_TRANSITIONS[typeof userRole]] || [];

  const updateOrderStatus = async (newStatus: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled') => {
    setUpdating(true);
    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Create notification for user
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: order.user_id,
          type: 'order_update',
          title: 'Status do Pedido Atualizado',
          message: `Seu pedido foi atualizado para: ${ORDER_STATUSES[newStatus as keyof typeof ORDER_STATUSES]?.label}`,
          data: {
            order_id: order.id,
            status: newStatus,
            previous_status: order.status,
          },
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't throw error, notification is not critical
      }

      // If out for delivery, start tracking
      if (newStatus === 'out_for_delivery') {
        // You could trigger automatic location tracking here
        console.log('Starting delivery tracking for order:', order.id);
      }

      toast({
        title: 'Status atualizado',
        description: `Pedido atualizado para: ${ORDER_STATUSES[newStatus as keyof typeof ORDER_STATUSES]?.label}`,
      });

      onStatusUpdate?.(order.id, newStatus);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status do pedido',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <StatusIcon className="w-5 h-5" />
          Status do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge className={currentStatus?.color || 'bg-gray-100 text-gray-800'}>
            {currentStatus?.label || order.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            #{order.id.slice(-8)}
          </span>
        </div>

        {availableTransitions.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Atualizar Status:</label>
            <div className="flex gap-2">
              {availableTransitions.map((status) => {
                const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
                return (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    onClick={() => updateOrderStatus(status)}
                    disabled={updating}
                    className="flex items-center gap-2"
                  >
                    {statusInfo?.icon && <statusInfo.icon className="w-4 h-4" />}
                    {statusInfo?.label || status}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-3 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total:</span>
              <p className="font-medium">R$ {order.total_amount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Itens:</span>
              <p className="font-medium">{order.items.length} item(s)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}