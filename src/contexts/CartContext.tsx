import React, { createContext, useContext, useReducer, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface CartItem {
  id: string;
  menu_item_id: string;
  restaurant_id: string;
  quantity: number;
  special_instructions?: string;
  menu_item: {
    name: string;
    price: number;
    image_url?: string;
    restaurant: {
      name: string;
      delivery_fee: number;
    };
  };
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  currentRestaurantId?: string;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; quantity: number; special_instructions?: string } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_RESTAURANT'; payload: string };

const initialState: CartState = {
  items: [],
  loading: false,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity, special_instructions: action.payload.special_instructions }
            : item
        ),
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    case 'CLEAR_CART':
      return { ...state, items: [], currentRestaurantId: undefined };
    case 'SET_RESTAURANT':
      return { ...state, currentRestaurantId: action.payload };
    default:
      return state;
  }
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  currentRestaurantId?: string;
  addToCart: (menuItemId: string, restaurantId: string, quantity?: number, specialInstructions?: string) => Promise<void>;
  updateCartItem: (cartItemId: string, quantity: number, specialInstructions?: string) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getDeliveryFee: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useAuth(); 
  const { toast } = useToast();

  // Persistent cart logic - save to localStorage and Supabase
  useEffect(() => {
    if (state.items.length > 0) {
      // Save to localStorage
      const cartData = {
        items: state.items,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      localStorage.setItem('delivery_cart_data', JSON.stringify(cartData));

      // Save to Supabase if user is authenticated
      if (user) {
        const saveToSupabase = async () => {
          try {
            const expiresAt = new Date(cartData.expiresAt).toISOString();
            
            await supabase
              .from('saved_carts')
              .upsert({
                user_id: user.id,
                cart_data: cartData as any,
                expires_at: expiresAt,
                notification_sent: false
              }, {
                onConflict: 'user_id'
              });
          } catch (error) {
            console.error('Error saving cart to Supabase:', error);
          }
        };
        saveToSupabase();
      }
    } else {
      // Clear storage when cart is empty
      localStorage.removeItem('delivery_cart_data');
      if (user) {
        const clearSupabase = async () => {
          try {
            await supabase
              .from('saved_carts')
              .delete()
              .eq('user_id', user.id);
          } catch (error) {
            console.error('Error clearing saved cart:', error);
          }
        };
        clearSupabase();
      }
    }
  }, [state.items, user]);

  // Load cart items when user logs in
  useEffect(() => {
    if (user) {
      loadCartItems();
    } else {
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [user]);

  const loadCartItems = async () => {
    if (!user) return;

    console.log('🔄 CART CONTEXT - Carregando itens do carrinho para usuário:', user.id);
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          menu_item:menu_items (
            name,
            price,
            image_url,
            restaurant:restaurants (
              name,
              delivery_fee
            )
          )
        `)
        .eq('user_id', user.id);

      console.log('📊 CART CONTEXT - Dados carregados:', { data, error });

      if (error) {
        console.error('❌ CART CONTEXT - Erro ao carregar:', error);
        throw error;
      }

      console.log('✅ CART CONTEXT - Estrutura dos dados:', JSON.stringify(data, null, 2));
      dispatch({ type: 'SET_ITEMS', payload: data || [] });
      
      // Set current restaurant if items exist
      if (data && data.length > 0) {
        console.log('🏪 CART CONTEXT - Definindo restaurante:', data[0].restaurant_id);
        dispatch({ type: 'SET_RESTAURANT', payload: data[0].restaurant_id });
      }
    } catch (error) {
      console.error('❌ CART CONTEXT - Erro completo ao carregar:', error);
      logger.error('Error loading cart', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar carrinho',
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addToCart = async (menuItemId: string, restaurantId: string, quantity = 1, specialInstructions?: string) => {
    console.log('🚀 CART CONTEXT - addToCart chamado:', { 
      menuItemId, 
      restaurantId, 
      quantity, 
      specialInstructions,
      user: user?.id,
      currentRestaurantId: state.currentRestaurantId 
    });
    
    if (!user) {
      console.log('❌ CART CONTEXT - Usuário não logado');
      toast({
        title: 'Login necessário',
        description: 'Faça login para adicionar itens ao carrinho',
        variant: 'destructive',
      });
      return;
    }

    // Check if trying to add from different restaurant
    if (state.currentRestaurantId && state.currentRestaurantId !== restaurantId) {
      console.log('❌ CART CONTEXT - Restaurante diferente:', {
        current: state.currentRestaurantId,
        trying: restaurantId
      });
      toast({
        title: 'Restaurante diferente',
        description: 'Você só pode pedir de um restaurante por vez. Limpe o carrinho para pedir de outro restaurante.',
        variant: 'destructive',
      });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('🔄 CART CONTEXT - Inserindo no Supabase...');
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          menu_item_id: menuItemId,
          restaurant_id: restaurantId,
          quantity,
          special_instructions: specialInstructions,
        })
        .select(`
          *,
          menu_item:menu_items (
            name,
            price,
            image_url,
            restaurant:restaurants (
              name,
              delivery_fee
            )
          )
        `)
        .single();

      console.log('📊 CART CONTEXT - Resposta do Supabase:', { data, error });

      if (error) {
        console.error('❌ CART CONTEXT - Erro do Supabase:', error);
        throw error;
      }

      console.log('✅ CART CONTEXT - Sucesso! Adicionando ao reducer...');
      dispatch({ type: 'ADD_ITEM', payload: data });
      dispatch({ type: 'SET_RESTAURANT', payload: restaurantId });
      
      toast({
        title: 'Item adicionado',
        description: 'Item adicionado ao carrinho com sucesso',
      });
    } catch (error) {
      console.error('❌ CART CONTEXT - Erro completo:', error);
      logger.error('Error adding to cart', error);
      toast({
        title: 'Erro',
        description: `Erro ao adicionar item ao carrinho: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: 'destructive',
      });
      throw error; // Re-throw para o voice assistant capturar
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateCartItem = async (cartItemId: string, quantity: number, specialInstructions?: string) => {
    if (quantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity, special_instructions: specialInstructions })
        .eq('id', cartItemId);

      if (error) throw error;

      dispatch({ type: 'UPDATE_ITEM', payload: { id: cartItemId, quantity, special_instructions: specialInstructions } });
    } catch (error) {
      logger.error('Error updating cart item', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar item do carrinho',
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      dispatch({ type: 'REMOVE_ITEM', payload: cartItemId });
      
      toast({
        title: 'Item removido',
        description: 'Item removido do carrinho',
      });
    } catch (error) {
      logger.error('Error removing from cart', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover item do carrinho',
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearCart = async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      dispatch({ type: 'CLEAR_CART' });
      
      toast({
        title: 'Carrinho limpo',
        description: 'Todos os itens foram removidos do carrinho',
      });
    } catch (error) {
      logger.error('Error clearing cart', error);
      toast({
        title: 'Erro',
        description: 'Erro ao limpar carrinho',
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getCartTotal = () => {
    return state.items.reduce((total, item) => {
      return total + (item.menu_item.price * item.quantity);
    }, 0);
  };

  const getDeliveryFee = () => {
    if (state.items.length === 0) return 0;
    return state.items[0].menu_item.restaurant.delivery_fee;
  };

  const getItemCount = () => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  };

  const value: CartContextType = {
    items: state.items,
    loading: state.loading,
    currentRestaurantId: state.currentRestaurantId,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartTotal,
    getDeliveryFee,
    getItemCount,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}