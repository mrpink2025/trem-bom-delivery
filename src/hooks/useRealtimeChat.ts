import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  content?: string;
  media_url?: string;
  location_data?: {
    lat: number;
    lng: number;
    address?: string;
  };
  metadata?: any;
  status: 'sent' | 'delivered' | 'read';
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatThread {
  id: string;
  order_id: string;
  seller_id: string;
  courier_id?: string;
  customer_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPresence {
  user_id: string;
  thread_id?: string;
  is_online: boolean;
  is_typing: boolean;
  last_seen: string;
}

interface UseRealtimeChatProps {
  orderId?: string;
  threadId?: string;
}

export function useRealtimeChat({ orderId, threadId }: UseRealtimeChatProps = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!user || (!orderId && !threadId)) return;

    try {
      setIsLoading(true);

      // Get thread
      let threadQuery;
      if (threadId) {
        threadQuery = supabase
          .from('chat_threads')
          .select('*')
          .eq('id', threadId)
          .single();
      } else if (orderId) {
        threadQuery = supabase
          .from('chat_threads')
          .select('*')
          .eq('order_id', orderId)
          .single();
      }

      const { data: threadData, error: threadError } = await threadQuery!;
      
      if (threadError && threadError.code !== 'PGRST116') {
        console.error('Error loading thread:', threadError);
        return;
      }

      if (threadData) {
        setThread(threadData);

        // Load messages for this thread
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', threadData.id)
          .order('created_at', { ascending: true });

        if (!messagesError && messagesData) {
          setMessages(messagesData as ChatMessage[]);
        }
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, orderId, threadId]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!thread || !user) return;

    // Subscribe to messages
    channelRef.current = supabase
      .channel(`chat_thread_${thread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${thread.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${thread.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();

    // Subscribe to presence
    presenceChannelRef.current = supabase
      .channel(`presence_${thread.id}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannelRef.current.presenceState();
        const presenceList = Object.values(newState).flat() as UserPresence[];
        setPresence(presenceList);
        
        // Update typing users
        const typing = presenceList
          .filter(p => p.is_typing && p.user_id !== user.id)
          .map(p => p.user_id);
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user presence
          await presenceChannelRef.current.track({
            user_id: user.id,
            thread_id: thread.id,
            is_online: true,
            is_typing: false,
            last_seen: new Date().toISOString()
          });
        }
      });

    return () => {
      channelRef.current?.unsubscribe();
      presenceChannelRef.current?.unsubscribe();
    };
  }, [thread, user]);

  // Load initial data when dependencies change
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'image' | 'location' = 'text',
    metadata?: any
  ) => {
    if (!thread || !user || !content.trim()) return;

    try {
      const messageData = {
        thread_id: thread.id,
        sender_id: user.id,
        message_type: type,
        content: type === 'text' ? content : undefined,
        media_url: type === 'image' ? content : undefined,
        location_data: type === 'location' ? JSON.parse(content) : undefined,
        metadata,
        status: 'sent' as const
      };

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [thread, user]);

  // Update typing status
  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (!presenceChannelRef.current || !user) return;

    setIsTyping(typing);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence
    await presenceChannelRef.current.track({
      user_id: user.id,
      thread_id: thread?.id,
      is_online: true,
      is_typing: typing,
      last_seen: new Date().toISOString()
    });

    // Auto-stop typing after 3 seconds
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, 3000);
    }
  }, [user, thread]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .neq('sender_id', user.id); // Don't mark own messages as read

      if (error) {
        console.error('Error marking message as read:', error);
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }, [user]);

  // Upload image
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(data.path);

    return publicUrl;
  }, [user]);

  // Report message
  const reportMessage = useCallback(async (messageId: string, reason: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('message_reports')
        .insert([{
          message_id: messageId,
          reporter_id: user.id,
          reason
        }]);

      if (error) {
        console.error('Error reporting message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to report message:', error);
      throw error;
    }
  }, [user]);

  return {
    messages,
    thread,
    presence,
    isLoading,
    isTyping,
    typingUsers,
    sendMessage,
    updateTypingStatus,
    markAsRead,
    uploadImage,
    reportMessage,
    reload: loadInitialData
  };
}