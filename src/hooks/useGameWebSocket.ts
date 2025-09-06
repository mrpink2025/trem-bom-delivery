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

    setConnectionStatus('connecting');

    try {
      // URL do WebSocket - usar a URL completa do projeto Supabase
      const wsUrl = 'wss://ighllleypgbkluhcihvs.functions.supabase.co/games-websocket';
      
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = async () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;

        // Entrar na partida
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            newSocket.send(JSON.stringify({
              type: 'join_match',
              matchId,
              userId,
              token: session.access_token
            }));
          }
        } catch (error) {
          console.error('Erro ao obter sessão:', error);
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
          console.log('Mensagem recebida:', message);

          switch (message.type) {
            case 'match_state':
              setGameState(message.match.game_state || null);
              break;

            case 'game_update':
              setGameState(message.gameState);
              break;

            case 'match_started':
              setGameState(message.gameState);
              break;

            case 'match_finished':
              setGameState(message.gameState);
              break;

            case 'player_connected':
            case 'player_disconnected':
            case 'player_ready':
              // Atualizar UI se necessário
              break;

            case 'chat_message':
              // Implementar sistema de chat se necessário
              break;

            case 'error':
              console.error('Erro do servidor:', message.error);
              break;

            case 'pong':
              // Resposta do ping
              break;
          }
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket desconectado:', event.code, event.reason);
        setIsConnected(false);
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && currentMatchId.current) {
          attemptReconnect();
        } else {
          setConnectionStatus('disconnected');
        }
      };

      newSocket.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        setConnectionStatus('error');
      };

      setSocket(newSocket);
      currentMatchId.current = matchId;

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [user, attemptReconnect]);

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