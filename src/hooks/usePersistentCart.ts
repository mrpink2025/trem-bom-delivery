import { useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const CART_STORAGE_KEY = 'delivery_cart_data';
const CART_EXPIRY_HOURS = 24;

export const usePersistentCart = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  // Save cart to localStorage and Supabase
  useEffect(() => {
    if (items.length > 0) {
      // Save to localStorage
      const cartData = {
        items,
        timestamp: Date.now(),
        expiresAt: Date.now() + (CART_EXPIRY_HOURS * 60 * 60 * 1000)
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));

      // Save to Supabase if user is authenticated
      if (user) {
        saveCartToSupabase(cartData);
      }
    } else {
      // Clear storage when cart is empty
      localStorage.removeItem(CART_STORAGE_KEY);
      if (user) {
        clearSavedCart();
      }
    }
  }, [items, user]);

  // Load cart from localStorage on app start
  useEffect(() => {
    const loadSavedCart = () => {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!savedCart) return;

      try {
        const cartData = JSON.parse(savedCart);
        const now = Date.now();
        
        // Check if cart has expired
        if (now > cartData.expiresAt) {
          localStorage.removeItem(CART_STORAGE_KEY);
          return;
        }

        // Check if cart is older than 1 hour to show abandonment notification
        if (now - cartData.timestamp > (60 * 60 * 1000) && items.length === 0) {
          showAbandonmentNotification();
        }
      } catch (error) {
        console.error('Error loading saved cart:', error);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    };

    loadSavedCart();
  }, []);

  // Sync cart with Supabase on user login
  useEffect(() => {
    if (user) {
      syncCartWithSupabase();
    }
  }, [user]);

  const saveCartToSupabase = async (cartData: any) => {
    if (!user) return;

    try {
      const expiresAt = new Date(cartData.expiresAt).toISOString();
      
      await supabase
        .from('saved_carts')
        .upsert({
          user_id: user.id,
          cart_data: cartData,
          expires_at: expiresAt,
          notification_sent: false
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.error('Error saving cart to Supabase:', error);
    }
  };

  const clearSavedCart = async () => {
    if (!user) return;

    try {
      await supabase
        .from('saved_carts')
        .delete()
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error clearing saved cart:', error);
    }
  };

  const syncCartWithSupabase = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('saved_carts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && new Date(data.expires_at) > new Date()) {
        const localCart = localStorage.getItem(CART_STORAGE_KEY);
        
        // If no local cart, restore from server
        if (!localCart && data.cart_data && typeof data.cart_data === 'object' && 'items' in data.cart_data && Array.isArray((data.cart_data as any).items) && (data.cart_data as any).items.length > 0) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data.cart_data));
          toast({
            title: "Carrinho restaurado",
            description: "Encontramos itens salvos no seu carrinho!",
          });
        }
      }
    } catch (error) {
      console.error('Error syncing cart with Supabase:', error);
    }
  };

  const showAbandonmentNotification = () => {
    toast({
      title: "Carrinho abandonado",
      description: "Você tem itens salvos no seu carrinho. Que tal finalizar o pedido?",
      duration: 8000,
    });
  };

  return {
    saveCartToSupabase,
    clearSavedCart,
    syncCartWithSupabase
  };
};