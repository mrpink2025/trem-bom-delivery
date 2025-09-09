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

interface PoolGameProps {
  gameState: PoolGameState;
  isMyTurn: boolean;
  playerId: string;
  onShoot: (shot: { dir: number; power: number; spin: { sx: number; sy: number }; aimPoint: { x: number; y: number } }) => void;
  onPlaceCueBall: (x: number, y: number) => void;
  onSendMessage: (message: string) => void;
  messages: Array<{ userId: string; message: string; timestamp: number }>;
}

const PoolGame: React.FC<PoolGameProps> = ({
  gameState,
  isMyTurn,
  playerId,
  onShoot,
  onPlaceCueBall,
  onSendMessage,
  messages
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
  
  // Canvas dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const BALL_RADIUS = 12;
  
  // Get current player info
  const currentPlayer = gameState.players.find(p => p.userId === playerId);
  const opponent = gameState.players.find(p => p.userId !== playerId);

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

    // Handle missing or empty balls array
    if (!gameState?.balls || gameState.balls.length === 0) {
      console.log('🎱 PoolGame: No balls to draw - rendering empty table');
      
      // Clear and draw empty table
      ctx.fillStyle = '#0F4C3A';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw table boundaries
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
      
      // Draw "waiting" message
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Aguardando inicialização das bolas...', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
      return;
    }
    
    // Clear canvas
    ctx.fillStyle = '#0F4C3A'; // Pool table green
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw table rails
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
    
    // Draw pockets
    const pockets = [
      { x: 0, y: 0 }, { x: CANVAS_WIDTH/2, y: 0 }, { x: CANVAS_WIDTH, y: 0 },
      { x: 0, y: CANVAS_HEIGHT }, { x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT }, { x: CANVAS_WIDTH, y: CANVAS_HEIGHT }
    ];
    
    ctx.fillStyle = '#000000';
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, 20, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw balls
    console.log('🎱 Drawing', gameState.balls.length, 'balls');
    gameState.balls.forEach((ball, index) => {
      if (ball.inPocket) {
        console.log('🎱 Ball', ball.number, 'is in pocket, skipping');
        return;
      }

      console.log('🎱 Drawing ball', ball.number, 'at position', ball.x, ball.y, 'color:', ball.color);
      
      ctx.save();
      ctx.translate(ball.x, ball.y);
      
      // Ball shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(2, 2, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Ball body
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Ball highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(-4, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Ball number (for numbered balls)
      if (ball.number !== undefined && ball.type !== 'CUE') {
        ctx.fillStyle = ball.type === 'STRIPE' ? '#FFFFFF' : '#000000';
        if (ball.number === 8) ctx.fillStyle = '#FFFFFF';
        
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), 0, 1);
        
        // Stripe for stripe balls
        if (ball.type === 'STRIPE' && ball.number !== 8) {
          ctx.strokeStyle = ball.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS - 2, 0, Math.PI);
          ctx.stroke();
        }
      }
      
      ctx.restore();
    });
    
    // Draw aiming line if it's player's turn and they're aiming
    const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);
    if (isMyTurn && isAiming && cueBall && !gameState.ballInHand) {
      const aimLength = 100 + (power * 100);
      const endX = cueBall.x + Math.cos(aimAngle) * aimLength;
      const endY = cueBall.y + Math.sin(aimAngle) * aimLength;
      
      // Aim line
      ctx.strokeStyle = 'rgba(255,255,0,0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Power indicator
      ctx.fillStyle = `rgba(255,${255-power*200},0,0.7)`;
      ctx.beginPath();
      ctx.arc(cueBall.x, cueBall.y, BALL_RADIUS + (power * 10), 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw ball-in-hand indicator
    if (gameState.ballInHand && isMyTurn && cueBall) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cueBall.x, cueBall.y, BALL_RADIUS + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [gameState, isMyTurn, isAiming, aimAngle, power]);
  
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
      if (ball.type === 'CUE' || ball.inPocket) return true;
      const dx = clickX - ball.x;
      const dy = clickY - ball.y;
      return Math.sqrt(dx * dx + dy * dy) > BALL_RADIUS * 2.5;
    });
    
    if (isValidPosition && clickX > 20 && clickX < CANVAS_WIDTH - 20 && 
        clickY > 20 && clickY < CANVAS_HEIGHT - 20) {
      onPlaceCueBall(clickX, clickY);
      toast({ title: "Bola posicionada", description: "Agora você pode fazer sua tacada" });
    } else {
      toast({ 
        title: "Posição inválida", 
        description: "Escolha uma posição válida para a bola branca",
        variant: "destructive"
      });
    }
  };
  
  // Handle shot execution
  const handleShoot = () => {
    console.log('🎱 [PoolGame] handleShoot called', { isMyTurn, ballInHand: gameState.ballInHand });
    
    if (!isMyTurn || gameState.ballInHand) {
      console.log('🎱 [PoolGame] Shot blocked - not my turn or ball in hand');
      return;
    }
    
    const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);
    if (!cueBall) {
      console.log('🎱 [PoolGame] No cue ball found');
      return;
    }
    
    const shotData = {
      dir: aimAngle,
      power: power,
      spin: spin,
      aimPoint: { x: cueBall.x, y: cueBall.y }
    };
    
    console.log('🎱 [PoolGame] Executing shot:', shotData);
    
    onShoot(shotData);
    
    setIsAiming(false);
    toast({ title: "Tacada executada!", description: "Aguarde o resultado da simulação" });
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
    if (!group || !gameState?.balls) return [];
    return gameState.balls.filter(ball => ball.type === group && !ball.inPocket);
  };
  
  // Redraw canvas when state changes
  useEffect(() => {
    drawGame();
  }, [drawGame]);
  
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
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: ball.color, color: ball.type === 'STRIPE' ? '#000' : '#fff' }}
              >
                {ball.number}
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">Oponente {opponent?.group && `(${opponent.group})`}</h3>
          <div className="flex gap-1 flex-wrap">
            {getRemainingBalls(opponent?.group).map(ball => (
              <div 
                key={ball.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: ball.color, color: ball.type === 'STRIPE' ? '#000' : '#fff' }}
              >
                {ball.number}
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      {/* Game Canvas */}
      <Card className="p-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full max-w-full border rounded-lg bg-green-800 cursor-crosshair"
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
          style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
        />
        
        {gameState.ballInHand && isMyTurn && (
          <div className="mt-2 text-sm text-center text-muted-foreground">
            Clique na mesa para posicionar a bola branca
          </div>
        )}
      </Card>
      
      {/* Controls */}
      {isMyTurn && !gameState.ballInHand && (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Power Control */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Força: {Math.round(power * 100)}%
              </label>
              <Slider
                value={[power]}
                onValueChange={(value) => setPower(value[0])}
                min={0.1}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>
            
            {/* Spin Control */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Efeito
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs">Horizontal</label>
                  <Slider
                    value={[spin.sx]}
                    onValueChange={(value) => setSpin(prev => ({ ...prev, sx: value[0] }))}
                    min={-1}
                    max={1}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="text-xs">Vertical</label>
                  <Slider
                    value={[spin.sy]}
                    onValueChange={(value) => setSpin(prev => ({ ...prev, sy: value[0] }))}
                    min={-1}
                    max={1}
                    step={0.1}
                  />
                </div>
              </div>
            </div>
            
            {/* Shoot Button */}
            <Button 
              onClick={handleShoot}
              disabled={!isAiming}
              className="w-full"
              size="lg"
            >
              <Target className="w-4 h-4 mr-2" />
              Executar Tacada
            </Button>
          </div>
        </Card>
      )}
      
      {/* Chat */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Chat da Partida</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
          {messages.slice(-5).map((msg, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium">{msg.userId === playerId ? 'Você' : 'Oponente'}: </span>
              <span className="text-muted-foreground">{msg.message}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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