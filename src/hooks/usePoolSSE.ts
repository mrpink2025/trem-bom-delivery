import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PoolGameState {
  id: string;
  status: string;
  mode: string;
  buy_in: number;
  creator_user_id: string;
  opponent_user_id?: string;
  players: any[];
  balls: any[];
  turn_user_id?: string;
  game_phase: string;
  ball_in_hand: boolean;
  shot_clock: number;
  rules: any;
  table_config: any;
  history: any[];
  winner_user_ids?: string[];
  created_at: string;
  updated_at: string;
}

interface UsePoolSSEReturn {
  gameState: PoolGameState | null;
  connected: boolean;
  error: string | null;
  connectToMatch: (matchId: string) => Promise<void>;
  disconnect: () => void;
  retryConnection: () => void;
}

export function usePoolSSE(): UsePoolSSEReturn {
  const [gameState, setGameState] = useState<PoolGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentMatchIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const disconnect = useCallback(() => {
    console.log('🔌 [usePoolSSE] Disconnecting...');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setConnected(false);
    setError(null);
    currentMatchIdRef.current = null;
    reconnectAttemptsRef.current = 0;
  }, []);

  const connectToMatch = useCallback(async (matchId: string) => {
    console.log(`🔌 [usePoolSSE] Connecting to match: ${matchId}`);
    
    // Disconnect any existing connection
    disconnect();
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      currentMatchIdRef.current = matchId;
      setError(null);
      
      // Create SSE connection with improved error handling
      const sseUrl = `https://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-sse?matchId=${matchId}&token=${session.access_token}`;
      console.log(`🔌 [usePoolSSE] Connecting to: ${sseUrl}`);
      
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('🔌 [usePoolSSE] ✅ SSE connection opened successfully');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔌 [usePoolSSE] 📨 Received:', data);
          
          switch (data.type) {
            case 'connected':
              console.log('🔌 [usePoolSSE] ✅ Connection confirmed by server');
              setConnected(true);
              break;
              
            case 'match_state':
              console.log('🔌 [usePoolSSE] 🎮 Match state updated:', {
                status: data.matchData?.status,
                players: data.matchData?.players?.length,
                turn: data.matchData?.turn_user_id
              });
              setGameState(data.matchData);
              break;
              
            case 'heartbeat':
              console.log('🔌 [usePoolSSE] 💓 Heartbeat received - connection alive');
              break;
              
            default:
              console.log('🔌 [usePoolSSE] ❓ Unknown message type:', data.type, data);
          }
        } catch (parseError) {
          console.error('🔌 [usePoolSSE] ❌ Error parsing message:', parseError, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('🔌 [usePoolSSE] ❌ SSE connection error:', error);
        console.error('🔌 [usePoolSSE] EventSource readyState:', eventSource.readyState);
        
        setConnected(false);
        
        // Only auto-reconnect if we have a match ID and haven't exceeded attempts
        if (currentMatchIdRef.current && reconnectAttemptsRef.current < 8) {
          const delay = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current), 20000);
          console.log(`🔌 [usePoolSSE] 🔄 Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/8)`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (currentMatchIdRef.current) {
              reconnectAttemptsRef.current++;
              console.log(`🔌 [usePoolSSE] 🔄 Attempting reconnect #${reconnectAttemptsRef.current}`);
              connectToMatch(currentMatchIdRef.current);
            }
          }, delay);
        } else {
          const errorMsg = reconnectAttemptsRef.current >= 8 
            ? 'Connection lost after multiple reconnection attempts' 
            : 'Connection failed';
          console.error(`🔌 [usePoolSSE] ❌ ${errorMsg}`);
          setError(errorMsg);
        }
      };

    } catch (connectionError) {
      console.error('🔌 [usePoolSSE] ❌ Initial connection error:', connectionError);
      setError(connectionError instanceof Error ? connectionError.message : 'Connection failed');
      setConnected(false);
    }
  }, [disconnect]);

  const retryConnection = useCallback(() => {
    if (currentMatchIdRef.current) {
      reconnectAttemptsRef.current = 0;
      connectToMatch(currentMatchIdRef.current);
    }
  }, [connectToMatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    gameState,
    connected,
    error,
    connectToMatch,
    disconnect,
    retryConnection,
  };
}