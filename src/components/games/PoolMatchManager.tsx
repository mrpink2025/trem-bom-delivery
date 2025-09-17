import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePoolEvents } from '@/hooks/usePoolEvents';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import PoolLobby from './PoolLobby';
import Pool3DGame from './Pool3DGame';
import PoolGame from './PoolGame';
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

  // Prioritize WebSocket frames over DB frames
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

  async function executeShot(input: { dir:number; power:number; spin:{sx:number,sy:number}; aimPoint?:{x:number,y:number} }) {
    console.log('🎱 [PoolMatchManager] 🎯 executeShoot called with input:', input);
    console.log('🎱 [PoolMatchManager] 🔍 Connection status:', { 
      wsConnected: wsConnected, 
      wsSocket: !!wsShoot, 
      connectionStatus: connectionStatus,
      matchId: currentMatchId,
      wsShootAvailable: !!wsShoot
    });
    
    try {
      // PRIORITY: WebSocket if connected and available
      if (wsConnected && wsShoot && connectionStatus === 'connected') {
        console.log('🎱 [PoolMatchManager] ✅ Using WebSocket shoot');
        console.log('🎱 [PoolMatchManager] 📤 Sending shot via WebSocket:', input);
        wsShoot(input);
        
        toast({ 
          title: "Tacada executada via WebSocket!", 
          description: "Aguarde a simulação em tempo real..." 
        });
        
        // Set timeout para detectar se WebSocket falhou
        setTimeout(() => {
          console.log('🎱 [PoolMatchManager] ⏱️ WebSocket shot timeout check - frames received:', wsFrames?.length || 0);
          if (!wsFrames || wsFrames.length === 0) {
            console.log('🎱 [PoolMatchManager] ⚠️ No WebSocket frames after 5s, WebSocket may have failed');
          }
        }, 5000);
        
        return;
      }
      
      // FALLBACK: usar função Supabase diretamente
      console.log('🎱 [PoolMatchManager] 🔄 Using Supabase fallback shoot');
      console.log('🎱 [PoolMatchManager] ❓ WebSocket unavailable because:', {
        notConnected: !wsConnected,
        wrongConnectionStatus: connectionStatus !== 'connected',
        noShootFn: !wsShoot
      });
      
      const { data, error } = await supabase.functions.invoke('pool-game-action', {
        body: { 
          type: 'SHOOT',
          matchId: currentMatchId,
          ...input 
        }
      });

      if (error) {
        console.error('❌ [PoolMatchManager] Shot execution error:', error);
        toast({ 
          title: "Erro na tacada", 
          description: error.message,
          variant: "destructive" 
        });
        return;
      }

      console.log('✅ [PoolMatchManager] Shot executed via Supabase:', data);
      toast({ 
        title: "Tacada executada!", 
        description: "Processando simulação..." 
      });
      
    } catch (error) {
      console.error('❌ [PoolMatchManager] Shot execution failed:', error);
      toast({ 
        title: "Erro na tacada", 
        description: "Falha ao executar a tacada",
        variant: "destructive" 
      });
    }
  }

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

  // Apply frames as they arrive + detailed logging
  useEffect(() => {
    if (frames && frames.length > 0) {
      console.log('🎱 [PoolMatchManager] 🎬 Frames received, starting animation:', {
        frameCount: frames.length,
        frameSource: wsFrames?.length > 0 ? 'WebSocket' : 'Database',
        firstFrame: frames[0],
        lastFrame: frames[frames.length - 1]
      });
      
      // Verificar se as bolas estão se movendo
      const firstBalls = frames[0]?.balls || [];
      const lastBalls = frames[frames.length - 1]?.balls || [];
      const cueBallFirst = firstBalls.find((b: any) => b.type === 'CUE');
      const cueBallLast = lastBalls.find((b: any) => b.type === 'CUE');
      
      if (cueBallFirst && cueBallLast) {
        const moved = Math.abs(cueBallFirst.x - cueBallLast.x) > 5 || Math.abs(cueBallFirst.y - cueBallLast.y) > 5;
        console.log('🎱 [PoolMatchManager] 🎳 Cue ball movement check:', {
          start: { x: cueBallFirst.x, y: cueBallFirst.y },
          end: { x: cueBallLast.x, y: cueBallLast.y },
          moved: moved,
          distance: Math.sqrt((cueBallFirst.x - cueBallLast.x)**2 + (cueBallFirst.y - cueBallLast.y)**2)
        });
        
        if (!moved) {
          console.warn('🎱 [PoolMatchManager] ⚠️ CUE BALL NOT MOVING - Possible physics issue!');
        }
      } else {
        console.warn('🎱 [PoolMatchManager] ⚠️ No cue ball found in frames');
      }
    } else {
      console.log('🎱 [PoolMatchManager] ⚠️ No frames to animate');
    }
  }, [frames, wsFrames]);

  // Apply final state when received (DB fallback)
  useEffect(() => {
    if (finalState) {
      console.log('[PoolMatchManager] Final state received (DB):', finalState);
      setGameState((prev: any) => ({ ...prev, game_state: finalState }));
      toast({ title: "Tacada concluída", description: "A simulação da tacada foi finalizada" });
    }
  }, [finalState]);

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
          />
        )}
      </div>
    );
  }

  return null;
}

export default PoolMatchManager;