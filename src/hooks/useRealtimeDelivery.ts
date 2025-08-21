import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type DeliveryTracking = Database['public']['Tables']['delivery_tracking']['Row'];

interface DeliveryState {
  order: Order | null;
  tracking: DeliveryTracking[];
  currentLocation: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
}

export const useRealtimeDelivery = (orderId: string) => {
  const [state, setState] = useState<DeliveryState>({
    order: null,
    tracking: [],
    currentLocation: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let orderChannel: any;
    let trackingChannel: any;

    const setupRealtimeSubscriptions = async () => {
      try {
        // Fetch initial order data
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (orderError) throw orderError;

        // Fetch initial tracking data
        const { data: tracking, error: trackingError } = await supabase
          .from('delivery_tracking')
          .select('*')
          .eq('order_id', orderId)
          .order('timestamp', { ascending: false });

        if (trackingError) throw trackingError;

        const currentLocation = tracking && tracking.length > 0 
          ? { lat: Number(tracking[0].latitude), lng: Number(tracking[0].longitude) }
          : null;

        setState({
          order,
          tracking: tracking || [],
          currentLocation,
          loading: false,
          error: null,
        });

        // Setup real-time subscriptions
        orderChannel = supabase
          .channel('order-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `id=eq.${orderId}`,
            },
            (payload) => {
              setState(prev => ({
                ...prev,
                order: payload.new as Order,
              }));
            }
          )
          .subscribe();

        trackingChannel = supabase
          .channel('tracking-updates')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'delivery_tracking',
              filter: `order_id=eq.${orderId}`,
            },
            (payload) => {
              const newTracking = payload.new as DeliveryTracking;
              setState(prev => ({
                ...prev,
                tracking: [newTracking, ...prev.tracking],
                currentLocation: {
                  lat: Number(newTracking.latitude),
                  lng: Number(newTracking.longitude),
                },
              }));
            }
          )
          .subscribe();

      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }));
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (trackingChannel) supabase.removeChannel(trackingChannel);
    };
  }, [orderId]);

  const updateOrderStatus = async (status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const addTrackingPoint = async (lat: number, lng: number) => {
    if (!state.order?.courier_id) return;

    try {
      const { error } = await supabase
        .from('delivery_tracking')
        .insert({
          order_id: orderId,
          courier_id: state.order.courier_id,
          latitude: lat,
          longitude: lng,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding tracking point:', error);
    }
  };

  return {
    ...state,
    updateOrderStatus,
    addTrackingPoint,
  };
};