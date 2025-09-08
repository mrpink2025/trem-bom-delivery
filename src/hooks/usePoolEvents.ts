import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePoolEvents(matchId: string) {
  const [connected, setConnected] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [frames, setFrames] = useState<any[]>([]);
  const [finalState, setFinalState] = useState<any>(null);

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel(`pool:${matchId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pool_events', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setQueue((q) => [...q, payload.new]);
        }
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [matchId]);

  useEffect(() => {
    if (!queue.length) return;
    const evt = queue[0]; setQueue((q) => q.slice(1));
    switch (evt.type) {
      case 'sim_start':
        setFrames([]); setFinalState(null);
        break;
      case 'sim_frames': {
        const arr = evt.payload?.frames || [];
        setFrames((f) => [...f, ...arr]);
        break;
      }
      case 'sim_end':
        setFinalState(evt.payload?.state || null);
        break;
    }
  }, [queue]);

  return { connected, frames, finalState };
}