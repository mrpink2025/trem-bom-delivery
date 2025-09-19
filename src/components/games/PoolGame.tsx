import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Timer, Target, Zap, RotateCcw } from 'lucide-react';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wx: number;
  wy: number;
  color: string;
  number: number; // Made required to match poolRules
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

interface PoolGameProps {
  gameState: PoolGameState;
  isMyTurn: boolean;
  playerId: string;
  onShoot: (shot: { dir: number; power: number; spin: { sx: number; sy: number }; aimPoint: { x: number; y: number } }) => void;
  onPlaceCueBall: (x: number, y: number) => void;
  onSendMessage: (message: string) => void;
  messages: Array<{ userId: string; message: string; timestamp: number }>;
  animationFrames?: Array<{ t: number; balls: Ball[]; sounds: string[] }>;
  wsConnected?: boolean;
  wsGameState?: any;
}

const PoolGame: React.FC<PoolGameProps> = ({
  gameState,
  isMyTurn,
  playerId,
  onShoot,
  onPlaceCueBall,
  onSendMessage,
  messages,
  animationFrames = [],
  wsConnected = false,
  wsGameState
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  // Game controls state
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0.5);
  const [spin, setSpin] = useState({ sx: 0, sy: 0 });
  const [isAiming, setIsAiming] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAnimationFrame, setCurrentAnimationFrame] = useState(0);
  const [animatedBalls, setAnimatedBalls] = useState<Ball[]>([]);
  const animationRef = useRef<number>();
  
  // Canvas dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const BALL_RADIUS = 12;
  
  // Get current player info
  const currentPlayer = gameState.players.find(p => p.userId === playerId);
  const opponent = gameState.players.find(p => p.userId !== playerId);

  // Handle animation frames
  useEffect(() => {
    if (animationFrames.length > 0 && !isAnimating) {
      console.log('🎱 [PoolGame] Starting animation with', animationFrames.length, 'frames');
      setIsAnimating(true);
      setCurrentAnimationFrame(0);
      
      let frameIndex = 0;
      const animateFrames = () => {
        if (frameIndex < animationFrames.length) {
          const frame = animationFrames[frameIndex];
          setAnimatedBalls(frame.balls);
          frameIndex++;
          
          // Continue animation at ~60fps
          animationRef.current = requestAnimationFrame(() => {
            setTimeout(animateFrames, 16); // ~60fps timing
          });
        } else {
          // Animation complete
          console.log('🎱 [PoolGame] Animation completed');
          setIsAnimating(false);
          setCurrentAnimationFrame(0);
          // Reset to final state
          if (animationFrames.length > 0) {
            const finalFrame = animationFrames[animationFrames.length - 1];
            setAnimatedBalls(finalFrame.balls);
          }
        }
      };
      
      animateFrames();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animationFrames, isAnimating]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Draw the game on canvas
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('🎱 PoolGame: No canvas element');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('🎱 PoolGame: No 2D context');
      return;
    }

    console.log('🎱 PoolGame: Drawing game state:', { 
      gameState: !!gameState,
      balls: gameState?.balls?.length || 0,
      ballsData: gameState?.balls?.slice(0, 3) || 'NO BALLS'
    });

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw table background
    ctx.fillStyle = '#0d5f2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw table border
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);

    // Draw pockets (circles)
    ctx.fillStyle = '#000000';
    const pocketRadius = 20;
    const pockets = [
      { x: 15, y: 15 }, { x: CANVAS_WIDTH/2, y: 15 }, { x: CANVAS_WIDTH - 15, y: 15 },
      { x: 15, y: CANVAS_HEIGHT - 15 }, { x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT - 15 }, { x: CANVAS_WIDTH - 15, y: CANVAS_HEIGHT - 15 }
    ];
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocketRadius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw balls
    const ballsToRender = isAnimating ? animatedBalls : (gameState?.balls || []);
    console.log('🎱 PoolGame: Rendering balls:', { 
      isAnimating, 
      animatedBallsCount: animatedBalls.length,
      gameStateBallsCount: gameState?.balls?.length || 0,
      usingAnimated: isAnimating
    });
    
    if (ballsToRender && Array.isArray(ballsToRender)) {
      ballsToRender.forEach((ball: Ball) => {
        if (!ball.inPocket) {
          // Draw ball shadow
          ctx.beginPath();
          ctx.arc(ball.x + 2, ball.y + 2, BALL_RADIUS, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fill();

          // Draw ball
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, 2 * Math.PI);
          ctx.fillStyle = ball.color;
          ctx.fill();

          // Draw ball border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw number for numbered balls
          if (ball.number && ball.number > 0) {
            ctx.fillStyle = ball.type === 'STRIPE' ? ball.color : '#ffffff';
            ctx.font = '10px bold Arial';
            ctx.textAlign = 'center';
            ctx.fillText(ball.number.toString(), ball.x, ball.y + 3);
          }
        }
      });
    } else {
      console.warn('🎱 PoolGame: No balls found to draw');
    }

    // Draw trajectory if aiming
    if (isAiming && showTrajectory && isMyTurn) {
      const cueBall = gameState?.balls?.find((b: Ball) => b.type === 'CUE');
      if (cueBall && !cueBall.inPocket) {
        const length = power * 100;
        const endX = cueBall.x + Math.cos(aimAngle) * length;
        const endY = cueBall.y + Math.sin(aimAngle) * length;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [gameState, aimAngle, power, isAiming, showTrajectory, isMyTurn]);

  // Re-draw when dependencies change
  useEffect(() => {
    drawGame();
  }, [drawGame]);
  
  // Handle mouse/touch input for aiming
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || gameState.ballInHand) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);
    if (cueBall) {
      const angle = Math.atan2(mouseY - cueBall.y, mouseX - cueBall.x);
      setAimAngle(angle);
      setIsAiming(true);
    }
  };
  
  // Handle ball placement for ball-in-hand
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState.ballInHand || !isMyTurn) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Validate position (not too close to other balls or pockets)
    const isValidPosition = gameState.balls.every(ball => {
      if (ball.inPocket || ball.type === 'CUE') return true;
      const distance = Math.sqrt((ball.x - clickX) ** 2 + (ball.y - clickY) ** 2);
      return distance > BALL_RADIUS * 2.5;
    });
    
    if (isValidPosition) {
      onPlaceCueBall(clickX, clickY);
      toast({ title: "Bola colocada", description: "Posição da bola branca definida" });
    } else {
      toast({ 
        title: "Posição inválida", 
        description: "Muito próximo de outra bola",
        variant: "destructive"
      });
    }
  };
  
  // Handle shot execution
  const handleShoot = () => {
    if (!isMyTurn) {
      toast({
        title: "Não é sua vez",
        description: "Aguarde sua vez de jogar",
        variant: "destructive"
      });
      return;
    }
    
    if (gameState.ballInHand) {
      toast({
        title: "Posicione a bola branca primeiro",
        description: "Clique na mesa para posicionar a bola",
        variant: "destructive"
      });
      return;
    }
    
    const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);
    if (!cueBall) {
      toast({
        title: "Bola branca não encontrada",
        description: "Erro no estado do jogo",
        variant: "destructive"
      });
      return;
    }
    
    console.log('🎱 PoolGame: Executing shot:', { 
      aimAngle, 
      power, 
      spin, 
      cueBall: { x: cueBall.x, y: cueBall.y } 
    });
    
    onShoot({
      dir: aimAngle,
      power: power,
      spin: spin,
      aimPoint: { x: cueBall.x, y: cueBall.y }
    });
    
    setIsAiming(false);
    toast({ title: "Tacada executada!", description: "Aguardando resultado..." });
  };
  
  // Handle chat message send
  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      onSendMessage(chatMessage.trim());
      setChatMessage('');
    }
  };
  
  // Get remaining balls for each player
  const mySolidBalls = gameState.balls.filter(ball => 
    ball.type === 'SOLID' && !ball.inPocket && currentPlayer?.group === 'SOLID'
  ).length;
  
  const myStripeBalls = gameState.balls.filter(ball => 
    ball.type === 'STRIPE' && !ball.inPocket && currentPlayer?.group === 'STRIPE'
  ).length;
  
  const opponentSolidBalls = gameState.balls.filter(ball => 
    ball.type === 'SOLID' && !ball.inPocket && opponent?.group === 'SOLID'
  ).length;
  
  const opponentStripeBalls = gameState.balls.filter(ball => 
    ball.type === 'STRIPE' && !ball.inPocket && opponent?.group === 'STRIPE'
  ).length;

  return (
    <div className="space-y-4">
      {/* Game Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Jogo de Sinuca
            </h2>
            <p className="text-sm text-muted-foreground">
              Fase: <Badge variant="outline">{gameState.gamePhase}</Badge>
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {isMyTurn ? 'Sua vez!' : 'Vez do oponente'}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="w-4 h-4" />
              {gameState.shotClock || 30}s
            </div>
          </div>
        </div>
      </Card>

      {/* Player Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">Você</h3>
          <div className="space-y-1 text-sm">
            {currentPlayer?.group && (
              <p>
                Grupo: <Badge variant={currentPlayer.group === 'SOLID' ? 'default' : 'secondary'}>
                  {currentPlayer.group === 'SOLID' ? 'Lisas' : 'Listradas'}
                </Badge>
              </p>
            )}
            <p>Bolas restantes: {currentPlayer?.group === 'SOLID' ? mySolidBalls : myStripeBalls}</p>
          </div>
        </Card>
        
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">Oponente</h3>
          <div className="space-y-1 text-sm">
            {opponent?.group && (
              <p>
                Grupo: <Badge variant={opponent.group === 'SOLID' ? 'default' : 'secondary'}>
                  {opponent.group === 'SOLID' ? 'Lisas' : 'Listradas'}
                </Badge>
              </p>
            )}
            <p>Bolas restantes: {opponent?.group === 'SOLID' ? opponentSolidBalls : opponentStripeBalls}</p>
          </div>
        </Card>
      </div>

      {/* Game Canvas */}
      <Card className="p-4">
        <div className="pool-table-container" style={{ pointerEvents: 'auto' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ 
              width: '100%', 
              height: 'auto', 
              border: '2px solid #8B4513',
              borderRadius: '8px',
              cursor: isMyTurn ? (gameState.ballInHand ? 'crosshair' : 'pointer') : 'default'
            }}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
          />
        </div>
      </Card>

      {/* Controls */}
      {isMyTurn && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Controles da Tacada
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Power Control */}
            <div>
              <label className="text-sm font-medium block mb-2">
                Força: {(power * 100).toFixed(0)}%
              </label>
              <Slider
                value={[power]}
                onValueChange={(value) => setPower(value[0])}
                max={1}
                min={0}
                step={0.01}
                className="w-full"
              />
            </div>
            
            {/* Spin Control X */}
            <div>
              <label className="text-sm font-medium block mb-2">
                Efeito X: {(spin.sx * 100).toFixed(0)}%
              </label>
              <Slider
                value={[spin.sx]}
                onValueChange={(value) => setSpin(prev => ({ ...prev, sx: value[0] }))}
                max={1}
                min={-1}
                step={0.01}
                className="w-full"
              />
            </div>
            
            {/* Spin Control Y */}
            <div>
              <label className="text-sm font-medium block mb-2">
                Efeito Y: {(spin.sy * 100).toFixed(0)}%
              </label>
              <Slider
                value={[spin.sy]}
                onValueChange={(value) => setSpin(prev => ({ ...prev, sy: value[0] }))}
                max={1}
                min={-1}
                step={0.01}
                className="w-full"
              />
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrajectory(!showTrajectory)}
              >
                {showTrajectory ? 'Ocultar' : 'Mostrar'} Trajetória
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPower(0.5);
                  setSpin({ sx: 0, sy: 0 });
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
            
            <Button 
              onClick={handleShoot}
              disabled={!isMyTurn || gameState.ballInHand}
              size="lg"
            >
              Executar Tacada
            </Button>
          </div>
          
          {gameState.ballInHand && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Bola na mão:</strong> Clique na mesa para posicionar a bola branca
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Chat */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Chat</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto mb-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground italic">Nenhuma mensagem ainda...</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="p-2 rounded bg-muted">
                <span className="font-medium">
                  {msg.userId === playerId ? 'Você' : 'Oponente'}:
                </span>{' '}
                {msg.message}
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage} size="sm">
            Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PoolGame;