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
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'joining' | 'joined' | 'error';
  gameState: PoolGameState | null;
  messages: ChatMessage[];
  events: SimulationEvent[];
  error: string | null;
  matchData: MatchData | null;
  renderKey: number;
  hasStarted: boolean;
  retryCount: number;
  connectToMatch: (matchId: string) => Promise<void>;
  shoot: (shot: ShotInput) => void;
  placeCueBall: (x: number, y: number) => void;
  sendMessage: (message: string) => void;
  setReady: () => void;
  disconnect: () => void;
}

const WEBSOCKET_URL = `wss://ighllleypgbkluhcihvs.functions.supabase.co/pool-websocket`;
const FALLBACK_API_URL = `https://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-match-get-state`;
const JOIN_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function usePoolWebSocket(): UsePoolWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'joining' | 'joined' | 'error'>('disconnected');
  const [gameState, setGameState] = useState<PoolGameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>();
  const currentMatchIdRef = useRef<string | null>(null);
  const { user } = useAuth();

  const connectToMatchWebSocket = useCallback(async (matchId: string, token: string, attempt: number = 1) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔌 [usePoolWebSocket] ${requestId} Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} - Connecting to match:`, matchId);
    console.log(`🔌 [usePoolWebSocket] ${requestId} Using WebSocket URL: ${WEBSOCKET_URL}`);

    try {
      setError(null);
      const ws = new WebSocket(WEBSOCKET_URL);
      currentMatchIdRef.current = matchId;
      
      let joinTimeout: NodeJS.Timeout;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let connectionReady = false;
      
      const cleanup = () => {
        if (joinTimeout) clearTimeout(joinTimeout);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      };
      
      // Set a timeout for join confirmation with retry logic
      joinTimeout = setTimeout(async () => {
        console.log(`🔌 [usePoolWebSocket] ${requestId} Join timeout - no confirmation received`);
        ws.close();
        cleanup();
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          console.log(`🔄 [usePoolWebSocket] Retrying connection... (${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
          setRetryCount(attempt);
          setTimeout(() => {
            connectToMatchWebSocket(matchId, token, attempt + 1);
          }, RETRY_DELAY * attempt); // Exponential backoff
        } else {
          console.error(`❌ [usePoolWebSocket] Max retry attempts reached`);
          setError('Não foi possível conectar à partida. Tente novamente mais tarde.');
          setConnectionStatus('error');
          setRetryCount(0);
        }
      }, JOIN_TIMEOUT);
      
      ws.onopen = () => {
        console.log(`🔌 [usePoolWebSocket] ${requestId} WebSocket connected, waiting for ready signal...`);
        connectionReady = false;
        setConnectionStatus('connecting');
        
        // Start heartbeat immediately
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000); // More frequent heartbeat
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
            case 'connection_ready':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Connection ready, sending join request`);
              connectionReady = true;
              
              // Small delay to ensure connection is stable
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  const joinMessage = {
                    type: 'join_match',
                    matchId,
                    token,
                    requestId
                  };
                  console.log(`🔌 [usePoolWebSocket] ${requestId} Sending join message:`, joinMessage);
                  ws.send(JSON.stringify(joinMessage));
                  setConnectionStatus('joining');
                }
              }, 100);
              break;

            case 'join_confirmed':
              console.log(`🔌 [usePoolWebSocket] ${requestId} Join confirmed! Resetting retry count.`);
              clearTimeout(joinTimeout); // Clear the timeout
              setSocket(ws);
              setIsConnected(true);
              setConnectionStatus('joined');
              setError(null);
              setRetryCount(0); // Reset retry count on successful connection
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
              
              // Handle specific error types
              if (message.message?.includes('not found')) {
                setError('Partida não encontrada. Ela pode ter expirado.');
              } else if (message.message?.includes('full')) {
                setError('Partida já está cheia.');
              } else {
                setError(`Erro: ${message.message || 'Erro desconhecido'}`);
              }
              
              setIsConnected(false);
              setConnectionStatus('error');
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
        setError('Erro de conexão com o jogo. Tente novamente.');
        setIsConnected(false);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log(`🔌 [usePoolWebSocket] ${requestId} WebSocket closed:`, event.code, event.reason);
        setIsConnected(false);
        
        // Only set to disconnected if we weren't in an error state and connection was ready
        if (connectionStatus !== 'error' && connectionReady) {
          setConnectionStatus('disconnected');
        }
        
        cleanup();
        
        // Auto-reconnect if connection was established and closed unexpectedly
        if (event.code !== 1000 && currentMatchIdRef.current && attempt < MAX_RETRY_ATTEMPTS) {
          console.log(`🔄 [usePoolWebSocket] ${requestId} Attempting reconnection in 3 seconds...`);
          setConnectionStatus('connecting');
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (currentMatchIdRef.current) {
              console.log(`🔄 [usePoolWebSocket] ${requestId} Reconnecting to match...`);
              connectToMatchWebSocket(currentMatchIdRef.current, token, attempt + 1);
            }
          }, 3000);
        }
      };

    } catch (error) {
      console.error(`❌ [usePoolWebSocket] ${requestId} Failed to connect:`, error);
      setError('Falha ao conectar');
      setConnectionStatus('error');
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
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      // First check if match exists
      const { data: matchExists, error: checkError } = await supabase
        .from('pool_matches')
        .select('id, status')
        .eq('id', matchId)
        .single();
      
      if (checkError || !matchExists) {
        setError('Partida não encontrada. Ela pode ter sido removida.');
        setConnectionStatus('error');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setRetryCount(0); // Reset retry count for new connection attempt
        await connectToMatchWebSocket(matchId, session.access_token, 1);
      } else {
        setError('Sessão expirada. Faça login novamente.');
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error checking match:', error);
      setError('Erro ao verificar partida.');
      setConnectionStatus('error');
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
    setConnectionStatus('disconnected');
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
    connectionStatus,
    gameState,
    messages,
    events,
    error,
    matchData,
    renderKey,
    hasStarted,
    retryCount,
    connectToMatch,
    shoot,
    placeCueBall,
    sendMessage,
    setReady,
    disconnect
  };
}