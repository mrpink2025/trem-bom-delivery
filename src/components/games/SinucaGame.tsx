import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import { Target, Timer, MessageCircle, RotateCcw } from 'lucide-react';

interface Ball {
  id: number;
  x: number;
  y: number;
  color: 'white' | 'solid' | 'striped';
  number?: number;
  pocketed: boolean;
}

interface GameState {
  players: string[];
  currentPlayer?: string;
  balls?: Ball[];
  playerTypes?: { [key: string]: 'solid' | 'striped' | null };
  gamePhase: 'waiting' | 'playing' | 'finished';
  fouls?: string[];
  winner?: string;
}

interface SinucaGameProps {
  gameState: GameState | null;
  isMyTurn: boolean;
  myPlayerId: string;
  onShoot: (angle: number, power: number) => void;
  onSendMessage: (message: string) => void;
}

export const SinucaGame: React.FC<SinucaGameProps> = ({
  gameState,
  isMyTurn,
  myPlayerId,
  onShoot,
  onSendMessage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState([50]);
  const [isAiming, setIsAiming] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  // Timer para o turno
  useEffect(() => {
    if (isMyTurn && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isMyTurn, timeLeft]);

  // Reset timer quando muda o turno
  useEffect(() => {
    if (isMyTurn) {
      setTimeLeft(30);
    }
  }, [isMyTurn]);

  // Desenhar mesa de sinuca
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar mesa
    ctx.fillStyle = '#0f5132';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar bordas
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Desenhar caçapas (buracos)
    const pockets = [
      { x: 20, y: 20 }, { x: canvas.width / 2, y: 10 }, { x: canvas.width - 20, y: 20 },
      { x: 20, y: canvas.height - 20 }, { x: canvas.width / 2, y: canvas.height - 10 }, 
      { x: canvas.width - 20, y: canvas.height - 20 }
    ];

    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    });

    // Desenhar bolas
    gameState.balls?.forEach(ball => {
      if (ball.pocketed) return;

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
      
      if (ball.color === 'white') {
        ctx.fillStyle = '#fff';
      } else if (ball.color === 'solid') {
        ctx.fillStyle = ball.number === 8 ? '#000' : `hsl(${(ball.number || 1) * 45}, 70%, 50%)`;
      } else {
        ctx.fillStyle = '#fff';
      }
      
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Desenhar número
      if (ball.number) {
        ctx.fillStyle = ball.color === 'solid' && ball.number !== 8 ? '#fff' : '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ball.number.toString(), ball.x, ball.y + 3);
      }

      // Desenhar listra para bolas listradas
      if (ball.color === 'striped') {
        ctx.strokeStyle = `hsl(${(ball.number || 9) * 45}, 70%, 50%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, Math.PI);
        ctx.stroke();
      }
    });

    // Desenhar mira se é minha vez
    if (isMyTurn && isAiming) {
      const whiteBall = gameState.balls?.find(b => b.color === 'white' && !b.pocketed);
      if (whiteBall) {
        const aimLength = 60;
        const endX = whiteBall.x + Math.cos(aimAngle) * aimLength;
        const endY = whiteBall.y + Math.sin(aimAngle) * aimLength;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(whiteBall.x, whiteBall.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [gameState, aimAngle, isAiming, isMyTurn]);

  // Handle mouse movement for aiming
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || !gameState) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const whiteBall = gameState.balls?.find(b => b.color === 'white' && !b.pocketed);
    if (whiteBall) {
      const angle = Math.atan2(mouseY - whiteBall.y, mouseX - whiteBall.x);
      setAimAngle(angle);
      setIsAiming(true);
    }
  };

  const handleShoot = () => {
    onShoot(aimAngle, power[0]);
    setIsAiming(false);
  };

  if (!gameState || gameState.gamePhase === 'waiting') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Aguardando jogadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Badge variant={isMyTurn ? 'default' : 'secondary'}>
              {isMyTurn ? 'Sua vez' : 'Aguardando...'}
            </Badge>
            
            <div className="text-sm text-muted-foreground">
              Sinuca - Bola 8
            </div>
          </div>
          
          {isMyTurn && (
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className={`font-mono ${timeLeft <= 5 ? 'text-destructive animate-pulse' : ''}`}>
                {timeLeft}s
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Placar */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {gameState.players.map(playerId => {
            const playerType = gameState.playerTypes?.[playerId];
            return (
              <div key={playerId} className={`text-center p-3 rounded-lg ${
                playerId === gameState.currentPlayer ? 'bg-primary/10 border border-primary' : 'bg-muted'
              }`}>
                <div className="font-semibold">
                  {playerId === myPlayerId ? 'Você' : `Oponente`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {playerType === 'solid' ? 'Lisas' : playerType === 'striped' ? 'Listradas' : 'Indefinido'}
                </div>
                <div className="flex justify-center space-x-1 mt-2">
                  {gameState.balls?.filter(b => 
                    b.pocketed && 
                    ((playerType === 'solid' && b.color === 'solid' && b.number !== 8) ||
                     (playerType === 'striped' && b.color === 'striped'))
                  ).map(ball => (
                    <div key={ball.id} className="w-4 h-4 rounded-full bg-primary"></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Mesa de Sinuca */}
      <Card className="p-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold flex items-center justify-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Mesa de Sinuca</span>
          </h3>
        </div>
        
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="border rounded-lg mx-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIsAiming(false)}
        />
        
        {/* Controles de Tiro */}
        {isMyTurn && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Força:</span>
              <div className="flex-1 max-w-xs">
                <Slider
                  value={power}
                  onValueChange={setPower}
                  max={100}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>
              <span className="text-sm text-muted-foreground">{power[0]}%</span>
            </div>
            
            <Button 
              onClick={handleShoot} 
              disabled={!isAiming}
              className="w-full"
            >
              Disparar
            </Button>
          </div>
        )}
      </Card>

      {/* Fouls */}
      {gameState.fouls && gameState.fouls.length > 0 && (
        <Card className="p-4 bg-destructive/5 border-destructive">
          <h3 className="font-semibold text-destructive mb-2">Faltas na Partida</h3>
          <ul className="text-sm space-y-1">
            {gameState.fouls.map((foul, index) => (
              <li key={index} className="text-destructive">• {foul}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Chat */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <MessageCircle className="h-4 w-4" />
          <h3 className="font-semibold">Chat</h3>
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 px-3 py-2 border rounded-lg"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && chatMessage.trim()) {
                onSendMessage(chatMessage);
                setChatMessage('');
              }
            }}
          />
          <Button
            onClick={() => {
              if (chatMessage.trim()) {
                onSendMessage(chatMessage);
                setChatMessage('');
              }
            }}
            size="sm"
          >
            Enviar
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {['Boa tacada!', 'Que sorte!', 'Concentração!', 'Próxima!'].map(msg => (
            <Button
              key={msg}
              variant="outline"
              size="sm"
              onClick={() => onSendMessage(msg)}
            >
              {msg}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};