import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ConfirmationResult {
  success: boolean;
  error?: string;
  message?: string;
  attempts?: number;
}

export function useDeliveryConfirmation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const getCurrentLocation = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    });
  };

  const confirmDelivery = async (orderId: string, confirmationCode: string): Promise<ConfirmationResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsConfirming(true);
    
    try {
      // Get current location for security audit
      let location = { lat: null, lng: null };
      try {
        const coords = await getCurrentLocation();
        location = { lat: coords.lat, lng: coords.lng };
      } catch (error) {
        console.warn('Could not get location for delivery confirmation:', error);
      }

      const { data, error } = await supabase.functions.invoke('delivery-confirmation', {
        body: {
          order_id: orderId,
          confirmation_code: confirmationCode.trim(),
          location_lat: location.lat,
          location_lng: location.lng
        }
      });

      if (error) {
        console.error('Delivery confirmation error:', error);
        throw new Error(error.message || 'Failed to confirm delivery');
      }

      const result = data as ConfirmationResult;
      
      if (result.success) {
        toast({
          title: "Entrega Confirmada!",
          description: "O pedido foi entregue com sucesso.",
          variant: "default"
        });
        setAttempts(0);
      } else {
        setAttempts(result.attempts || 0);
        toast({
          title: "Código Incorreto",
          description: result.error || "Verifique o código com o cliente.",
          variant: "destructive"
        });
      }

      return result;
    } catch (error: any) {
      console.error('Delivery confirmation failed:', error);
      const errorMessage = error.message || 'Erro ao confirmar entrega';
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });

      return { success: false, error: errorMessage };
    } finally {
      setIsConfirming(false);
    }
  };

  return {
    confirmDelivery,
    isConfirming,
    attempts
  };
}