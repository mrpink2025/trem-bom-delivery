import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  user_id: string;
  created_at: string;
  read: boolean;
}

interface UseRealtimeNotificationsOptions {
  onNewNotification?: (notification: RealtimeNotification) => void;
  onOrderUpdate?: (order: any) => void;
  onDeliveryUpdate?: (delivery: any) => void;
  autoToast?: boolean;
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const {
    onNewNotification,
    onOrderUpdate,
    onDeliveryUpdate,
    autoToast = true
  } = options;

  const handleNotification = useCallback((notification: RealtimeNotification) => {
    console.log('📬 New realtime notification:', notification);

    // Show toast notification if enabled
    if (autoToast) {
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });
    }

    // Call custom handler
    onNewNotification?.(notification);

    // Handle different notification types
    switch (notification.type) {
      case 'order_status_update':
        onOrderUpdate?.(notification.data);
        break;
      case 'delivery_update':
        onDeliveryUpdate?.(notification.data);
        break;
      case 'restaurant_approved':
        if (autoToast) {
          toast({
            title: "🎉 Restaurante Aprovado!",
            description: "Seu restaurante foi aprovado e já está ativo na plataforma.",
          });
        }
        break;
      case 'payment_confirmed':
        if (autoToast) {
          toast({
            title: "💳 Pagamento Confirmado",
            description: "Seu pagamento foi processado com sucesso.",
          });
        }
        break;
    }
  }, [toast, onNewNotification, onOrderUpdate, onDeliveryUpdate, autoToast]);

  const handleOrderUpdate = useCallback((payload: any) => {
    console.log('📦 Order update received:', payload);
    
    const { new: newOrder, old: oldOrder } = payload;
    
    // Only notify if status changed
    if (newOrder.status !== oldOrder?.status) {
      const statusMessages = {
        confirmed: 'Seu pedido foi confirmado pelo restaurante',
        preparing: 'Seu pedido está sendo preparado',
        ready: 'Seu pedido está pronto para retirada',
        in_transit: 'Seu pedido saiu para entrega',
        delivered: 'Seu pedido foi entregue com sucesso'
      };

      const message = statusMessages[newOrder.status as keyof typeof statusMessages] || 
        `Status do pedido atualizado: ${newOrder.status}`;

      if (autoToast) {
        toast({
          title: `Pedido #${newOrder.id.slice(-8)}`,
          description: message,
        });
      }

      onOrderUpdate?.(newOrder);
    }
  }, [toast, onOrderUpdate, autoToast]);

  const handleDeliveryTracking = useCallback((payload: any) => {
    console.log('🚚 Delivery tracking update:', payload);
    
    const { new: trackingData } = payload;
    
    if (autoToast) {
      toast({
        title: "📍 Localização Atualizada",
        description: "A localização do seu entregador foi atualizada.",
        duration: 3000,
      });
    }

    onDeliveryUpdate?.(trackingData);
  }, [toast, onDeliveryUpdate, autoToast]);

  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up realtime subscriptions for user:', user.id);

    // Create a single channel for all subscriptions
    const channel = supabase.channel(`user-updates-${user.id}`, {
      config: {
        broadcast: { self: true },
        presence: { key: user.id }
      }
    });

    // Subscribe to notifications
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('📬 New notification insert:', payload);
        handleNotification(payload.new as RealtimeNotification);
      }
    );

    // Subscribe to order updates for user's orders
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`
      },
      handleOrderUpdate
    );

    // Subscribe to delivery tracking updates
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_tracking'
      },
      handleDeliveryTracking
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log('📡 Realtime subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to realtime updates');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to realtime channel');
      }
    });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up realtime subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, handleNotification, handleOrderUpdate, handleDeliveryTracking]);

  // Function to manually send a notification (for testing)
  const sendTestNotification = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'test',
          title: 'Teste de Notificação',
          message: 'Esta é uma notificação de teste do sistema em tempo real.',
          data: { test: true }
        });

      if (error) throw error;
      
      console.log('✅ Test notification sent');
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  }, [user]);

  return {
    sendTestNotification,
    isConnected: channelRef.current?.state === 'joined'
  };
}