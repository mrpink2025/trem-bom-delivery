import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wx: number;
  wy: number;
  color: string;
  number?: number;
  inPocket: boolean;
  type: 'SOLID' | 'STRIPE' | 'CUE' | 'EIGHT';
}

interface PoolGameState {
  balls: Ball[];
  turnUserId: string;
  players: Array<{
    userId: string;
    seat: number;
    connected: boolean;
    ready: boolean;
    mmr: number;
    group?: 'SOLID' | 'STRIPE';
  }>;
  gamePhase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL';
  ballInHand?: boolean;
  shotClock?: number;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  winnerUserIds?: string[];
  buyIn: number;
  mode: 'RANKED' | 'CASUAL';
  createdBy?: string;
}

interface ShotInput {
  dir: number;
  power: number;
  spin: { sx: number; sy: number };
  aimPoint: { x: number; y: number };
}

interface ChatMessage {
  id: string;
  message: string;
  sender: string;
  timestamp: Date;
}

interface SimulationEvent {
  type: string;
  time: number;
  ballId?: number;
  ballType?: string;
  ballNumber?: number;
}

interface UsePoolWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  gameState: PoolGameState | null;
  messages: ChatMessage[];
  events: SimulationEvent[];
  error: string | null;
  matchData: any;
  renderKey: number;
  hasStarted: boolean;
  connectToMatch: (matchId: string) => Promise<void>;
  shoot: (shot: ShotInput) => void;
  placeCueBall: (x: number, y: number) => void;
  sendMessage: (message: string) => void;
  setReady: () => void;
  disconnect: () => void;
}

export function usePoolWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<PoolGameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>();
  const { user } = useAuth();

  const connectToMatchWebSocket = useCallback(async (matchId: string, token: string) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔌 Connecting to pool WebSocket for match: ${matchId} (${requestId})`);

    try {
      const ws = new WebSocket(`wss://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-websocket`);
      
      ws.onopen = () => {
        console.log(`✅ Pool WebSocket connected (${requestId})`);
        setIsConnected(true);
        setSocket(ws);

        ws.send(JSON.stringify({
          type: 'join_match',
          matchId,
          token,
          requestId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'room_state':
              setMatchData(data.match);
              if (data.match?.game_state) {
                setGameState(data.match.game_state);
              }
              if (data.match?.status === 'LIVE' && !hasStarted) {
                handleMatchStarted(data.match.game_state, data.eventId || 'fallback');
              }
              break;

            case 'match_started':
              console.log(`🎮 Match started! (${requestId})`);
              handleMatchStarted(data.state, data.eventId);
              break;

            case 'warning':
              if (data.code === 'CLIENT_NOT_ACKED') {
                handleFallbackPolling(matchId, token, requestId);
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setSocket(null);
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setError('Connection failed');
    }
  }, [hasStarted]);

  const handleMatchStarted = useCallback((state: any, eventId: string) => {
    if (state) {
      setGameState(state);
      setHasStarted(true);
      setRenderKey(prev => prev + 1);
      setMatchData(prev => prev ? { ...prev, status: 'LIVE' } : null);
    }
    
    if (socket && eventId) {
      socket.send(JSON.stringify({
        type: 'ack',
        eventId
      }));
    }
  }, [socket]);

  const handleFallbackPolling = useCallback(async (matchId: string, token: string, requestId: string) => {
    try {
      const { data } = await supabase.functions.invoke('pool-match-get-state', {
        body: { matchId },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data?.status === 'LIVE' && data?.game_state && !hasStarted) {
        handleMatchStarted(data.game_state, 'fallback');
      }
    } catch (error) {
      console.error('Fallback polling failed:', error);
    }
  }, [hasStarted, handleMatchStarted]);

  const connectToMatch = useCallback(async (matchId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await connectToMatchWebSocket(matchId, session.access_token);
    }
  }, [connectToMatchWebSocket]);

  const setReady = useCallback(() => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: 'ready' }));
    }
  }, [socket, isConnected]);

  const shoot = useCallback((shot: ShotInput) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: 'shoot', shot }));
    }
  }, [socket, isConnected]);

  const placeCueBall = useCallback((x: number, y: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: 'place_cue_ball', x, y }));
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((message: string) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: 'chat', message }));
    }
  }, [socket, isConnected]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    setSocket(null);
    setIsConnected(false);
    setGameState(null);
    setMatchData(null);
    setHasStarted(false);
  }, [socket]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    gameState,
    messages,
    events,
    error,
    matchData,
    renderKey,
    hasStarted,
    connectToMatch,
    shoot,
    placeCueBall,
    sendMessage,
    setReady,
    disconnect
  };
}