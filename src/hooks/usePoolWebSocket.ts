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
  setReady: () => void;
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

      const wsUrl = `wss://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-websocket`;
      console.log('[POOL-WS] Creating WebSocket connection to:', wsUrl)
      console.log('[POOL-WS] Match ID:', matchId)
      console.log('[POOL-WS] Token length:', session.access_token.length)
      
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('[POOL-WS] ✅ WebSocket connection established')
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        const joinMessage = {
          type: 'join_match',
          matchId,
          token: session.access_token
        };
        
        console.log('[POOL-WS] 📤 Sending join_match message:', {
          type: joinMessage.type,
          matchId: joinMessage.matchId,
          tokenLength: joinMessage.token.length
        })
        
        // Join match
        websocket.send(JSON.stringify(joinMessage));
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[POOL-WS] 📥 Message received:', {
            type: message.type,
            matchId: message.matchId,
            hasState: !!message.state,
            hasMatch: !!message.match,
            data: message
          });

            switch (message.type) {
              case 'joined':
                console.log('[POOL-WS] Successfully joined match:', message.matchId)
                break;
                
              case 'room_state':
                console.log('[POOL-WS] Room state received:', {
                  status: message.match?.status,
                  playersCount: message.match?.players?.length,
                  players: message.match?.players?.map((p: any) => ({
                    userId: p.userId,
                    connected: p.connected,
                    ready: p.ready
                  }))
                });
                if (message.match) {
                  // Transform pool_matches format to expected format
                  const transformedMatch: PoolGameState = {
                    balls: message.match.balls || [],
                    turnUserId: message.match.turn_user_id || message.match.turnUserId || '',
                    players: (message.match.players || []).map((p: any) => ({
                      userId: p.userId,
                      seat: p.seat || 0,
                      connected: p.connected || false,
                      ready: p.ready || false,
                      mmr: p.mmr || 1000,
                      group: p.group
                    })),
                    gamePhase: (message.match.game_phase || message.match.gamePhase || 'BREAK') as 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL',
                    ballInHand: message.match.ball_in_hand || message.match.ballInHand || false,
                    shotClock: message.match.shot_clock || message.match.shotClock || 60,
                    status: (message.match.status || 'LOBBY') as 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED',
                    winnerUserIds: message.match.winner_user_ids || message.match.winnerUserIds,
                    buyIn: message.match.buy_in || message.match.buyIn || 10,
                    mode: (message.match.mode || 'CASUAL') as 'RANKED' | 'CASUAL',
                    createdBy: message.match.created_by || message.match.createdBy
                  }
                  console.log('[POOL-WS] Setting transformed match state:', transformedMatch);
                  setGameState(transformedMatch);
                }
                break;

              case 'match_state':
                console.log('[POOL-WS] Match state received:', message.match);
                if (message.match) {
                  setGameState(message.match);
                }
                break;

              case 'match_started':
                console.log('[POOL-WS] 🎮 Match started! Received state:', {
                  hasBalls: !!message.state?.balls,
                  ballsCount: message.state?.balls?.length,
                  turnUserId: message.state?.turn_user_id || message.state?.turnUserId,
                  gamePhase: message.state?.game_phase || message.state?.gamePhase,
                  ballInHand: message.state?.ball_in_hand || message.state?.ballInHand
                });
                if (message.state) {
                  // Transform pool_matches format to expected format
                  const transformedState: PoolGameState = {
                    balls: message.state.balls || [],
                    turnUserId: message.state.turn_user_id || message.state.turnUserId || '',
                    players: (message.state.players || []).map((p: any) => ({
                      userId: p.userId,
                      seat: p.seat || 0,
                      connected: p.connected || false,
                      ready: p.ready || false,
                      mmr: p.mmr || 1000,
                      group: p.group
                    })),
                    gamePhase: (message.state.game_phase || message.state.gamePhase || 'BREAK') as 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL',
                    ballInHand: message.state.ball_in_hand || message.state.ballInHand || false,
                    shotClock: message.state.shot_clock || message.state.shotClock || 60,
                    status: 'LIVE',
                    winnerUserIds: message.state.winner_user_ids || message.state.winnerUserIds,
                    buyIn: message.state.buy_in || message.state.buyIn || 10,
                    mode: (message.state.mode || 'CASUAL') as 'RANKED' | 'CASUAL',
                    createdBy: message.state.created_by || message.state.createdBy
                  };
                  console.log('[POOL-WS] Setting match started state:', transformedState);
                  setGameState(transformedState);
                }
                break;

              case 'start_countdown':
                console.log('[POOL-WS] ⏰ Countdown started:', message.seconds);
                // Could show countdown UI here
                break;

            case 'simulation_result':
              console.log('[POOL-WS] Simulation result received:', {
                ballsCount: message.balls?.length,
                ballsPocketed: message.ballsPocketed?.length,
                fouls: message.fouls?.length,
                turnEnds: message.turnEnds,
                winner: message.winner
              });
              
              // Update game state with simulation results
              setGameState(prev => {
                if (!prev) return null;
                
                const newState = {
                  ...prev,
                  balls: message.balls || prev.balls,
                  ballInHand: message.fouls && message.fouls.length > 0,
                  status: message.winner ? 'FINISHED' : prev.status,
                  winnerUserIds: message.winner ? [message.winner] : prev.winnerUserIds
                };

                // Update turn if it ended
                if (message.turnEnds) {
                  const otherPlayer = prev.players.find(p => p.userId !== prev.turnUserId);
                  newState.turnUserId = otherPlayer?.userId || prev.turnUserId;
                }

                return newState;
              });
              
              // Add events for animation
              if (message.events) {
                setEvents(message.events);
              }
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
              console.log('[POOL-WS] Unknown message type:', message.type, message);
              break;
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
        console.error('[POOL-WS] ❌ WebSocket error:', {
          error,
          type: error.type,
          readyState: websocket.readyState,
          url: wsUrl
        });
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

  const setReady = useCallback(() => {
    console.log('[POOL-WS] 🎯 Setting player ready - state check:', { 
      hasWs: !!ws, 
      connected,
      currentGameState: gameState?.status,
      playersReady: gameState?.players?.map(p => ({
        userId: p.userId,
        ready: p.ready,
        connected: p.connected
      }))
    })
    if (ws && connected) {
      const readyMessage = { type: 'ready' };
      console.log('[POOL-WS] 📤 Sending ready message:', readyMessage)
      ws.send(JSON.stringify(readyMessage));
    } else {
      console.warn('[POOL-WS] ⚠️ Cannot set ready - not connected:', { 
        hasWs: !!ws, 
        connected 
      })
    }
  }, [ws, connected, gameState]);

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
    setReady,
    disconnect
  };
};
