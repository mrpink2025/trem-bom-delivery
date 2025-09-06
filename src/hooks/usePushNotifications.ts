import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: Date;
  read: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported && user) {
      checkExistingSubscription();
      // loadNotificationHistory(); // TODO: Fix notifications table column error
      setupRealtimeSubscription();
    }
    
    setLoading(false);
  }, [user]);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setSubscription(subscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Load notification history from database
  const loadNotificationHistory = async () => {
    if (!user) return;

    // TODO: Fix notifications table - temporarily disabled due to column error
    console.log('Notifications temporarily disabled');
    return;

    /*
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      const mappedNotifications: PushNotification[] = data.map(n => ({
        id: n.id,
        title: n.title,
        body: n.message,
        data: n.data as Record<string, any> || {},
        timestamp: new Date(n.created_at),
        read: n.read
      }));

      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error in loadNotificationHistory:', error);
    }
    */
  };

  // Setup real-time subscription for new notifications
  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('user_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification: PushNotification = {
            id: payload.new.id,
            title: payload.new.title,
            body: payload.new.body,
            data: payload.new.data,
            timestamp: new Date(payload.new.sent_at),
            read: false
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast for real-time notification
          toast({
            title: newNotification.title,
            description: newNotification.body,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const subscribe = async (): Promise<boolean> => {
    if (!user || !isSupported) return false;

    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        toast({
          title: "Permissão negada",
          description: "Não foi possível ativar as notificações push.",
          variant: "destructive",
        });
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key (you'll need to replace this with your actual key)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8TqbjK4CUhX_F0XLQjhEIIxJp4ftxe2LcJJIq-tOIq_F0Urn_W1HijOo';

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
      });

      // Save subscription to database via edge function
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'register',
          user_id: user.id,
          subscription: {
            endpoint: pushSubscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(pushSubscription.getKey('auth')!)
            }
          },
          platform: getDeviceType()
        }
      });

      if (error) throw error;

      setSubscription(pushSubscription);
      setIsSubscribed(true);

      toast({
        title: "Notificações ativadas! 🔔",
        description: "Você receberá atualizações sobre seus pedidos.",
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Erro ao ativar notificações",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Notificação de Teste 🚚',
          body: 'Esta é uma notificação de teste do Trem Bão Delivery!',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          },
          category: 'test'
        }
      });

      if (error) throw error;

      toast({
        title: "Teste Enviado",
        description: "Notificação de teste enviada com sucesso",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Erro no Teste",
        description: "Falha ao enviar notificação de teste",
        variant: "destructive",
      });
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();
      
      // Remove from Supabase
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user?.id)
        .eq('endpoint', subscription.endpoint);

      setSubscription(null);
      setIsSubscribed(false);

      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais notificações push.",
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Erro ao desativar notificações",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    notifications,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification,
    markAsRead,
    clearAllNotifications
  };
};

// Utility functions
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return window.btoa(binary);
}

function getDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  return 'web';
}