import { useState, useEffect, useCallback } from 'react';
import Dexie, { Table } from 'dexie';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// IndexedDB Database Schema
interface OfflineRestaurant {
  id: string;
  name: string;
  image_url?: string;
  cuisine_type: string;
  delivery_fee: number;
  minimum_order: number;
  rating: number;
  is_active: boolean;
  cached_at: Date;
}

interface OfflineMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id?: string;
  is_available: boolean;
  cached_at: Date;
}

interface OfflineCartItem {
  id: string;
  user_id: string;
  menu_item_id: string;
  restaurant_id: string;
  quantity: number;
  special_instructions?: string;
  pending_sync: boolean;
  created_at: Date;
  updated_at: Date;
}

interface OfflineChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content?: string;
  message_type: string;
  pending_sync: boolean;
  created_at: Date;
}

interface OfflineAction {
  id: string;
  type: 'create_order' | 'update_cart' | 'send_message' | 'update_profile';
  data: any;
  user_id: string;
  created_at: Date;
  retries: number;
  last_error?: string;
}

class OfflineDatabase extends Dexie {
  restaurants!: Table<OfflineRestaurant>;
  menuItems!: Table<OfflineMenuItem>;
  cartItems!: Table<OfflineCartItem>;
  chatMessages!: Table<OfflineChatMessage>;
  pendingActions!: Table<OfflineAction>;

  constructor() {
    super('TremBomDeliveryOfflineDB');
    
    this.version(1).stores({
      restaurants: 'id, name, cuisine_type, cached_at',
      menuItems: 'id, restaurant_id, name, cached_at',
      cartItems: 'id, user_id, menu_item_id, restaurant_id, pending_sync',
      chatMessages: 'id, room_id, sender_id, pending_sync, created_at',
      pendingActions: 'id, type, user_id, created_at, retries'
    });
  }
}

const db = new OfflineDatabase();

export const useOfflineStorage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) {
        syncPendingActions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Modo Offline",
        description: "Você está offline. Suas ações serão sincronizadas quando voltar online.",
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      updatePendingActionsCount();
    }
  }, [user]);

  const updatePendingActionsCount = async () => {
    if (!user) return;
    
    try {
      const count = await db.pendingActions
        .where('user_id')
        .equals(user.id)
        .count();
      setPendingActionsCount(count);
    } catch (error) {
      console.error('Error counting pending actions:', error);
    }
  };

  // Cache restaurants for offline access
  const cacheRestaurants = useCallback(async (restaurants: any[]) => {
    try {
      const offlineRestaurants: OfflineRestaurant[] = restaurants.map(r => ({
        ...r,
        cached_at: new Date()
      }));

      await db.restaurants.bulkPut(offlineRestaurants);
      console.log(`Cached ${restaurants.length} restaurants for offline access`);
    } catch (error) {
      console.error('Error caching restaurants:', error);
    }
  }, []);

  // Cache menu items for offline access
  const cacheMenuItems = useCallback(async (menuItems: any[], restaurantId: string) => {
    try {
      const offlineMenuItems: OfflineMenuItem[] = menuItems.map(item => ({
        ...item,
        restaurant_id: restaurantId,
        cached_at: new Date()
      }));

      await db.menuItems.bulkPut(offlineMenuItems);
      console.log(`Cached ${menuItems.length} menu items for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error caching menu items:', error);
    }
  }, []);

  // Get cached data when offline
  const getCachedRestaurants = useCallback(async (): Promise<OfflineRestaurant[]> => {
    try {
      return await db.restaurants.orderBy('name').toArray();
    } catch (error) {
      console.error('Error getting cached restaurants:', error);
      return [];
    }
  }, []);

  const getCachedMenuItems = useCallback(async (restaurantId: string): Promise<OfflineMenuItem[]> => {
    try {
      return await db.menuItems
        .where('restaurant_id')
        .equals(restaurantId)
        .toArray();
    } catch (error) {
      console.error('Error getting cached menu items:', error);
      return [];
    }
  }, []);

  // Offline cart management
  const addToOfflineCart = useCallback(async (cartItem: any) => {
    if (!user) return;

    try {
      const offlineCartItem: OfflineCartItem = {
        id: crypto.randomUUID(),
        user_id: user.id,
        ...cartItem,
        pending_sync: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db.cartItems.add(offlineCartItem);
      
      // Add to pending actions for sync
      await addPendingAction('update_cart', {
        action: 'add',
        item: offlineCartItem
      });

      updatePendingActionsCount();
    } catch (error) {
      console.error('Error adding to offline cart:', error);
    }
  }, [user]);

  const getOfflineCart = useCallback(async (): Promise<OfflineCartItem[]> => {
    if (!user) return [];

    try {
      return await db.cartItems
        .where('user_id')
        .equals(user.id)
        .toArray();
    } catch (error) {
      console.error('Error getting offline cart:', error);
      return [];
    }
  }, [user]);

  // Offline chat message management
  const addOfflineChatMessage = useCallback(async (message: any) => {
    if (!user) return;

    try {
      const offlineMessage: OfflineChatMessage = {
        id: crypto.randomUUID(),
        sender_id: user.id,
        ...message,
        pending_sync: true,
        created_at: new Date()
      };

      await db.chatMessages.add(offlineMessage);
      
      // Add to pending actions for sync
      await addPendingAction('send_message', {
        message: offlineMessage
      });

      updatePendingActionsCount();
      return offlineMessage.id;
    } catch (error) {
      console.error('Error adding offline chat message:', error);
    }
  }, [user]);

  // Pending actions management
  const addPendingAction = useCallback(async (type: OfflineAction['type'], data: any) => {
    if (!user) return;

    try {
      const action: OfflineAction = {
        id: crypto.randomUUID(),
        type,
        data,
        user_id: user.id,
        created_at: new Date(),
        retries: 0
      };

      await db.pendingActions.add(action);
    } catch (error) {
      console.error('Error adding pending action:', error);
    }
  }, [user]);

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!user || !isOnline || syncInProgress) return;

    setSyncInProgress(true);

    try {
      const pendingActions = await db.pendingActions
        .where('user_id')
        .equals(user.id)
        .toArray();

      console.log(`Syncing ${pendingActions.length} pending actions`);

      for (const action of pendingActions) {
        try {
          await syncAction(action);
          await db.pendingActions.delete(action.id);
        } catch (error) {
          console.error(`Error syncing action ${action.id}:`, error);
          
          // Increment retry count
          await db.pendingActions.update(action.id, {
            retries: action.retries + 1,
            last_error: error instanceof Error ? error.message : String(error)
          });

          // Remove action if too many retries
          if (action.retries >= 3) {
            await db.pendingActions.delete(action.id);
            console.warn(`Removed action ${action.id} after 3 failed attempts`);
          }
        }
      }

      updatePendingActionsCount();

      if (pendingActions.length > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${pendingActions.length} ações foram sincronizadas.`,
        });
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [user, isOnline, syncInProgress, toast]);

  const syncAction = async (action: OfflineAction) => {
    switch (action.type) {
      case 'update_cart':
        if (action.data.action === 'add') {
          await supabase
            .from('cart_items')
            .insert({
              user_id: action.data.item.user_id,
              menu_item_id: action.data.item.menu_item_id,
              restaurant_id: action.data.item.restaurant_id,
              quantity: action.data.item.quantity,
              special_instructions: action.data.item.special_instructions
            });
        }
        break;

      case 'send_message':
        await supabase
          .from('chat_messages')
          .insert({
            room_id: action.data.message.room_id,
            sender_id: action.data.message.sender_id,
            content: action.data.message.content,
            message_type: action.data.message.message_type,
            sender_role: 'client' // Default role, should be determined from user profile
          });
        break;

      case 'create_order':
        // Handle order creation sync
        await supabase
          .from('orders')
          .insert(action.data.order);
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  };

  // Clear old cache data
  const clearOldCache = useCallback(async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    try {
      await db.restaurants
        .where('cached_at')
        .below(twoDaysAgo)
        .delete();

      await db.menuItems
        .where('cached_at')
        .below(twoDaysAgo)
        .delete();

      console.log('Cleared old cache data');
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }, []);

  return {
    isOnline,
    syncInProgress,
    pendingActionsCount,
    cacheRestaurants,
    cacheMenuItems,
    getCachedRestaurants,
    getCachedMenuItems,
    addToOfflineCart,
    getOfflineCart,
    addOfflineChatMessage,
    addPendingAction,
    syncPendingActions,
    clearOldCache
  };
};