import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Timer, Target, Zap, RotateCcw, Eye, Move3D } from 'lucide-react';
import { poolRenderer } from './pool/render/PoolCanvasRenderer';
import '../../styles/pool-table.css';

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
    mmr: number;
    group?: 'SOLID' | 'STRIPE';
  }>;
  gamePhase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL';
  ballInHand?: boolean;
  shotClock?: number;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  winnerUserIds?: string[];
}

interface Pool3DGameProps {
  gameState: PoolGameState;
  isMyTurn: boolean;
  playerId: string;
  onShoot: (shot: { dir: number; power: number; spin: { sx: number; sy: number }; aimPoint: { x: number; y: number } }) => void;
  onPlaceCueBall: (x: number, y: number) => void;
  onSendMessage: (message: string) => void;
  messages: Array<{ userId: string; message: string; timestamp: number }>;
  animationFrames?: Array<{ t: number; balls: Ball[]; sounds: string[] }>;
}

const Pool3DGame: React.FC<Pool3DGameProps> = ({
  gameState,
  isMyTurn,
  playerId,
  onShoot,
  onPlaceCueBall,
  onSendMessage,
  messages,
  animationFrames = []
}) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game controls state
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0.5);
  const [spin, setSpin] = useState({ sx: 0, sy: 0 });
  const [isAiming, setIsAiming] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAnimationFrame, setCurrentAnimationFrame] = useState(0);
  const [use3D, setUse3D] = useState(false); // Toggle for future 3D mode
  const [isRendererReady, setIsRendererReady] = useState(false);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const initRenderer = async () => {
      try {
        await poolRenderer.init(canvasRef.current!, {
          feltColor: '#0F3128',
          railWoodTexture: true,
          showLogo: true,
          logoOpacity: 0.06
        });
        setIsRendererReady(true);
        console.log('🎱 Pool renderer initialized successfully');
      } catch (error) {
        console.error('Failed to initialize pool renderer:', error);
        toast({
          title: "Erro de renderização",
          description: "Falha ao inicializar o renderizador da mesa",
          variant: "destructive"
        });
      }
    };

    initRenderer();

    return () => {
      poolRenderer.dispose();
    };
  }, [toast]);

  // Handle animation frames
  useEffect(() => {
    if (!isRendererReady) return;
    
    if (animationFrames.length > 0 && !isAnimating) {
      console.log('🎱 [Pool3DGame] Starting animation with frames:', animationFrames.length);
      setIsAnimating(true);
      setCurrentAnimationFrame(0);

      // Convert game balls to renderer format
      const convertedFrames = animationFrames.map(frame => ({
        t: frame.t,
        balls: frame.balls.map(ball => ({
          id: ball.id,
          number: ball.number || 0,
          x: ball.x,
          y: ball.y,
          vx: ball.vx,
          vy: ball.vy,
          inPocket: ball.inPocket,
          type: ball.type
        })),
        sounds: frame.sounds || []
      }));

      // Start animation
      poolRenderer.renderFrame(convertedFrames);
      
      // Mark animation as completed after duration
      setTimeout(() => {
        console.log('🎱 [Pool3DGame] Animation completed');
        setIsAnimating(false);
        setCurrentAnimationFrame(0);
      }, convertedFrames.length * 16); // ~60fps timing
    }
  }, [animationFrames, isAnimating, isRendererReady]);

  // Render current game state when not animating
  useEffect(() => {
    if (!isRendererReady || isAnimating) return;

    const convertedBalls = gameState.balls.map(ball => ({
      id: ball.id,
      number: ball.number || 0,
      x: ball.x,
      y: ball.y,
      vx: ball.vx || 0,
      vy: ball.vy || 0,
      inPocket: ball.inPocket,
      type: ball.type
    }));

    // Pass aiming data to renderer
    const aimingData = isMyTurn && !gameState.ballInHand && !isAnimating && isAiming ? {
      angle: aimAngle,
      power: power,
      show: true
    } : { angle: 0, power: 0, show: false };

    poolRenderer.renderFrame(convertedBalls, aimingData);
  }, [gameState.balls, isRendererReady, isAnimating, isMyTurn, gameState.ballInHand, isAiming, aimAngle, power]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isRendererReady) {
        poolRenderer.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isRendererReady]);

  // Get current player info
  const currentPlayer = gameState.players.find(p => p.userId === playerId);
  const opponent = gameState.players.find(p => p.userId !== playerId);

  // Cue ball state helpers
  const hasCueOnTable = useMemo(() => gameState.balls.some(b => b.type === 'CUE' && !b.inPocket), [gameState.balls]);
  const ballInHandUI = gameState.ballInHand || !hasCueOnTable;

  // Find cue ball (on table)
  const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);

  // Handle shot execution
  const handleShoot = () => {
    console.log('🎱 [Pool3DGame] handleShoot called', { isMyTurn, ballInHand: gameState.ballInHand, isAnimating });
    
    if (!isMyTurn || ballInHandUI || isAnimating) {
      console.log('🎱 [Pool3DGame] Shot blocked - conditions not met');
      return;
    }
    
    if (!cueBall) {
      console.log('🎱 [Pool3DGame] No cue ball found');
      return;
    }
    
    const shotData = {
      dir: aimAngle,
      power: power,
      spin: spin,
      aimPoint: { x: cueBall.x, y: cueBall.y }
    };
    
    console.log('🎱 [Pool3DGame] Executing shot:', shotData);
    
    onShoot(shotData);
    
    setIsAiming(false);
    toast({ title: "Tacada executada!", description: "Aguarde a simulação..." });
  };

  // Send chat message
  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      onSendMessage(chatMessage.trim());
      setChatMessage('');
    }
  };

  // Get remaining balls for each player
  const getRemainingBalls = (group?: 'SOLID' | 'STRIPE') => {
    if (!group) return [];
    return gameState.balls.filter(ball => ball.type === group && !ball.inPocket);
  };

  // Handle canvas pointer events for aiming (supports both mouse and touch)
  const handleCanvasPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cueBall) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 2240 / rect.width; // Table logical width
    const scaleY = 1120 / rect.height; // Table logical height
    
    const pointerX = (event.clientX - rect.left) * scaleX;
    const pointerY = (event.clientY - rect.top) * scaleY;

    if (isMyTurn && !ballInHandUI && !isAnimating) {
      // Calculate aim angle
      const dx = pointerX - cueBall.x;
      const dy = pointerY - cueBall.y;
      const angle = Math.atan2(dy, dx);
      setAimAngle(angle);
      setIsAiming(true);
    }
  }, [cueBall, isMyTurn, ballInHandUI, isAnimating]);

  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 2240 / rect.width;
    const scaleY = 1120 / rect.height;
    
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    if (ballInHandUI && isMyTurn) {
      // Place cue ball with better validation
      const ballRadius = 30; // Increased for new ball size
      const isValidPosition = gameState.balls.every(ball => {
        if (ball.type === 'CUE' || ball.inPocket) return true;
        const dx = clickX - ball.x;
        const dy = clickY - ball.y;
        return Math.sqrt(dx * dx + dy * dy) > ballRadius * 2.2; // More space between balls
      });
      
      // Check table boundaries (with rail margin and ball radius)
      const margin = 44 + ballRadius; // Rail width + ball radius
      if (isValidPosition && 
          clickX > margin && clickX < 2240 - margin && 
          clickY > margin && clickY < 1120 - margin) {
        onPlaceCueBall(clickX, clickY);
        toast({ title: "Bola posicionada", description: "Agora você pode fazer sua tacada" });
      } else {
        toast({ 
          title: "Posição inválida", 
          description: "Escolha uma posição válida para a bola branca",
          variant: "destructive"
        });
      }
    } else if (isMyTurn && !ballInHandUI && !isAnimating && isAiming) {
      // Execute shot
      handleShoot();
    }
  }, [ballInHandUI, isMyTurn, isAnimating, isAiming, gameState.balls, onPlaceCueBall, toast, handleShoot]);

  const handleCanvasPointerLeave = useCallback(() => {
    setIsAiming(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 bg-background">
      {/* Game Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={isMyTurn ? "default" : "secondary"}>
              {isMyTurn ? "Sua vez" : "Vez do oponente"}
            </Badge>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span>{gameState.shotClock || 30}s</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUse3D(!use3D)}
              disabled
              title="Modo 3D (em breve)"
            >
              <Move3D className="w-4 h-4 mr-1" />
              {use3D ? '2D' : '3D'}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Fase: {gameState.gamePhase === 'BREAK' ? 'Quebra' : 
                   gameState.gamePhase === 'OPEN' ? 'Grupos em aberto' :
                   gameState.gamePhase === 'GROUPS_SET' ? 'Grupos definidos' : 'Bola 8'}
          </div>
        </div>
      </Card>
      
      {/* Players Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">Você {currentPlayer?.group && `(${currentPlayer.group})`}</h3>
          <div className="flex gap-1 flex-wrap">
            {getRemainingBalls(currentPlayer?.group).map(ball => (
              <div 
                key={ball.id}
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: ball.color }}
                title={`Bola ${ball.number}`}
              />
            ))}
            {!currentPlayer?.group && <span className="text-xs text-muted-foreground">Grupo não definido</span>}
          </div>
        </Card>
        
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">Oponente {opponent?.group && `(${opponent.group})`}</h3>
          <div className="flex gap-1 flex-wrap">
            {getRemainingBalls(opponent?.group).map(ball => (
              <div 
                key={ball.id}
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: ball.color }}
                title={`Bola ${ball.number}`}
              />
            ))}
            {!opponent?.group && <span className="text-xs text-muted-foreground">Grupo não definido</span>}
          </div>
        </Card>
      </div>

      {/* Pool Table */}
      <Card className="p-2">
        <div ref={containerRef} className="pool-table-container">
          <div className="pool-table">
            <canvas
              ref={canvasRef}
              className="pool-canvas"
              onPointerMove={handleCanvasPointerMove}
              onPointerDown={handleCanvasPointerDown}
              onPointerLeave={handleCanvasPointerLeave}
              style={{ 
                cursor: ballInHandUI ? 'crosshair' : (isMyTurn && !isAnimating ? 'pointer' : 'default'),
                touchAction: 'none' // Prevent scrolling on touch devices
              }}
            />
            
            {/* Loading indicator */}
            {!isRendererReady && (
              <div className="pool-loading">
                <div className="pool-loading-spinner" />
                <div className="pool-loading-text">Carregando mesa...</div>
              </div>
            )}
            
            {/* Game status overlay */}
            <div className="pool-hud">
              <div className="pool-hud-top">
                <div className="pool-turn-indicator">
                  {isMyTurn && <div className="pool-turn-dot" />}
                  <span className="pool-turn-text">
                    {isMyTurn ? 'Sua vez!' : 'Aguarde sua vez'}
                  </span>
                </div>
                
                <div className={`pool-shot-clock ${(gameState.shotClock || 30) < 10 ? 'warning' : ''}`}>
                  <Timer className="pool-shot-clock-icon" />
                  <span className="pool-shot-clock-text">{gameState.shotClock || 30}</span>
                </div>
              </div>
              
              {ballInHandUI && isMyTurn && (
                <div className="pool-hud-bottom">
                  <div className="pool-turn-indicator">
                    <Target className="w-4 h-4" />
                    <span className="pool-turn-text">Toque para posicionar a bola branca</span>
                  </div>
                </div>
              )}
              
              {isMyTurn && !ballInHandUI && !isAnimating && (
                <div className="pool-hud-bottom">
                  <div className="pool-turn-indicator">
                    <Target className="w-4 h-4" />
                    <span className="pool-turn-text">Mova para mirar • Toque para tacar</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Controls */}
      {isMyTurn && !ballInHandUI && !isAnimating && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Controles da Tacada</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Power Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Força: {Math.round(power * 100)}%
              </label>
              <Slider
                value={[power]}
                onValueChange={([value]) => setPower(value)}
                max={1}
                min={0.1}
                step={0.1}
                className="w-full"
              />
            </div>
            
            {/* Spin Controls */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Efeito Horizontal</label>
              <Slider
                value={[spin.sx]}
                onValueChange={([value]) => setSpin(prev => ({ ...prev, sx: value }))}
                max={1}
                min={-1}
                step={0.1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Efeito Vertical</label>
              <Slider
                value={[spin.sy]}
                onValueChange={([value]) => setSpin(prev => ({ ...prev, sy: value }))}
                max={1}
                min={-1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleShoot}
              disabled={!isAiming || isAnimating}
              className="flex-1"
            >
              <Target className="w-4 h-4 mr-2" />
              Executar Tacada
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                setPower(0.5);
                setSpin({ sx: 0, sy: 0 });
              }}
              size="sm"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Chat */}
      <Card className="p-4 max-h-48 overflow-hidden flex flex-col">
        <h3 className="font-semibold mb-2">Chat</h3>
        <div className="flex-1 overflow-y-auto space-y-1 mb-2">
          {messages.slice(-5).map((msg, index) => (
            <div key={index} className="text-xs">
              <span className="font-medium">Jogador {msg.userId.slice(0, 8)}:</span>
              <span className="ml-1">{msg.message}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="text-xs"
          />
          <Button size="sm" onClick={handleSendMessage}>
            Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Pool3DGame;