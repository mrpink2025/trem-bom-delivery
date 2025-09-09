import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePoolEvents } from '@/hooks/usePoolEvents';
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

  // Use new Realtime hook for events
  const { connected: rtConnected, frames, finalState } = usePoolEvents(currentMatchId || '');

  async function executeShot(input: { dir:number; power:number; spin:{sx:number,sy:number}; aimPoint?:{x:number,y:number} }) {
    try {
      const { data, error } = await supabase.functions.invoke('pool-game-action', {
        body: { type:'SHOOT', matchId: currentMatchId, ...input }
      });
      if (error) {
        console.error('[PoolMatchManager] shot error', error);
        toast({
          title: "Erro na tacada",
          description: "Não foi possível executar a tacada. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('[PoolMatchManager] shot exception', err);
      toast({
        title: "Erro na tacada", 
        description: "Erro de conexão. Verifique sua internet.",
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

  // Apply frames as they arrive
  useEffect(() => {
    if (frames.length > 0) {
      console.log('[PoolMatchManager] Animation frames received:', frames.length);
    }
  }, [frames]);

  // Apply final state when received
  useEffect(() => {
    if (finalState) {
      console.log('[PoolMatchManager] Final state received:', finalState);
      setGameState((prev: any) => ({ ...prev, game_state: finalState }));
      toast({
        title: "Tacada concluída",
        description: "A simulação da tacada foi finalizada"
      });
    }
  }, [finalState]);

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
    const isMyTurn = gameState.game_state?.turnUserId === user.id;
    
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
        
        <div className="pool-table-container">
          <div className="pool-table">
            <div className="pocket tl"></div>
            <div className="pocket tr"></div>
            <div className="pocket tc"></div>
            <div className="pocket bl"></div>
            <div className="pocket br"></div>
            <div className="pocket bc"></div>
          </div>
        </div>
        
        {use3D ? (
          <Pool3DGame
            gameState={{
              balls: (gameState.game_state as any)?.balls || [],
              turnUserId: (gameState.game_state as any)?.turnUserId || '',
              players: [],
              gamePhase: 'BREAK' as const,
              ballInHand: false,
              shotClock: 30,
              status: gameState.status
            }}
            isMyTurn={isMyTurn}
            playerId={user.id}
            onShoot={executeShot}
            onPlaceCueBall={(x: number, y: number) => {
              console.log('Place cue ball:', x, y);
            }}
            onSendMessage={(message: string) => {
              console.log('Send message:', message);
            }}
            messages={[]}
            animationFrames={frames}
          />
        ) : (
          <PoolGame
            gameState={{
              balls: (gameState.game_state as any)?.balls || [],
              turnUserId: (gameState.game_state as any)?.turnUserId || '',
              players: [],
              gamePhase: 'BREAK' as const,
              ballInHand: false,
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