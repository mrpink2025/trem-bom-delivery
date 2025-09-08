import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePoolSSE } from '@/hooks/usePoolSSE';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';
import { supabase } from '@/integrations/supabase/client';
import PoolLobby from './PoolLobby';
import PoolGame from './PoolGame';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

interface PoolMatchManagerProps {
  userCredits: number;
}

const PoolMatchManager: React.FC<PoolMatchManagerProps> = ({ userCredits }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'lobby' | 'game'>('lobby');
  const [chatMessages, setChatMessages] = useState<Array<{ userId: string; message: string; timestamp: number }>>([]);

  // Hooks for real-time connection
  const { gameState: sseGameState, connected: sseConnected, connectToMatch, disconnect } = usePoolSSE();
  const { 
    gameState: wsGameState, 
    isConnected: wsConnected, 
    joinMatch: wsJoinMatch, 
    leaveMatch: wsLeaveMatch,
    sendGameAction,
    sendChatMessage,
    connectionStatus 
  } = useGameWebSocket();

  // Use SSE for lobby, WebSocket for active games
  const gameState = gameMode === 'game' ? wsGameState : sseGameState;
  const isConnected = gameMode === 'game' ? wsConnected : sseConnected;

  const handleJoinMatch = async (matchId: string) => {
    console.log('[PoolMatchManager] 🎯 Joining match:', matchId);
    
    setCurrentMatchId(matchId);
    
    try {
      // Start with SSE connection to get initial state
      await connectToMatch(matchId);
      
      toast({
        title: "Conectando à partida...",
        description: "Estabelecendo conexão em tempo real",
      });
    } catch (error) {
      console.error('[PoolMatchManager] Error joining match:', error);
      toast({
        title: "Erro ao conectar",
        description: "Tente novamente em alguns segundos",
        variant: "destructive"
      });
    }
  };

  const handleLeaveMatch = () => {
    console.log('[PoolMatchManager] 🚪 Leaving match');
    
    // Disconnect from both SSE and WebSocket
    disconnect();
    wsLeaveMatch();
    
    setCurrentMatchId(null);
    setGameMode('lobby');
    setChatMessages([]);
    
    toast({
      title: "Saiu da partida",
      description: "Retornando ao lobby",
    });
  };

  const handleShoot = (shot: any) => {
    if (!currentMatchId || !user) return;
    
    console.log('[PoolMatchManager] 🎱 Executing shot:', shot);
    sendGameAction({
      type: 'SHOOT',
      matchId: currentMatchId,
      userId: user.id,
      ...shot
    });
  };

  const handlePlaceCueBall = (x: number, y: number) => {
    if (!currentMatchId || !user) return;
    
    console.log('[PoolMatchManager] 🎱 Placing cue ball:', { x, y });
    sendGameAction({
      type: 'PLACE_CUE_BALL',
      matchId: currentMatchId,
      userId: user.id,
      x,
      y
    });
  };

  const handleSendMessage = (message: string) => {
    if (!currentMatchId || !user) return;
    
    console.log('[PoolMatchManager] 💬 Sending message:', message);
    sendChatMessage(message);
    
    // Add to local state immediately for better UX
    setChatMessages(prev => [...prev, {
      userId: user.id,
      message,
      timestamp: Date.now()
    }]);
  };

  // Monitor game state changes and switch modes accordingly
  useEffect(() => {
    if (!gameState) return;

    console.log('[PoolMatchManager] 📊 Game state update:', {
      status: gameState.status,
      currentMode: gameMode,
      matchId: currentMatchId
    });

    // Switch to game mode when match is LIVE
    if (gameState.status === 'LIVE' && gameMode === 'lobby') {
      console.log('[PoolMatchManager] 🎮 Switching to game mode - match is LIVE');
      setGameMode('game');
      
      // Connect via WebSocket for real-time gameplay
      if (currentMatchId && user) {
        wsJoinMatch(currentMatchId, user.id);
      }
      
      toast({
        title: "Partida iniciada!",
        description: "Boa sorte na partida de sinuca!",
      });
    }
    
    // Switch back to lobby if match ends
    if (['FINISHED', 'CANCELLED'].includes(gameState.status) && gameMode === 'game') {
      console.log('[PoolMatchManager] 🏁 Match ended, returning to lobby');
      
      const isWinner = gameState.winner_user_ids?.includes(user?.id || '');
      toast({
        title: isWinner ? "Você venceu!" : "Partida finalizada",
        description: isWinner ? "Parabéns pela vitória!" : "Boa partida!",
      });
      
      // Delay return to lobby to show the result
      setTimeout(() => {
        handleLeaveMatch();
      }, 3000);
    }
  }, [gameState?.status, gameMode, currentMatchId, user?.id]);

  // Auto-detect if player is in a live match on mount
  useEffect(() => {
    if (!user?.id || currentMatchId) return;

    const checkForActiveMatch = async () => {
      console.log('[PoolMatchManager] 🔍 Checking for active matches...');
      
      try {
        const { data: liveMatches } = await supabase.functions.invoke('get-pool-matches-live');
        
        if (liveMatches && liveMatches.length > 0) {
          // Check if user is in any live match
          const userMatch = liveMatches.find((match: any) => 
            match.players?.some((p: any) => p.user_id === user.id || p.userId === user.id)
          );
          
          if (userMatch) {
            console.log('[PoolMatchManager] 🎯 Found active match, joining:', userMatch.id);
            await handleJoinMatch(userMatch.id);
          }
        }
      } catch (error) {
        console.error('[PoolMatchManager] Error checking for active matches:', error);
      }
    };

    checkForActiveMatch();
  }, [user?.id]);

  // Connection status indicator
  const getConnectionStatus = () => {
    if (gameMode === 'lobby') {
      return sseConnected ? 'connected' : 'disconnected';
    } else {
      return connectionStatus;
    }
  };

  const renderConnectionIndicator = () => {
    const status = getConnectionStatus();
    const isConnectedStatus = status === 'connected';
    
    return (
      <Badge variant={isConnectedStatus ? "default" : "destructive"} className="gap-1">
        {isConnectedStatus ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {status === 'connecting' ? 'Conectando...' : 
         status === 'connected' ? 'Conectado' : 
         status === 'error' ? 'Erro de conexão' : 'Desconectado'}
      </Badge>
    );
  };

  if (gameMode === 'lobby') {
    return (
      <div className="space-y-4">
        {currentMatchId && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleLeaveMatch}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h3 className="font-semibold">Aguardando partida iniciar...</h3>
                  <p className="text-sm text-muted-foreground">Match ID: {currentMatchId}</p>
                </div>
              </div>
              {renderConnectionIndicator()}
            </div>
            
            {gameState && (
              <div className="mt-3 flex gap-2">
                <Badge variant="outline">
                  Jogadores: {gameState.players?.length || 0}/2
                </Badge>
                <Badge variant="outline">
                  Status: {gameState.status}
                </Badge>
                {gameState.players && (
                  <Badge variant="secondary">
                    Conectados: {gameState.players.filter((p: any) => p.connected).length}
                  </Badge>
                )}
              </div>
            )}
          </Card>
        )}
        
        <PoolLobby 
          onJoinMatch={handleJoinMatch} 
          userCredits={userCredits}
        />
      </div>
    );
  }

  if (gameMode === 'game' && gameState && user) {
    const isMyTurn = gameState.turn_user_id === user.id;
    
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleLeaveMatch}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h3 className="font-semibold">Partida de Sinuca</h3>
                <p className="text-sm text-muted-foreground">Match ID: {currentMatchId}</p>
              </div>
            </div>
            {renderConnectionIndicator()}
          </div>
        </Card>
        
        <PoolGame
          gameState={{
            balls: gameState.balls || [],
            turnUserId: gameState.turn_user_id || '',
            players: gameState.players || [],
            gamePhase: gameState.game_phase || 'BREAK',
            ballInHand: gameState.ball_in_hand,
            shotClock: gameState.shot_clock,
            status: gameState.status,
            winnerUserIds: gameState.winner_user_ids
          }}
          isMyTurn={isMyTurn}
          playerId={user.id}
          onShoot={handleShoot}
          onPlaceCueBall={handlePlaceCueBall}
          onSendMessage={handleSendMessage}
          messages={chatMessages}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};

export default PoolMatchManager;