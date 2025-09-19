import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePoolEvents } from '@/hooks/usePoolEvents';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import PoolLobby from './PoolLobby';
import Pool3DGame from './Pool3DGame';
import PoolGame from './PoolGame';
import { PoolDebugPanel } from './PoolDebugPanel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

interface PoolMatchManagerProps {
  userCredits: number;
}

export function PoolMatchManager({ userCredits }: PoolMatchManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'lobby' | 'game'>('lobby');
  const [use3D, setUse3D] = useState(true);
  const [gameState, setGameState] = useState<any>(null);

  // Use new Realtime hook for events (fallback only)
  const { connected: rtConnected, frames: dbFrames, finalState } = usePoolEvents(currentMatchId || '');
  
  // Use WebSocket for real-time connection (PRIORITY)
  const { 
    isConnected: wsConnected, 
    gameState: wsGameState, 
    joinMatch, 
    setReady,
    connectionStatus,
    frames: wsFrames,
    lastState: wsLastState,
    shoot: wsShoot,
    sendChatMessage 
  } = useGameWebSocket();

  // Prioritize WebSocket frames over DB frames - REMOVIDO SCALING DESNECESSÁRIO
  const frames = (wsFrames && wsFrames.length > 0)
    ? wsFrames.map((m: any) => ({ t: m.t, balls: m.balls, sounds: m.sounds || [] }))
    : (dbFrames || []);
  const lastState = wsLastState || finalState;

  // Connect to match via WebSocket when currentMatchId changes
  useEffect(() => {
    if (currentMatchId && user?.id) {
      console.log('🎱 [PoolMatchManager] Connecting to match via WebSocket:', currentMatchId);
      joinMatch(currentMatchId, user.id);
    }
  }, [currentMatchId, user?.id, joinMatch]);

  // Pool3DGame com compatibilidade para estados legados
  const scaleFramesForLegacy = (frames: any[]) => {
    if (!frames || frames.length === 0) return frames;
    
    // Detectar se são coordenadas pequenas (legacy 800x400)
    const sampleBall = frames[0]?.balls?.[0];
    if (sampleBall && sampleBall.x <= 1000) {
      console.log('🔄 Scaling legacy frames 2.8x for display');
      return frames.map(frame => ({
        ...frame,
        balls: frame.balls?.map(ball => ({
          ...ball,
          x: ball.x * 2.8,
          y: ball.y * 2.8,
          vx: (ball.vx || 0) * 2.8,
          vy: (ball.vy || 0) * 2.8
        })) || []
      }));
    }
    return frames;
  };

  const scaleStateForLegacy = (state: any) => {
    if (!state?.balls) return state;
    
    // Detectar coordenadas pequenas
    const maxX = Math.max(...state.balls.map(b => b.x || 0));
    if (maxX <= 1000) {
      console.log('🔄 Scaling legacy state 2.8x for display');
      return {
        ...state,
        balls: state.balls.map(ball => ({
          ...ball,
          x: (ball.x || 0) * 2.8,
          y: (ball.y || 0) * 2.8,
          vx: (ball.vx || 0) * 2.8,
          vy: (ball.vy || 0) * 2.8
        }))
      };
    }
    return state;
  };

  // ExecuteShot - usando sempre pool-game-action diretamente para confiabilidade
  const executeShot = useCallback(async (shot: { dir: number; power: number; spin: { sx: number; sy: number }; aimPoint?: { x: number; y: number } }) => {
    if (!currentMatchId || !user?.id) return;
    
    console.log('🎯 [PoolMatchManager] Executing shot via pool-game-action:', shot);

    try {
      const { data, error } = await supabase.functions.invoke('pool-game-action', {
        body: {
          type: 'SHOOT',
          matchId: currentMatchId,
          ...shot
        }
      });
      
      if (error) {
        console.error('❌ [PoolMatchManager] Shot failed:', error);
        toast({
          title: "Erro na tacada",
          description: "Não foi possível executar a tacada. Tente novamente.",
          variant: "destructive"
        });
      } else {
        console.log('✅ [PoolMatchManager] Shot executed successfully:', data);
        toast({ title: "Tacada executada!", description: "Aguarde a simulação..." });
      }
    } catch (error) {
      console.error('❌ [PoolMatchManager] Shot error:', error);
      toast({
        title: "Erro na tacada",
        description: "Erro interno. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [currentMatchId, user?.id, toast]);

  const handleJoinMatch = (matchId: string) => {
    console.log('[PoolMatchManager] Joining match:', matchId);
    setCurrentMatchId(matchId);
  };

  const handleLeaveMatch = () => {
    console.log('[PoolMatchManager] Leaving match');
    setCurrentMatchId(null);
    setGameMode('lobby');
    setGameState(null);
  };

  // Monitor match state and switch to game mode when LIVE
  useEffect(() => {
    if (!currentMatchId) return;

    const checkMatchStatus = async () => {
      const { data: match } = await supabase
        .from('pool_matches')
        .select('*')
        .eq('id', currentMatchId)
        .single();
      
      if (match) {
        console.log('🎱 PoolMatchManager: Match data loaded:', { 
          id: match.id,
          status: match.status,
          gameState: !!match.game_state,
          ballsCount: (match.game_state as any)?.balls?.length || 0,
          firstBall: (match.game_state as any)?.balls?.[0] || 'NO BALLS'
        });
        
        setGameState(match);
        
        if (match.status === 'LIVE' && gameMode === 'lobby') {
          setGameMode('game');
          toast({
            title: "Partida iniciada!",
            description: "Boa sorte na partida de sinuca!",
          });
        } else if (['FINISHED', 'CANCELLED'].includes(match.status) && gameMode === 'game') {
          toast({
            title: "Partida finalizada",
            description: "Retornando ao lobby",
          });
          handleLeaveMatch();
        }
      }
    };

    checkMatchStatus();
    const interval = setInterval(checkMatchStatus, 2000);
    return () => clearInterval(interval);
  }, [currentMatchId, gameMode]);

  // Apply frames as they arrive from pool events
  useEffect(() => {
    if (frames && frames.length > 0) {
      console.log('🎱 [PoolMatchManager] Frames received from pool events:', {
        frameCount: frames.length,
        firstFrame: frames[0],
        sampleBalls: frames[0]?.balls?.slice(0, 2)
      });
      
      // Update gameState to trigger animation
      setGameState(prev => prev ? { 
        ...prev, 
        animationFrames: frames // Direct frames, no scaling for now
      } : null);
    }
  }, [frames]);

  // Apply final state from pool events
  useEffect(() => {
    if (finalState) {
      console.log('[PoolMatchManager] Final state received from pool events:', finalState);
      setGameState((prev: any) => ({ ...prev, game_state: finalState }));
      toast({ title: "Tacada concluída", description: "Simulação finalizada" });
    }
  }, [finalState, toast]);

  // Apply final state when received from WebSocket (PRIORITY) + detailed logging
  useEffect(() => {
    if (wsLastState) {
      console.log('🎱 [PoolMatchManager] 🏁 Final state received (WS):', wsLastState);
      console.log('🎱 [PoolMatchManager] 🎳 Ball positions after shot:', 
        wsLastState.balls?.map((b: any) => ({ id: b.id, type: b.type, x: b.x, y: b.y, inPocket: b.inPocket }))
      );
      
      const scaledState = scaleStateForLegacy(wsLastState);
      console.log('🎱 [PoolMatchManager] 📏 Scaled state for legacy:', scaledState);
      
      setGameState((prev: any) => {
        console.log('🎱 [PoolMatchManager] 🔄 Updating game state from:', prev?.game_state, 'to:', scaledState);
        return { ...prev, game_state: scaledState };
      });
      
      toast({ 
        title: "Simulação WebSocket concluída", 
        description: `Bolas atualizadas: ${wsLastState.balls?.length || 0}` 
      });
    }
  }, [wsLastState, toast]);

  const renderConnectionIndicator = () => {
    return (
      <Badge variant={rtConnected ? "default" : "destructive"} className="gap-1">
        {rtConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {rtConnected ? 'Conectado' : 'Reconectando...'}
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
                {renderConnectionIndicator()}
              </div>
            </div>
            
            {gameState && (
              <div className="mt-3 flex gap-2">
                <Badge variant="outline">
                  Status: {gameState.status}
                </Badge>
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
    // Calculate if it's the current user's turn using both formats
    let isMyTurn = false;
    
    // Check if game_state has turnUserId (preferred format)
    if (gameState.game_state?.turnUserId) {
      isMyTurn = gameState.game_state.turnUserId === user.id;
    }
    // Fallback: check currentPlayer index with players array from match data
    else if (typeof gameState.game_state?.currentPlayer === 'number' && gameState.players) {
      const currentPlayerIndex = gameState.game_state.currentPlayer;
      const players = Array.isArray(gameState.players) ? gameState.players : [];
      const currentPlayerData = players[currentPlayerIndex - 1]; // currentPlayer is 1-indexed
      isMyTurn = (currentPlayerData?.userId || currentPlayerData?.user_id) === user.id;
    }
    
    console.log('🎱 PoolMatchManager: Turn calculation:', { 
      turnUserId: gameState.game_state?.turnUserId,
      currentPlayer: gameState.game_state?.currentPlayer,
      myId: user.id, 
      isMyTurn,
      players: gameState.players 
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
                <p className="text-sm text-muted-foreground">
                  {isMyTurn ? 'Sua vez!' : 'Aguardando jogada...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              Visão 3D
            </Button>
          </div>
        </div>
        
        {use3D ? (
          <Pool3DGame
            gameState={{
              balls: scaleStateForLegacy(gameState.game_state)?.balls || [],
              turnUserId: (gameState.game_state as any)?.turnUserId || '',
              players: (gameState.game_state as any)?.players || [],
              gamePhase: (gameState.game_state as any)?.phase || 'BREAK',
              ballInHand: (gameState.game_state as any)?.ballInHand || false,
              shotClock: 30,
              status: gameState.status
            }}
            isMyTurn={isMyTurn}
            playerId={user.id}
            onShoot={executeShot}
            onSetReady={setReady}
            onPlaceCueBall={(x: number, y: number) => {
              console.log('🎱 PoolMatchManager: Place cue ball:', x, y);
            }}
            onSendMessage={(message: string) => {
              console.log('🎱 PoolMatchManager: Send message:', message);
            }}
            messages={[]}
            animationFrames={scaleFramesForLegacy(frames)}
            wsConnected={wsConnected}
            wsGameState={wsGameState}
          />
        ) : (
          <PoolGame
            gameState={{
              balls: scaleStateForLegacy(gameState.game_state)?.balls || [],
              turnUserId: (gameState.game_state as any)?.turnUserId || '',
              players: (gameState.game_state as any)?.players || [],
              gamePhase: (gameState.game_state as any)?.phase || 'BREAK',
              ballInHand: (gameState.game_state as any)?.ballInHand || false,
              shotClock: 30,
              status: gameState.status
            }}
            isMyTurn={isMyTurn}
            playerId={user.id}
            onShoot={executeShot}
            onPlaceCueBall={(x: number, y: number) => {
              console.log('🎱 PoolMatchManager: Place cue ball:', x, y);
            }}
            onSendMessage={(message: string) => {
              console.log('🎱 PoolMatchManager: Send message:', message);
            }}
            messages={[]}
            animationFrames={frames} // Direct frames
            wsConnected={wsConnected}
            wsGameState={wsGameState}
          />
        )}
        
        {/* Debug Panel */}
        <PoolDebugPanel 
          matchId={currentMatchId || ''}
          wsConnected={wsConnected}
          gameState={gameState}
          frames={frames}
          onTestShot={() => executeShot({ dir: 0, power: 0.3, spin: { sx: 0, sy: 0 }, aimPoint: { x: 0, y: 0 } })}
          onTestPhysics={async () => {
            console.log('🧪 [PoolMatchManager] Testing physics function directly...');
            try {
              const { data, error } = await supabase.functions.invoke('pool-game-physics', {
                body: {
                  type: 'SHOOT',
                  matchId: currentMatchId,
                  dir: 0,
                  power: 0.3,
                  spin: { sx: 0, sy: 0 }
                }
              });
              
              if (error) {
                console.error('❌ Physics test failed:', error);
                toast({
                  title: "Physics test failed",
                  description: `Error: ${error.message}`,
                  variant: "destructive"
                });
              } else {
                console.log('✅ Physics test successful:', data);
                toast({
                  title: "Physics test successful!",
                  description: `Generated ${data?.frames?.length || 0} frames`
                });
              }
            } catch (err) {
              console.error('❌ Physics test exception:', err);
              toast({
                title: "Physics test exception",
                description: String(err),
                variant: "destructive"
              });
            }
          }}
        />
      </div>
    );
  }

  return null;
}

export default PoolMatchManager;