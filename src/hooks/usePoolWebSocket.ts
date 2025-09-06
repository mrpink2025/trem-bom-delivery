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
}

interface ShotInput {
  dir: number;
  power: number;
  spin: { sx: number; sy: number };
  aimPoint: { x: number; y: number };
}

interface ChatMessage {
  userId: string;
  message: string;
  timestamp: number;
}

interface SimulationEvent {
  type: string;
  time: number;
  ballId?: number;
  ballType?: string;
  ballNumber?: number;
  ball1Id?: number;
  ball2Id?: number;
  side?: string;
}

interface UsePoolWebSocketReturn {
  ws: WebSocket | null;
  connected: boolean;
  gameState: PoolGameState | null;
  messages: ChatMessage[];
  events: SimulationEvent[];
  error: string | null;
  connectToMatch: (matchId: string) => Promise<void>;
  shoot: (shot: ShotInput) => void;
  placeCueBall: (x: number, y: number) => void;
  sendMessage: (message: string) => void;
  disconnect: () => void;
}

export const usePoolWebSocket = (): UsePoolWebSocketReturn => {
  const { user } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<PoolGameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connectToMatch = useCallback(async (matchId: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No valid session');
        return;
      }

      // Close existing connection
      if (ws) {
        ws.close();
        setWs(null);
      }

      // Create WebSocket connection
      const wsUrl = `wss://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-websocket`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('[POOL-WS] Connected');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Join match
        websocket.send(JSON.stringify({
          type: 'join_match',
          matchId,
          token: session.access_token
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[POOL-WS] Message received:', message.type);

          switch (message.type) {
            case 'match_state':
              setGameState(message.match);
              break;

            case 'simulation_result':
              // Update game state with simulation results
              setGameState(prev => prev ? {
                ...prev,
                balls: message.balls,
                turnUserId: message.turnEnds ? 
                  prev.players.find(p => p.userId !== prev.turnUserId)?.userId || prev.turnUserId 
                  : prev.turnUserId,
                ballInHand: message.fouls && message.fouls.length > 0,
                status: message.winner ? 'FINISHED' : prev.status,
                winnerUserIds: message.winner ? [message.winner] : prev.winnerUserIds
              } : null);
              
              // Add events for animation
              setEvents(message.events || []);
              break;

            case 'match_started':
              setGameState(message.match);
              break;

            case 'chat_message':
              if (message.userId !== user?.id) {
                setMessages(prev => [...prev, {
                  userId: message.userId,
                  message: message.message,
                  timestamp: message.timestamp
                }]);
              }
              break;

            case 'cue_ball_placed':
              setGameState(prev => prev ? {
                ...prev,
                balls: prev.balls.map(ball =>
                  ball.type === 'CUE' ? { ...ball, x: message.x, y: message.y, inPocket: false } : ball
                ),
                ballInHand: false
              } : null);
              break;

            case 'player_joined':
              console.log('[POOL-WS] Player joined:', message.userId);
              setGameState(prev => prev ? {
                ...prev,
                players: prev.players.map(p => 
                  p.userId === message.userId ? { ...p, connected: true } : p
                )
              } : null);
              break;

            case 'player_disconnected':
              console.log('[POOL-WS] Player disconnected:', message.userId);
              setGameState(prev => prev ? {
                ...prev,
                players: prev.players.map(p => 
                  p.userId === message.userId ? { ...p, connected: false } : p
                )
              } : null);
              break;

            case 'shot_rejected':
              setError(`Tacada rejeitada: ${message.reason}`);
              setTimeout(() => setError(null), 3000);
              break;

            case 'error':
              setError(message.message);
              setTimeout(() => setError(null), 5000);
              break;

            case 'pong':
              // Handle ping response
              break;

            default:
              console.log('[POOL-WS] Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('[POOL-WS] Error parsing message:', err);
        }
      };

      websocket.onclose = (event) => {
        console.log('[POOL-WS] Connection closed:', event.code, event.reason);
        setConnected(false);
        setWs(null);

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`[POOL-WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectToMatch(matchId);
          }, delay);
        }
      };

      websocket.onerror = (error) => {
        console.error('[POOL-WS] WebSocket error:', error);
        setError('Connection error');
      };

      setWs(websocket);
    } catch (err) {
      console.error('[POOL-WS] Error connecting:', err);
      setError('Failed to connect to game server');
    }
  }, [user, ws]); // Removed gameState dependency to avoid circular updates

  const shoot = useCallback((shot: ShotInput) => {
    if (ws && connected) {
      ws.send(JSON.stringify({
        type: 'shoot',
        ...shot
      }));
    }
  }, [ws, connected]);

  const placeCueBall = useCallback((x: number, y: number) => {
    if (ws && connected) {
      ws.send(JSON.stringify({
        type: 'place_cue_ball',
        x,
        y
      }));
    }
  }, [ws, connected]);

  const sendMessage = useCallback((message: string) => {
    if (ws && connected && user) {
      ws.send(JSON.stringify({
        type: 'chat',
        message
      }));
      
      // Add to local messages immediately
      setMessages(prev => [...prev, {
        userId: user.id,
        message,
        timestamp: Date.now()
      }]);
    }
  }, [ws, connected, user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws) {
      ws.close(1000, 'User disconnect');
      setWs(null);
    }
    
    setConnected(false);
    setGameState(null);
    setMessages([]);
    setEvents([]);
    setError(null);
  }, [ws]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (ws && connected) {
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [ws, connected]);

  return {
    ws,
    connected,
    gameState,
    messages,
    events,
    error,
    connectToMatch,
    shoot,
    placeCueBall,
    sendMessage,
    disconnect
  };
};
