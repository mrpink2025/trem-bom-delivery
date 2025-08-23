import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimePresence() {
  const { user } = useAuth();
  const [onlineCouriers, setOnlineCouriers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('courier-presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineIds = Object.keys(presenceState);
        setOnlineCouriers(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Courier joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Courier left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { onlineCouriers };
}