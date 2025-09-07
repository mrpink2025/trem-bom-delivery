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
    user_id: string;
    seat: number;
    connected: boolean;
    ready: boolean;
    mmr: number;
    group?: 'SOLID' | 'STRIPE';
  }>;
  phase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL';
  ballInHand?: boolean;
  shotClock?: number;
  seed?: string;
}

interface MatchData {
  id: string;
  status: 'LOBBY' | 'COUNTDOWN' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  creator_user_id: string;
  opponent_user_id?: string;
  join_code?: string;
  buy_in: number;
  mode: 'RANKED' | 'CASUAL';
  game_state?: PoolGameState;
  created_at: string;
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
  matchData: MatchData | null;
  renderKey: number;
  hasStarted: boolean;
  connectToMatch: (matchId: string) => Promise<void>;
  shoot: (shot: ShotInput) => void;
  placeCueBall: (x: number, y: number) => void;
  sendMessage: (message: string) => void;
  setReady: () => void;
  disconnect: () => void;
}

const WEBSOCKET_URL = `wss://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-websocket`;
const FALLBACK_API_URL = `https://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-match-get-state`;

export function usePoolWebSocket(): UsePoolWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<PoolGameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>();
  const currentMatchIdRef = useRef<string | null>(null);
  const { user } = useAuth();

  const connectToMatchWebSocket = useCallback(async (matchId: string, token: string) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔌 [usePoolWebSocket] ${requestId} Connecting to match: ${matchId}`);

    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      currentMatchIdRef.current = matchId;
      
      ws.onopen = () => {
        console.log(`✅ [usePoolWebSocket] ${requestId} WebSocket connected`);
        setIsConnected(true);
        setSocket(ws);
        setError(null);

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
          console.log(`📨 [usePoolWebSocket] ${requestId} Received:`, data.type);
          
          switch (data.type) {
            case 'room_state':
              setMatchData(data.match);
              if (data.match?.game_state) {
                setGameState(data.match.game_state);
              }
              // Fallback: if status is LIVE but not started, try to get state
              if (data.match?.status === 'LIVE' && !hasStarted) {
                handleFallbackPolling(matchId, token, requestId);
              }
              break;
              
            case 'match_data':
              console.log(`📊 [usePoolWebSocket] ${requestId} Match data received:`, data.match);
              setMatchData(data.match);
              // Extract game state from match data
              if (data.match?.balls && data.match?.players) {
                const gameState = {
                  balls: data.match.balls || [],
                  turnUserId: data.match.turn_user_id,
                  players: data.match.players || [],
                  phase: data.match.game_phase || 'BREAK',
                  ballInHand: data.match.ball_in_hand || false,
                  shotClock: data.match.shot_clock || 30
                };
                setGameState(gameState);
                console.log(`🎯 [usePoolWebSocket] ${requestId} Game state set:`, gameState);
              }
              break;

            case 'start_countdown':
              console.log(`⏰ [usePoolWebSocket] ${requestId} Countdown started`);
              // Could show countdown UI here
              break;

            case 'match_started':
              console.log(`🎮 [usePoolWebSocket] ${requestId} Match started!`);
              handleMatchStarted(data.state, data.eventId, ws);
              break;

            case 'warning':
              if (data.code === 'CLIENT_NOT_ACKED') {
                console.warn(`⚠️ [usePoolWebSocket] ${requestId} Server warning: client not ACK'd`);
                handleFallbackPolling(matchId, token, requestId);
              }
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.log(`🔍 [usePoolWebSocket] ${requestId} Unknown message type:`, data.type);
          }
        } catch (error) {
          console.error(`❌ [usePoolWebSocket] ${requestId} Error parsing message:`, error);
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ [usePoolWebSocket] ${requestId} WebSocket error:`, error);
        setError('Connection error');
      };

      ws.onclose = () => {
        console.log(`🔌 [usePoolWebSocket] ${requestId} WebSocket closed`);
        setIsConnected(false);
        setSocket(null);
      };

    } catch (error) {
      console.error(`❌ [usePoolWebSocket] ${requestId} Failed to connect:`, error);
      setError('Connection failed');
    }
  }, [hasStarted]);

  const handleMatchStarted = useCallback((state: PoolGameState, eventId: string, ws: WebSocket) => {
    console.log(`🎯 [usePoolWebSocket] Match started - setting state and forcing re-render`);
    setGameState(state);
    setHasStarted(true);
    setRenderKey(prev => prev + 1); // Force re-render
    setMatchData(prev => prev ? { ...prev, status: 'LIVE' } : null);
    
    // Send ACK
    if (eventId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ack',
        eventId
      }));
      console.log(`✅ [usePoolWebSocket] ACK sent for event ${eventId}`);
    }
  }, []);

  const handleFallbackPolling = useCallback(async (matchId: string, token: string, requestId: string) => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
    }

    fallbackTimeoutRef.current = setTimeout(async () => {
      try {
        console.log(`🔄 [usePoolWebSocket] ${requestId} Fallback polling for match ${matchId}`);
        
        const { data, error } = await supabase.functions.invoke('pool-match-get-state', {
          body: { matchId },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (error) {
          console.error(`❌ [usePoolWebSocket] ${requestId} Fallback error:`, error);
          return;
        }

        if (data?.status === 'LIVE' && data?.game_state && !hasStarted) {
          console.log(`🎯 [usePoolWebSocket] ${requestId} Fallback found LIVE match - starting`);
          handleMatchStarted(data.game_state, 'fallback', socket!);
        }
      } catch (error) {
        console.error(`❌ [usePoolWebSocket] ${requestId} Fallback polling failed:`, error);
      }
    }, 5000);
  }, [hasStarted, socket, handleMatchStarted]);

  const connectToMatch = useCallback(async (matchId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await connectToMatchWebSocket(matchId, session.access_token);
    }
  }, [connectToMatchWebSocket]);

  const setReady = useCallback(() => {
    const matchId = currentMatchIdRef.current;
    if (socket && isConnected && matchId) {
      console.log(`✋ [usePoolWebSocket] Setting ready for match ${matchId}`);
      socket.send(JSON.stringify({ 
        type: 'ready', 
        matchId 
      }));
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
    setRenderKey(0);
    currentMatchIdRef.current = null;
  }, [socket]);

  // Heartbeat
  useEffect(() => {
    if (!socket || !isConnected) return;

    const heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(heartbeat);
  }, [socket, isConnected]);

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