import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported && user) {
      checkExistingSubscription();
    }
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

      // Get VAPID public key from environment
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8TqbjK4CUhX_F0XLQjhEIIxJp4ftxe2LcJJIq-tOIq_F0Urn_W1HijOo'; // Replace with actual VAPID key

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
      });

      // Save subscription to Supabase
      const { error } = await supabase.functions.invoke('push-notifications', {
        body: {
          type: 'subscribe',
          payload: {
            user_id: user.id,
            subscription: {
              endpoint: pushSubscription.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(pushSubscription.getKey('auth')!)
              }
            },
            device_type: getDeviceType()
          }
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
    subscribe,
    unsubscribe,
    requestPermission
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