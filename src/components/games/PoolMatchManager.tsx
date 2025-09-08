import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePoolSSE } from '@/hooks/usePoolSSE';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';
import { supabase } from '@/integrations/supabase/client';
import PoolLobby from './PoolLobby';
import PoolGame from './PoolGame';
import Pool3DGame from './Pool3DGame';
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
  const [use3D, setUse3D] = useState(true); // Default to 3D for better experience
  const [showForceLeave, setShowForceLeave] = useState(false); // Show force leave button for stuck matches

  // Hooks for real-time connection
  const { gameState, connected: sseConnected, connectToMatch, disconnect } = usePoolSSE();
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
    setShowForceLeave(false);
    
    toast({
      title: "Saiu da partida",
      description: "Retornando ao lobby",
    });
  };

  const handleForceLeaveMatch = async () => {
    if (!currentMatchId || !user) return;
    
    console.log('[PoolMatchManager] 🔧 Force leaving stuck match:', currentMatchId);
    
    try {
      // Try to cancel the match
      const { error } = await supabase
        .from('pool_matches')
        .update({ status: 'CANCELLED' })
        .eq('id', currentMatchId);
      
      if (error) {
        console.error('Failed to cancel match:', error);
      }
      
      handleLeaveMatch();
      
      toast({
        title: "Partida cancelada",
        description: "Você saiu da partida travada",
      });
    } catch (error) {
      console.error('Error force leaving match:', error);
      // Force leave anyway
      handleLeaveMatch();
    }
  };

  const handleShoot = (shotData: any) => {
    console.log('[PoolMatchManager] 🎱 Executing shot:', shotData);
    console.log('[PoolMatchManager] 🔬 Sending via WebSocket...');
    
    // Send game action through WebSocket
    if (sendGameAction) {
      sendGameAction({
        type: 'SHOOT',
        matchId: currentMatchId,
        userId: user?.id,
        ...shotData
      });
    } else {
      console.warn('[PoolMatchManager] WebSocket not available');
    }
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
      matchId: currentMatchId,
      playersConnected: gameState.players?.filter((p: any) => p.connected).length || 0,
      playersReady: gameState.players?.filter((p: any) => p.ready).length || 0,
      gamePhase: gameState.game_phase,
      turnUserId: gameState.turn_user_id
    });

    // Switch to game mode when match is LIVE
    if (gameState.status === 'LIVE' && gameMode === 'lobby') {
      console.log('[PoolMatchManager] 🎮 Switching to game mode - match is LIVE');
      setGameMode('game');
      
      // Small delay to ensure SSE state is stable before WebSocket connection
      setTimeout(() => {
        if (currentMatchId && user) {
          console.log('[PoolMatchManager] 🔗 Connecting WebSocket for gameplay...');
          wsJoinMatch(currentMatchId, user.id);
        }
      }, 500);
      
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
    if (!user?.id) return;

    const checkForActiveMatch = async () => {
      // Only check if we don't already have an active match
      if (currentMatchId) {
        console.log('[PoolMatchManager] ⏭️ Skipping check - already have active match:', currentMatchId);
        return;
      }
      
      console.log('[PoolMatchManager] 🔍 Checking for active matches for user:', user.id);
      
      try {
        // Check both LIVE and LOBBY matches
        const [liveResponse, lobbyResponse] = await Promise.all([
          supabase.functions.invoke('get-pool-matches-live'),
          supabase.functions.invoke('get-pool-matches-lobby')
        ]);
        
        console.log('[PoolMatchManager] 📊 Match check results:', {
          live: liveResponse.data?.length || 0,
          lobby: lobbyResponse.data?.length || 0,
          liveMatches: liveResponse.data,
          lobbyMatches: lobbyResponse.data
        });
        
        // First priority: check if user is in a LIVE match
        if (liveResponse.data && liveResponse.data.length > 0) {
          console.log('[PoolMatchManager] 🔍 Checking LIVE matches for user...');
          
          const userLiveMatch = liveResponse.data.find((match: any) => {
            console.log('[PoolMatchManager] 📝 Checking match players:', match.players);
            return match.players?.some((p: any) => {
              const playerId = p.user_id || p.userId;
              console.log('[PoolMatchManager] 👤 Comparing player:', playerId, 'with user:', user.id);
              return playerId === user.id;
            });
          });
          
          if (userLiveMatch) {
            console.log('[PoolMatchManager] 🎯 Found LIVE match, checking if both players connected:', userLiveMatch.id);
            
            // Check if both players are connected
            const connectedPlayers = userLiveMatch.players?.filter((p: any) => p.connected) || [];
            console.log('[PoolMatchManager] 📊 Connected players:', connectedPlayers.length, '/', userLiveMatch.players?.length);
            
            // Show force leave option if match seems stuck (only one player connected for too long)
            if (connectedPlayers.length < 2) {
              const matchAge = Date.now() - new Date(userLiveMatch.created_at).getTime();
              console.log('[PoolMatchManager] ⏰ Match age in minutes:', matchAge / (1000 * 60));
              
              // If match is older than 2 minutes and not fully connected, show force leave
              if (matchAge > 2 * 60 * 1000) {
                setShowForceLeave(true);
                toast({
                  title: "Partida travada detectada",
                  description: "Use o botão 'Sair da Partida' se estiver preso",
                  variant: "destructive"
                });
              }
            }
            
            setGameMode('game'); // Set game mode immediately for live matches
            setCurrentMatchId(userLiveMatch.id);
            
            // Connect directly via SSE first to get current state
            await connectToMatch(userLiveMatch.id);
            
            // Then connect WebSocket for gameplay with a small delay
            setTimeout(() => {
              console.log('[PoolMatchManager] 🔗 Connecting WebSocket for LIVE match...');
              wsJoinMatch(userLiveMatch.id, user.id);
            }, 1000);
            
            toast({
              title: "Reconectado à partida!",
              description: "Sua partida já estava em andamento",
            });
            return;
          }
        }
        
        // Second priority: check if user is in a LOBBY match
        if (lobbyResponse.data && lobbyResponse.data.length > 0) {
          console.log('[PoolMatchManager] 🔍 Checking LOBBY matches for user...');
          
          const userLobbyMatch = lobbyResponse.data.find((match: any) => {
            console.log('[PoolMatchManager] 📝 Checking lobby match players:', match.players);
            return match.players?.some((p: any) => {
              const playerId = p.user_id || p.userId;
              console.log('[PoolMatchManager] 👤 Comparing lobby player:', playerId, 'with user:', user.id);
              return playerId === user.id;
            });
          });
          
          if (userLobbyMatch) {
            console.log('[PoolMatchManager] 🎯 Found LOBBY match, joining:', userLobbyMatch.id);
            await handleJoinMatch(userLobbyMatch.id);
            return;
          }
        }
        
        console.log('[PoolMatchManager] ℹ️ No active matches found for user');
        
      } catch (error) {
        console.error('[PoolMatchManager] ❌ Error checking for active matches:', error);
      }
    };

    // Initial check only - no periodic interval to prevent reconnection loops
    checkForActiveMatch();
  }, [user?.id, currentMatchId]); // Include currentMatchId in dependencies

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
              <div className="flex items-center gap-2">
                {showForceLeave && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleForceLeaveMatch}
                  >
                    Sair da Partida
                  </Button>
                )}
                {renderConnectionIndicator()}
              </div>
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
    
    console.log('[PoolMatchManager] 🎮 Rendering game mode:', {
      gameState: !!gameState,
      balls: gameState.balls?.length || 0,
      turnUserId: gameState.turn_user_id,
      isMyTurn,
      gamePhase: gameState.game_phase,
      status: gameState.status
    });
    
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
            <div className="flex items-center gap-2">
              {showForceLeave && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleForceLeaveMatch}
                >
                  Sair da Partida
                </Button>
              )}
              {renderConnectionIndicator()}
            </div>
          </div>
        </Card>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button
              variant={!use3D ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUse3D(false)}
            >
              Visão 2D
            </Button>
            <Button
              variant={use3D ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUse3D(true)}
            >
              Visão 3D Realística
            </Button>
          </div>
        </div>
        
        {use3D ? (
          <Pool3DGame
            gameState={{
              balls: gameState.balls || [],
              turnUserId: gameState.turn_user_id || '',
              players: gameState.players || [],
              gamePhase: (gameState.game_phase || 'BREAK') as 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL',
              ballInHand: gameState.ball_in_hand,
              shotClock: gameState.shot_clock,
              status: gameState.status as 'CANCELLED' | 'LOBBY' | 'LIVE' | 'FINISHED',
              winnerUserIds: gameState.winner_user_ids
            }}
            isMyTurn={isMyTurn}
            playerId={user.id}
            onShoot={handleShoot}
            onPlaceCueBall={handlePlaceCueBall}
            onSendMessage={handleSendMessage}
            messages={chatMessages}
          />
        ) : (
          <PoolGame
            gameState={{
              balls: gameState.balls || [],
              turnUserId: gameState.turn_user_id || '',
              players: gameState.players || [],
              gamePhase: (gameState.game_phase || 'BREAK') as 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL',
              ballInHand: gameState.ball_in_hand,
              shotClock: gameState.shot_clock,
              status: gameState.status as 'CANCELLED' | 'LOBBY' | 'LIVE' | 'FINISHED',
              winnerUserIds: gameState.winner_user_ids
            }}
            isMyTurn={isMyTurn}
            playerId={user.id}
            onShoot={handleShoot}
            onPlaceCueBall={handlePlaceCueBall}
            onSendMessage={handleSendMessage}
            messages={chatMessages}
          />
        )}
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