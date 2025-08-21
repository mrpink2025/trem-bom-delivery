import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurant_id: string;
}

interface DeliveryAddress {
  lat: number;
  lng: number;
  street: string;
  number: string;
  city: string;
  state: string;
  zipcode: string;
}

interface RestaurantAddress {
  lat: number;
  lng: number;
}

interface DeliveryQuote {
  subtotal: number;
  delivery_fee: number;
  dynamic_fees: Array<{
    name: string;
    type: string;
    amount: number;
    description: string;
  }>;
  discount: number;
  discount_description?: string;
  subscription_discount: number;
  total: number;
  estimated_time_minutes: number;
  distance_km: number;
  zone_name: string;
}

export function useCheckoutCalculation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<RestaurantAddress | null>(null);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');

  // Buscar carrinho do usuário
  const { data: cartItems, isLoading: isLoadingCart } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          menu_items (
            id,
            name,
            price,
            restaurant_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      return data?.map(item => ({
        id: item.menu_item_id,
        name: item.menu_items?.name || '',
        price: item.menu_items?.price || 0,
        quantity: item.quantity,
        restaurant_id: item.menu_items?.restaurant_id || ''
      })) || [];
    },
    enabled: !!user?.id,
  });

  // Buscar endereço do restaurante
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', cartItems?.[0]?.restaurant_id],
    queryFn: async () => {
      if (!cartItems?.[0]?.restaurant_id) return null;
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('address')
        .eq('id', cartItems[0].restaurant_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!cartItems?.[0]?.restaurant_id,
  });

  // Calcular cotação de entrega
  const {
    data: quote,
    isLoading: isLoadingQuote,
    error: quoteError,
    refetch: recalculateQuote
  } = useQuery({
    queryKey: ['delivery-quote', deliveryAddress, restaurantAddress, cart, appliedCoupon],
    queryFn: async (): Promise<DeliveryQuote> => {
      if (!deliveryAddress || !restaurantAddress || cart.length === 0) {
        throw new Error('Dados incompletos para calcular frete');
      }

      const { data, error } = await supabase.functions.invoke('calculate-quote', {
        body: {
          origin: restaurantAddress,
          destination: deliveryAddress,
          cart,
          coupon_code: appliedCoupon || undefined,
          user_id: user?.id
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    enabled: !!deliveryAddress && !!restaurantAddress && cart.length > 0,
    retry: false,
  });

  // Mutação para aplicar cupom
  const applyCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!deliveryAddress || !restaurantAddress || cart.length === 0) {
        throw new Error('Complete os dados do pedido primeiro');
      }

      const { data, error } = await supabase.functions.invoke('calculate-quote', {
        body: {
          origin: restaurantAddress,
          destination: deliveryAddress,
          cart,
          coupon_code: code,
          user_id: user?.id
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return { code, quote: data };
    },
    onSuccess: (data) => {
      setAppliedCoupon(data.code);
      setCouponCode('');
      queryClient.setQueryData(
        ['delivery-quote', deliveryAddress, restaurantAddress, cart, data.code], 
        data.quote
      );
      toast({
        title: 'Cupom aplicado!',
        description: data.quote.discount_description || 'Desconto aplicado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aplicar cupom',
        description: error.message || 'Cupom inválido',
        variant: 'destructive',
      });
    }
  });

  // Buscar planos de assinatura
  const { data: subscriptionPlans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  // Buscar assinatura do usuário
  const { data: userSubscription } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Atualizar states quando dados mudarem
  useEffect(() => {
    if (cartItems) {
      setCart(cartItems);
    }
  }, [cartItems]);

  useEffect(() => {
    if (restaurant?.address) {
      const address = restaurant.address as any;
      setRestaurantAddress({
        lat: address.lat || -23.550520,
        lng: address.lng || -46.633308
      });
    }
  }, [restaurant]);

  const applyCoupon = (code: string) => {
    if (!code.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um código de cupom válido',
        variant: 'destructive',
      });
      return;
    }
    applyCouponMutation.mutate(code.trim().toUpperCase());
  };

  const removeCoupon = () => {
    setAppliedCoupon('');
    queryClient.invalidateQueries({ 
      queryKey: ['delivery-quote', deliveryAddress, restaurantAddress, cart, ''] 
    });
    toast({
      title: 'Cupom removido',
      description: 'O desconto foi removido do seu pedido',
    });
  };

  const updateDeliveryAddress = (address: DeliveryAddress) => {
    setDeliveryAddress(address);
  };

  return {
    // Data
    cart,
    quote,
    subscriptionPlans,
    userSubscription,
    deliveryAddress,
    
    // Loading states
    isLoadingCart,
    isLoadingQuote,
    isApplyingCoupon: applyCouponMutation.isPending,
    
    // Error states
    quoteError,
    
    // Coupon management
    couponCode,
    setCouponCode,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    
    // Address management
    updateDeliveryAddress,
    
    // Actions
    recalculateQuote,
  };
}