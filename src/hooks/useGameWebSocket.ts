import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface GameState {
  players: string[];
  board?: any[];
  currentPlayer?: string;
  turn?: number;
  winner?: string;
  result?: string;
  winningLine?: number[];
  [key: string]: any;
}

interface UseGameWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  gameState: GameState | null;
  joinMatch: (matchId: string, userId: string) => Promise<void>;
  leaveMatch: () => void;
  sendGameAction: (action: any) => void;
  sendChatMessage: (message: string) => void;
  setReady: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const useGameWebSocket = (): UseGameWebSocketReturn => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  const currentMatchId = useRef<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectDelay = useRef(1000);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  // Limpar recursos
  const cleanup = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    
    if (socket) {
      socket.close();
      setSocket(null);
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setGameState(null);
    currentMatchId.current = null;
    reconnectAttempts.current = 0;
  }, [socket]);

  // Tentar reconectar
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts || !currentMatchId.current || !user) {
      setConnectionStatus('error');
      return;
    }

    reconnectAttempts.current++;
    console.log(`Tentando reconectar... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (currentMatchId.current && user) {
        connectToMatch(currentMatchId.current, user.id);
      }
    }, reconnectDelay.current);

    // Aumentar delay exponencialmente
    reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000);
  }, [user]);

  // Conectar ao WebSocket
  const connectToMatch = useCallback(async (matchId: string, userId: string) => {
    if (!user) return;

    console.log(`🎮 [useGameWebSocket] Connecting to match: ${matchId} as user: ${userId}`);
    setConnectionStatus('connecting');

    try {
      // Close existing connection first
      if (socket) {
        socket.close();
        setSocket(null);
      }

      // URL do WebSocket com cache busting
      const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('sandbox.lovable.dev');
      const protocol = isDev ? 'ws:' : 'wss:';
      const baseUrl = isDev 
        ? 'localhost:54321/functions/v1/pool-websocket'
        : 'ighllleypgbkluhcihvs.functions.supabase.co/pool-websocket';
      const wsUrl = `${protocol}//${baseUrl}`;
      console.log(`🎮 [useGameWebSocket] Connecting to WebSocket: ${wsUrl} (dev: ${isDev})`);
      
      // Força reload do browser se estiver tentando conectar multiple vezes
      if (reconnectAttempts.current > 2) {
        console.log('🎮 [useGameWebSocket] ⚠️ Multiple connection failures, may need page refresh');
      }
      
      const newSocket = new WebSocket(wsUrl);
      
      // Timeout para conexão
      const connectionTimeout = setTimeout(() => {
        if (newSocket.readyState === WebSocket.CONNECTING) {
          console.error('🎮 [useGameWebSocket] ❌ Connection timeout');
          newSocket.close();
          setConnectionStatus('error');
        }
      }, 10000); // 10 segundos timeout
      
      newSocket.onopen = async () => {
        clearTimeout(connectionTimeout);
        console.log('🎮 [useGameWebSocket] ✅ WebSocket connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;

        // Entrar na partida com token de autenticação
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const joinMessage = {
              type: 'join_match',
              matchId,
              userId,
              token: session.access_token
            };
            console.log('🎮 [useGameWebSocket] 📤 Sending join message:', joinMessage);
            newSocket.send(JSON.stringify(joinMessage));
          } else {
            console.error('🎮 [useGameWebSocket] ❌ No auth token available');
          }
        } catch (error) {
          console.error('🎮 [useGameWebSocket] ❌ Error getting session:', error);
        }

        // Iniciar ping/pong para manter conexão viva
        pingInterval.current = setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            newSocket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('🎮 [useGameWebSocket] 📨 Received message:', message);

          switch (message.type) {
            case 'connection_ready':
              console.log('🎮 [useGameWebSocket] ✅ Connection ready confirmed');
              break;

            case 'join_confirmed':
              console.log('🎮 [useGameWebSocket] ✅ Join confirmed for match:', message.matchId);
              break;

            case 'match_data':
              console.log('🎮 [useGameWebSocket] 🎯 Match data received');
              console.log('🎮 [useGameWebSocket] 📊 Raw match data:', message.match);
              if (message.match) {
                // Use the exact field names from the database (snake_case)
                const gameState = {
                  players: message.match.players || [],
                  balls: message.match.balls || [],
                  turn_user_id: message.match.turn_user_id, // Database field name
                  game_phase: message.match.game_phase,     // Database field name
                  ball_in_hand: message.match.ball_in_hand, // Database field name
                  shot_clock: message.match.shot_clock,     // Database field name
                  status: message.match.status,
                  matchId: message.match.id,
                  winner_user_ids: message.match.winner_user_ids
                };
                console.log('🎮 [useGameWebSocket] 🎯 Mapped game state:', {
                  turn_user_id: gameState.turn_user_id,
                  game_phase: gameState.game_phase,
                  ball_in_hand: gameState.ball_in_hand,
                  shot_clock: gameState.shot_clock,
                  players: gameState.players?.length,
                  balls: gameState.balls?.length
                });
                console.log('🎮 [useGameWebSocket] 🎯 Setting game state:', gameState);
                setGameState(gameState);
              }
              break;

            case 'match_state':
              console.log('🎮 [useGameWebSocket] 🎯 Match state update received');
              setGameState(message.match?.game_state || message.gameState || null);
              break;

            case 'game_update':
              console.log('🎮 [useGameWebSocket] 🎲 Game update received');
              setGameState(message.gameState);
              break;

            case 'match_started':
              console.log('🎮 [useGameWebSocket] 🚀 Match started');
              setGameState(message.gameState);
              break;

            case 'match_finished':
              console.log('🎮 [useGameWebSocket] 🏁 Match finished');
              setGameState(message.gameState);
              break;

            case 'player_connected':
            case 'player_disconnected':
            case 'player_ready':
              console.log(`🎮 [useGameWebSocket] 👤 Player event: ${message.type}`);
              break;

            case 'chat_message':
              console.log('🎮 [useGameWebSocket] 💬 Chat message received');
              break;

            case 'error':
              console.error('🎮 [useGameWebSocket] ❌ Server error:', message.error || message.message);
              break;

            case 'pong':
              console.log('🎮 [useGameWebSocket] 🏓 Pong received - connection alive');
              break;

            case 'heartbeat':
              // Responder ao heartbeat
              if (newSocket.readyState === WebSocket.OPEN) {
                newSocket.send(JSON.stringify({ type: 'heartbeat_response' }));
              }
              break;

            default:
              console.log('🎮 [useGameWebSocket] ❓ Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('🎮 [useGameWebSocket] ❌ Error processing message:', error, 'Raw data:', event.data);
        }
      };

      newSocket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`🎮 [useGameWebSocket] 🔌 WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Códigos de fechamento específicos
        switch (event.code) {
          case 1000: // Normal closure
            console.log('🎮 [useGameWebSocket] ✅ Clean disconnect');
            setConnectionStatus('disconnected');
            break;
          case 1001: // Going away
          case 1006: // Abnormal closure
            console.log('🎮 [useGameWebSocket] 🔄 Connection lost, attempting to reconnect...');
            if (currentMatchId.current) {
              attemptReconnect();
            } else {
              setConnectionStatus('error');
            }
            break;
          default:
            console.log(`🎮 [useGameWebSocket] ❌ Unexpected closure code: ${event.code}`);
            if (currentMatchId.current) {
              attemptReconnect();
            } else {
              setConnectionStatus('error');
            }
        }
      };

      newSocket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('🎮 [useGameWebSocket] ❌ WebSocket error:', error);
        console.error('🎮 [useGameWebSocket] ❌ WebSocket state:', newSocket.readyState);
        console.error('🎮 [useGameWebSocket] ❌ WebSocket URL:', wsUrl);
        setConnectionStatus('error');
        
        // Se o erro ocorreu durante a conexão, tentar novamente com protocolo diferente
        if (newSocket.readyState === WebSocket.CONNECTING || newSocket.readyState === WebSocket.CLOSED) {
          console.log('🎮 [useGameWebSocket] 🔄 Trying fallback connection...');
          // Tentar com protocolo HTTP em vez de WebSocket se estiver em dev
          if (isDev && protocol === 'ws:') {
            setTimeout(() => {
              if (currentMatchId.current && user) {
                // Tentar conectar via polling como fallback
                console.log('🎮 [useGameWebSocket] 📡 WebSocket failed, using SSE fallback');
                setConnectionStatus('error');
              }
            }, 1000);
          }
        }
      };

      setSocket(newSocket);
      currentMatchId.current = matchId;

    } catch (error) {
      console.error('🎮 [useGameWebSocket] ❌ Error connecting WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [user, attemptReconnect, socket]);

  // Entrar em partida
  const joinMatch = useCallback(async (matchId: string, userId: string) => {
    await connectToMatch(matchId, userId);
  }, [connectToMatch]);

  // Sair da partida
  const leaveMatch = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Enviar ação do jogo
  const sendGameAction = useCallback((action: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'game_action',
        action
      }));
    }
  }, [socket, isConnected]);

  // Enviar mensagem de chat
  const sendChatMessage = useCallback((message: string) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'chat_message',
        content: message
      }));
    }
  }, [socket, isConnected]);

  // Marcar como pronto
  const setReady = useCallback(() => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'ready'
      }));
    }
  }, [socket, isConnected]);

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);


  return {
    socket,
    isConnected,
    gameState,
    joinMatch,
    leaveMatch,
    sendGameAction,
    sendChatMessage,
    setReady,
    connectionStatus
  };
};