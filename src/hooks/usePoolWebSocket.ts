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
  players?: Array<{
    user_id: string;
    seat: number;
    connected: boolean;
    ready?: boolean;
    mmr?: number;
  }>;
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

const WEBSOCKET_URL = `wss://ighllleypgbkluhcihvs.functions.supabase.co/pool-websocket`;
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
          const message = JSON.parse(event.data);
          console.log(`🔌 [usePoolWebSocket] ${requestId} Received:`, {
            type: message.type,
            hasMatch: !!message.match,
            matchId: message.matchId || message.match?.id,
            matchStatus: message.match?.status,
            hasGameState: !!(message.match?.game_state || message.gameState),
            playersCount: message.match?.players?.length || 0
          });

          switch (message.type) {
            case 'join_confirmed':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Join confirmed for match:`, message.matchId);
              setIsConnected(true);
              setError(null);
              break;

            case 'room_state':
            case 'match_data':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Processing match data:`, {
                matchId: message.match?.id,
                status: message.match?.status,
                players: message.match?.players,
                hasGameState: !!message.match?.game_state
              });
              
              if (message.match) {
                const normalizedMatch = {
                  ...message.match,
                  // Ensure consistent field naming
                  id: message.match.id,
                  status: message.match.status || 'LOBBY',
                  creator_user_id: message.match.creator_user_id,
                  opponent_user_id: message.match.opponent_user_id,
                  players: message.match.players || [],
                  // Normalize game_state vs gameState
                  game_state: message.match.game_state || message.match.gameState || {},
                  created_at: message.match.created_at
                };
                
                setMatchData(normalizedMatch);
                
                // Handle game state
                const gameState = normalizedMatch.game_state || {};
                const hasValidGameState = gameState && Object.keys(gameState).length > 0 && gameState.players;
                
                if (hasValidGameState) {
                  console.log(`🔌 [usePoolWebSocket] ${requestId} Setting game state from match data`);
                  setGameState(gameState);
                  setHasStarted(true);
                } else if (normalizedMatch.players && normalizedMatch.players.length > 0) {
                  console.log(`🔌 [usePoolWebSocket] ${requestId} Setting lobby state with players:`, normalizedMatch.players);
                  
                  // Create lobby game state with normalized player data
                  const lobbyGameState: PoolGameState = {
                    balls: [],
                    turnUserId: '',
                    phase: 'BREAK' as const,
                    players: normalizedMatch.players.map((p: any, index: number) => ({
                      user_id: p.user_id || p.userId,
                      seat: p.seat || (index + 1),
                      connected: p.connected !== false,
                      ready: p.ready === true,
                      mmr: p.mmr || 1000
                    }))
                  };
                  
                  setGameState(lobbyGameState);
                  setHasStarted(false);
                } else {
                  console.log(`🔌 [usePoolWebSocket] ${requestId} No players data, creating empty lobby state`);
                  const emptyLobbyState: PoolGameState = {
                    balls: [],
                    turnUserId: '',
                    phase: 'BREAK' as const,
                    players: []
                  };
                  setGameState(emptyLobbyState);
                  setHasStarted(false);
                }
              }
              break;

            case 'match_started':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Match started!`);
              handleMatchStarted(message.state, message.eventId, ws);
              break;

            case 'player_joined':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Player joined:`, message.player);
              // Re-fetch match state to get updated player list
              handleFallbackPolling(matchId, token, requestId);
              break;

            case 'player_left':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Player left:`, message.player);
              // Re-fetch match state to get updated player list
              handleFallbackPolling(matchId, token, requestId);
              break;

            case 'shot_result':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Shot result:`, message);
              if (message.gameState) {
                setGameState(message.gameState);
              }
              break;

            case 'error':
              console.error(`🔌 [usePoolWebSocket] ${requestId} Server error:`, message);
              setError(`Erro do servidor: ${message.message || 'Erro desconhecido'}`);
              setIsConnected(false);
              break;

            case 'pong':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Pong received`);
              break;

            default:
              console.log(`🔌 [usePoolWebSocket] ${requestId} Unknown message type:`, message.type);
          }
        } catch (error) {
          console.error(`🔌 [usePoolWebSocket] ${requestId} Error parsing message:`, {
            error: error.message,
            rawData: event.data
          });
          setError('Erro ao processar mensagem do servidor');
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