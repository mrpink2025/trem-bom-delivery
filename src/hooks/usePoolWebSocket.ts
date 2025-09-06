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
  const currentMatchIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const realtimeChannelRef = useRef<any>(null);

  // Polling function to check match updates
  const pollMatchUpdates = useCallback(async (matchId: string) => {
    if (!user || !matchId) return;
    
    try {
      console.log('[POOL-WS] 🔄 Polling match updates for:', matchId);
      
      const response = await supabase.functions.invoke('get-pool-matches-lobby');
      if (response.data && Array.isArray(response.data)) {
        const currentMatch = response.data.find((match: any) => match.id === matchId);
        
        if (currentMatch) {
          console.log('[POOL-WS] 📊 Match update found:', {
            status: currentMatch.status,
            players: currentMatch.players?.length,
            currentPlayers: currentMatch.current_players
          });
          
          // Transform to expected format
          const transformedMatch: PoolGameState = {
            balls: currentMatch.balls || [],
            turnUserId: currentMatch.turn_user_id || '',
            players: (currentMatch.players || []).map((p: any) => ({
              userId: p.userId,
              seat: p.seat || 0,
              connected: p.connected || false,
              ready: p.ready || false,
              mmr: p.mmr || 1000,
              group: p.group
            })),
            gamePhase: (currentMatch.game_phase || 'BREAK') as 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL',
            ballInHand: currentMatch.ball_in_hand || false,
            shotClock: currentMatch.shot_clock || 60,
            status: (currentMatch.status || 'LOBBY') as 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED',
            winnerUserIds: currentMatch.winner_user_ids,
            buyIn: currentMatch.buy_in || 10,
            mode: (currentMatch.mode || 'CASUAL') as 'RANKED' | 'CASUAL',
            createdBy: currentMatch.created_by
          };
          
          setGameState(transformedMatch);
          
          // If match changed to LIVE and we don't have WS connection, connect
          if (currentMatch.status === 'LIVE' && !ws) {
            console.log('[POOL-WS] 🎮 Match started, connecting WebSocket...');
            // Will be handled by realtime subscription
          }
        }
      }
    } catch (error) {
      console.error('[POOL-WS] ❌ Error polling match updates:', error);
    }
  }, [user, ws]);

  // Setup realtime subscription for match updates
  const setupRealtimeSubscription = useCallback((matchId: string) => {
    if (!user || realtimeChannelRef.current) return;
    
    console.log('[POOL-WS] 🔔 Setting up realtime subscription for match:', matchId);
    
    const channel = supabase
      .channel(`pool_match_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pool_matches',
          filter: `id=eq.${matchId}`
        },
        (payload) => {
          console.log('[POOL-WS] 🔔 Realtime match update:', payload);
          
          if (payload.new) {
            const match = payload.new as any;
            const transformedMatch: PoolGameState = {
              balls: match.balls || [],
              turnUserId: match.turn_user_id || '',
              players: (match.players || []).map((p: any) => ({
                userId: p.userId,
                seat: p.seat || 0,
                connected: p.connected || false,
                ready: p.ready || false,
                mmr: p.mmr || 1000,
                group: p.group
              })),
              gamePhase: (match.game_phase || 'BREAK') as 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL',
              ballInHand: match.ball_in_hand || false,
              shotClock: match.shot_clock || 60,
              status: (match.status || 'LOBBY') as 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED',
              winnerUserIds: match.winner_user_ids,
              buyIn: match.buy_in || 10,
              mode: (match.mode || 'CASUAL') as 'RANKED' | 'CASUAL',
              createdBy: match.created_by
            };
            
            setGameState(transformedMatch);
            
            // If match started, connect WebSocket
            if (match.status === 'LIVE' && !ws && currentMatchIdRef.current) {
              console.log('[POOL-WS] 🎮 Match started via realtime, connecting WebSocket...');
              // We'll connect WebSocket here directly without circular dependency
              if (currentMatchIdRef.current) {
                connectToMatchWebSocket(matchId);
              }
            }
          }
        }
      )
      .subscribe();
    
    realtimeChannelRef.current = channel;
  }, [user, ws]);

  const connectToMatchWebSocket = useCallback(async (matchId: string) => {
    console.log('[POOL-WS] 🔌 Connecting WebSocket to match:', matchId)
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
        console.log('[POOL-WS] Closing existing WebSocket connection')
        ws.close();
        setWs(null);
        setConnected(false);
      }

      const wsUrl = `wss://ighllleypgbkluhcihvs.supabase.co/functions/v1/pool-websocket`;
      console.log('[POOL-WS] Creating WebSocket connection to:', wsUrl)
      console.log('[POOL-WS] Match ID:', matchId)
      console.log('[POOL-WS] User ID:', user.id)
      
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
          userId: user.id,
          tokenPresent: !!joinMessage.token
        })
        
        // Join match immediately
        websocket.send(JSON.stringify(joinMessage));
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[POOL-WS] 📥 Message received:', {
            type: message.type,
            matchId: message.matchId,
            hasState: !!message.state || !!message.gameState,
            hasMatch: !!message.match,
            status: message.state?.status || message.match?.status || message.status,
            data: message
          });

          switch (message.type) {
            case 'joined':
              console.log('[POOL-WS] ✅ Successfully joined match:', message.matchId)
              break;
              
            case 'room_state':
              console.log('[POOL-WS] 🏠 Room state received:', {
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
                console.log('[POOL-WS] 🔄 Setting room state:', transformedMatch);
                setGameState(transformedMatch);
              }
              break;

            case 'match_state':
              console.log('[POOL-WS] 📊 Match state received:', message.match);
              if (message.match) {
                setGameState(message.match);
              }
              break;

            case 'match_started':
              console.log('[POOL-WS] 🎮 Match started! Received state:', {
                hasBalls: !!message.state?.balls || !!message.gameState?.balls,
                ballsCount: message.state?.balls?.length || message.gameState?.balls?.length,
                turnUserId: message.state?.turn_user_id || message.state?.turnUserId || message.gameState?.turnUserId,
                gamePhase: message.state?.game_phase || message.state?.gamePhase || message.gameState?.gamePhase,
                ballInHand: message.state?.ball_in_hand || message.state?.ballInHand || message.gameState?.ballInHand
              });
              
              // Handle both formats: message.state and message.gameState
              const gameData = message.state || message.gameState;
              if (gameData) {
                const transformedState: PoolGameState = {
                  balls: gameData.balls || [],
                  turnUserId: gameData.turn_user_id || gameData.turnUserId || '',
                  players: (gameData.players || []).map((p: any) => ({
                    userId: p.userId,
                    seat: p.seat || 0,
                    connected: p.connected || false,
                    ready: p.ready || false,
                    mmr: p.mmr || 1000,
                    group: p.group
                  })),
                  gamePhase: (gameData.game_phase || gameData.gamePhase || 'BREAK') as 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL',
                  ballInHand: gameData.ball_in_hand || gameData.ballInHand || false,
                  shotClock: gameData.shot_clock || gameData.shotClock || 60,
                  status: 'LIVE' as const,
                  winnerUserIds: gameData.winner_user_ids || gameData.winnerUserIds,
                  buyIn: gameData.buy_in || gameData.buyIn || 10,
                  mode: (gameData.mode || 'CASUAL') as 'RANKED' | 'CASUAL',
                  createdBy: gameData.created_by || gameData.createdBy
                };
                console.log('[POOL-WS] 🎯 Setting LIVE match state:', transformedState);
                setGameState(transformedState);
              }
              break;

            case 'start_countdown':
              console.log('[POOL-WS] ⏰ Countdown started:', message.seconds);
              // Could show countdown UI here
              break;

            case 'simulation_result':
              console.log('[POOL-WS] 🎱 Shot simulation result received:', {
                ballsCount: message.balls?.length,
                ballsPocketed: message.ballsPocketed?.length,
                fouls: message.fouls?.length,
                turnEnds: message.turnEnds,
                winner: message.winner,
                nextTurn: message.nextTurn
              });
              
              // Update game state with simulation results
              setGameState(prev => {
                if (!prev) return null;
                
                const newState = {
                  ...prev,
                  balls: message.balls || prev.balls,
                  ballInHand: message.fouls && message.fouls.length > 0,
                  status: (message.winner ? 'FINISHED' : prev.status) as 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED',
                  winnerUserIds: message.winner ? [message.winner] : prev.winnerUserIds,
                  turnUserId: message.nextTurn || prev.turnUserId
                };

                console.log('[POOL-WS] 🔄 Updated game state after shot:', {
                  ballInHand: newState.ballInHand,
                  turnUserId: newState.turnUserId,
                  status: newState.status
                });

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
              console.log('[POOL-WS] ⚪ Cue ball placed at:', { x: message.x, y: message.y })
              setGameState(prev => prev ? {
                ...prev,
                balls: prev.balls.map(ball =>
                  ball.type === 'CUE' ? { ...ball, x: message.x, y: message.y, inPocket: false } : ball
                ),
                ballInHand: false
              } : null);
              break;

            case 'player_joined':
              console.log('[POOL-WS] 👋 Player joined:', message.userId);
              setGameState(prev => prev ? {
                ...prev,
                players: prev.players.map(p => 
                  p.userId === message.userId ? { ...p, connected: true } : p
                )
              } : null);
              break;

            case 'player_disconnected':
              console.log('[POOL-WS] 💨 Player disconnected:', message.userId);
              setGameState(prev => prev ? {
                ...prev,
                players: prev.players.map(p => 
                  p.userId === message.userId ? { ...p, connected: false } : p
                )
              } : null);
              break;

            case 'shot_rejected':
              console.error('[POOL-WS] ❌ Shot rejected:', message.reason)
              setError(`Tacada rejeitada: ${message.reason}`);
              setTimeout(() => setError(null), 3000);
              break;

            case 'error':
              console.error('[POOL-WS] ❌ Server error:', message.message)
              setError(message.message);
              setTimeout(() => setError(null), 5000);
              break;

            case 'pong':
              console.log('[POOL-WS] 🏓 Pong received')
              break;

            default:
              console.log('[POOL-WS] ❓ Unknown message type:', message.type, message);
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
            connectToMatchWebSocket(matchId);
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
  }, [user, ws]);

  const connectToMatch = useCallback(async (matchId: string) => {
    console.log('[POOL-WS] 🎯 Connecting to match:', matchId);
    currentMatchIdRef.current = matchId;
    
    // Start polling for match updates
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Setup realtime subscription
    setupRealtimeSubscription(matchId);
    
    // Initial poll
    await pollMatchUpdates(matchId);
    
    // Start polling every second
    pollingIntervalRef.current = setInterval(() => {
      pollMatchUpdates(matchId);
    }, 1000);
    
    console.log('[POOL-WS] ✅ Started monitoring match:', matchId);
  }, [pollMatchUpdates, setupRealtimeSubscription]);

  const shoot = useCallback((shot: ShotInput) => {
    console.log('[POOL-WS] 🎯 Executing shot:', {
      dir: shot.dir,
      power: shot.power,
      spin: shot.spin,
      aimPoint: shot.aimPoint,
      connected,
      hasWs: !!ws
    })
    
    if (ws && connected) {
      const shotMessage = {
        type: 'shoot',
        ...shot
      };
      console.log('[POOL-WS] 📤 Sending shot message:', shotMessage)
      ws.send(JSON.stringify(shotMessage));
    } else {
      console.error('[POOL-WS] ❌ Cannot shoot - not connected:', { hasWs: !!ws, connected })
    }
  }, [ws, connected]);

  const placeCueBall = useCallback((x: number, y: number) => {
    console.log('[POOL-WS] ⚪ Placing cue ball at:', { x, y, connected, hasWs: !!ws })
    
    if (ws && connected) {
      const placeMessage = {
        type: 'place_cue_ball',
        x,
        y
      };
      console.log('[POOL-WS] 📤 Sending place cue ball message:', placeMessage)
      ws.send(JSON.stringify(placeMessage));
    } else {
      console.error('[POOL-WS] ❌ Cannot place cue ball - not connected:', { hasWs: !!ws, connected })
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
    console.log('[POOL-WS] 🔌 Disconnecting from match');
    
    // Clear timeouts and intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = undefined;
    }
    
    // Unsubscribe from realtime
    if (realtimeChannelRef.current) {
      console.log('[POOL-WS] 🔔 Unsubscribing from realtime channel');
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    
    // Close WebSocket
    if (ws) {
      ws.close(1000, 'User disconnect');
      setWs(null);
    }
    
    // Reset state
    currentMatchIdRef.current = null;
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
