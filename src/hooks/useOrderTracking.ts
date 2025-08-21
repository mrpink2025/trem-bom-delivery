import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  status: string;
  user_id: string;
  restaurant_id: string;
  courier_id?: string;
  total_amount: number;
  items: any;
  delivery_address: any;
  restaurant_address: any;
  pickup_location?: any;
  delivery_location?: any;
  stripe_session_id?: string;
  created_at: string;
  updated_at: string;
  estimated_delivery_time?: string;
}

export function useOrderTracking(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Order not found');

      setOrder(data as Order);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!orderId) return;

    loadOrder();

    const channel = supabase
      .channel(`order_tracking_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order realtime update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrder(updatedOrder);
            
            // Show notification for status changes
            if (payload.old?.status !== updatedOrder.status) {
              const statusLabels: Record<string, string> = {
                pending_payment: 'Aguardando Pagamento',
                confirmed: 'Confirmado',
                preparing: 'Preparando',
                ready: 'Pronto para Entrega',
                out_for_delivery: 'Saiu para Entrega',
                delivered: 'Entregue',
                cancelled: 'Cancelado',
              };

              toast({
                title: 'Status do Pedido Atualizado',
                description: `Seu pedido foi atualizado para: ${statusLabels[updatedOrder.status] || updatedOrder.status}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, toast]);

  const updateOrderStatus = async (newStatus: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled') => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'Status do pedido atualizado com sucesso',
      });
    } catch (err) {
      console.error('Error updating order status:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status do pedido',
        variant: 'destructive',
      });
    }
  };

  return {
    order,
    loading,
    error,
    updateOrderStatus,
    refresh: loadOrder,
  };
}