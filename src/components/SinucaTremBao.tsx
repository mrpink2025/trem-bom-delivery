import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const BALL_RADIUS = 8;
const POCKET_RADIUS = 15;
const FRICTION = 0.98;
const MAX_POWER = 15;

// Ball colors (classic 8-ball pool)
const BALL_COLORS: Record<number, string> = {
  0: '#FFFFFF',  // Cue ball
  1: '#FFD700',  // Yellow (solid)
  2: '#0000FF',  // Blue (solid)
  3: '#FF0000',  // Red (solid)
  4: '#800080',  // Purple (solid)
  5: '#FFA500',  // Orange (solid)
  6: '#008000',  // Green (solid)
  7: '#8B0000',  // Maroon (solid)
  8: '#000000',  // Black (8-ball)
  9: '#FFFF80',  // Yellow stripe
  10: '#8080FF', // Blue stripe
  11: '#FF8080', // Red stripe
  12: '#FF80FF', // Purple stripe
  13: '#FFCC80', // Orange stripe
  14: '#80FF80', // Green stripe
  15: '#FF8080'  // Maroon stripe
};

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: 'CUE' | 'SOLID' | 'STRIPE' | 'EIGHT';
  pocketed: boolean;
}

interface GameConfig {
  uid?: string;
  logoUrl?: string;
  logoScale?: number;
  logoOpacity?: number;
  logoRotation?: number;
  targetOrigin?: string;
}

interface SinucaTremBaoProps {
  config?: GameConfig;
  onGameEvent?: (eventType: string, payload: any) => void;
}

const SinucaTremBao: React.FC<SinucaTremBaoProps> = ({ 
  config = {}, 
  onGameEvent 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [isAiming, setIsAiming] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'aiming' | 'shooting' | 'finished'>('waiting');
  
  // Game config with defaults
  const gameConfig = {
    uid: config.uid || 'guest',
    logoUrl: config.logoUrl || '/assets/brand/trembao-logo-sinuca.png',
    logoScale: Math.max(0, Math.min(1, config.logoScale || 0.6)),
    logoOpacity: Math.max(0, Math.min(1, config.logoOpacity || 0.9)),
    logoRotation: config.logoRotation || 0,
    targetOrigin: config.targetOrigin || window.location.origin
  };

  // Event emitter
  const emitGameEvent = useCallback((eventType: string, payload: any = {}) => {
    const eventData = {
      uid: gameConfig.uid,
      ts: Date.now(),
      ...payload
    };
    
    if (onGameEvent) {
      onGameEvent(eventType, eventData);
    }
    
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'sinuca-' + eventType,
        ...eventData
      }, gameConfig.targetOrigin);
    }
    
    console.log('🎱 Event:', eventType, eventData);
  }, [gameConfig, onGameEvent]);

  // Initialize balls in rack formation
  const initializeBalls = useCallback(() => {
    const newBalls: Ball[] = [];
    
    // Cue ball
    newBalls.push({
      id: 0,
      x: CANVAS_WIDTH * 0.25,
      y: CANVAS_HEIGHT * 0.5,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: BALL_COLORS[0],
      type: 'CUE',
      pocketed: false
    });

    // Rack the balls in triangle formation
    const rackX = CANVAS_WIDTH * 0.75;
    const rackY = CANVAS_HEIGHT * 0.5;
    const ballSpacing = BALL_RADIUS * 2.1;
    
    // Triangle formation positions
    const rackPositions = [
      // Row 1 (front ball - should be 1-ball)
      { row: 0, col: 0, ballId: 1 },
      
      // Row 2
      { row: 1, col: -0.5, ballId: 2 },
      { row: 1, col: 0.5, ballId: 3 },
      
      // Row 3 (8-ball in center)
      { row: 2, col: -1, ballId: 4 },
      { row: 2, col: 0, ballId: 8 },  // 8-ball in center
      { row: 2, col: 1, ballId: 5 },
      
      // Row 4
      { row: 3, col: -1.5, ballId: 6 },
      { row: 3, col: -0.5, ballId: 7 },
      { row: 3, col: 0.5, ballId: 9 },
      { row: 3, col: 1.5, ballId: 10 },
      
      // Row 5 (back row)
      { row: 4, col: -2, ballId: 11 },
      { row: 4, col: -1, ballId: 12 },
      { row: 4, col: 0, ballId: 13 },
      { row: 4, col: 1, ballId: 14 },
      { row: 4, col: 2, ballId: 15 }
    ];

    rackPositions.forEach(({ row, col, ballId }) => {
      const x = rackX - (row * ballSpacing * Math.cos(Math.PI / 6));
      const y = rackY + (col * ballSpacing);
      
      const ballType = ballId === 8 ? 'EIGHT' : ballId <= 7 ? 'SOLID' : 'STRIPE';
      
      newBalls.push({
        id: ballId,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        color: BALL_COLORS[ballId],
        type: ballType,
        pocketed: false
      });
    });

    setBalls(newBalls);
  }, []);

  // Pockets positions
  const pockets = [
    { x: 25, y: 25 },
    { x: CANVAS_WIDTH / 2, y: 15 },
    { x: CANVAS_WIDTH - 25, y: 25 },
    { x: 25, y: CANVAS_HEIGHT - 25 },
    { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 15 },
    { x: CANVAS_WIDTH - 25, y: CANVAS_HEIGHT - 25 }
  ];

  // Check ball collisions
  const checkCollisions = useCallback((balls: Ball[]) => {
    const activeBalls = balls.filter(ball => !ball.pocketed);
    
    for (let i = 0; i < activeBalls.length; i++) {
      for (let j = i + 1; j < activeBalls.length; j++) {
        const ball1 = activeBalls[i];
        const ball2 = activeBalls[j];
        
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ball1.radius + ball2.radius) {
          // Collision detected - resolve
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);
          
          // Rotate velocities
          const vx1 = ball1.vx * cos + ball1.vy * sin;
          const vy1 = ball1.vy * cos - ball1.vx * sin;
          const vx2 = ball2.vx * cos + ball2.vy * sin;
          const vy2 = ball2.vy * cos - ball2.vx * sin;
          
          // Collision response (elastic collision)
          const finalVx1 = vx2;
          const finalVx2 = vx1;
          
          // Rotate back
          ball1.vx = finalVx1 * cos - vy1 * sin;
          ball1.vy = vy1 * cos + finalVx1 * sin;
          ball2.vx = finalVx2 * cos - vy2 * sin;
          ball2.vy = vy2 * cos + finalVx2 * sin;
          
          // Separate balls
          const overlap = ball1.radius + ball2.radius - distance;
          const separateX = (dx / distance) * overlap * 0.5;
          const separateY = (dy / distance) * overlap * 0.5;
          
          ball1.x -= separateX;
          ball1.y -= separateY;
          ball2.x += separateX;
          ball2.y += separateY;
        }
      }
    }
  }, []);

  // Check pocket collisions
  const checkPockets = useCallback((balls: Ball[]) => {
    const pottedBalls: Ball[] = [];
    
    balls.forEach(ball => {
      if (ball.pocketed) return;
      
      pockets.forEach(pocket => {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < POCKET_RADIUS) {
          ball.pocketed = true;
          ball.vx = 0;
          ball.vy = 0;
          pottedBalls.push(ball);
          
          emitGameEvent('potted', { 
            ball: { number: ball.id, type: ball.type } 
          });
        }
      });
    });
    
    return pottedBalls;
  }, [emitGameEvent]);

  // Update physics
  const updatePhysics = useCallback(() => {
    setBalls(prevBalls => {
      const newBalls = prevBalls.map(ball => {
        if (ball.pocketed) return ball;
        
        // Apply friction
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        
        // Stop very slow balls
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.1) ball.vy = 0;
        
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Bounce off walls
        const margin = 30;
        if (ball.x - ball.radius < margin) {
          ball.x = margin + ball.radius;
          ball.vx = -ball.vx * 0.8;
        }
        if (ball.x + ball.radius > CANVAS_WIDTH - margin) {
          ball.x = CANVAS_WIDTH - margin - ball.radius;
          ball.vx = -ball.vx * 0.8;
        }
        if (ball.y - ball.radius < margin) {
          ball.y = margin + ball.radius;
          ball.vy = -ball.vy * 0.8;
        }
        if (ball.y + ball.radius > CANVAS_HEIGHT - margin) {
          ball.y = CANVAS_HEIGHT - margin - ball.radius;
          ball.vy = -ball.vy * 0.8;
        }
        
        return { ...ball };
      });
      
      // Check collisions
      checkCollisions(newBalls);
      checkPockets(newBalls);
      
      return newBalls;
    });
  }, [checkCollisions, checkPockets]);

  // Game loop
  useEffect(() => {
    if (gamePhase === 'shooting') {
      const gameLoop = () => {
        updatePhysics();
        
        // Check if all balls stopped
        const isMoving = balls.some(ball => 
          !ball.pocketed && (Math.abs(ball.vx) > 0.1 || Math.abs(ball.vy) > 0.1)
        );
        
        if (!isMoving && gamePhase === 'shooting') {
          setGamePhase('aiming');
          setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
      };
      
      gameLoop();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gamePhase, balls, updatePhysics, currentPlayer]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw table background (wood)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw felt
    const margin = 25;
    ctx.fillStyle = '#0F5132';
    ctx.fillRect(margin, margin, CANVAS_WIDTH - margin * 2, CANVAS_HEIGHT - margin * 2);
    
    // Draw logo on felt
    const logo = new Image();
    logo.onload = () => {
      const logoSize = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * gameConfig.logoScale;
      const logoX = (CANVAS_WIDTH - logoSize) / 2;
      const logoY = (CANVAS_HEIGHT - logoSize) / 2;
      
      ctx.save();
      ctx.globalAlpha = gameConfig.logoOpacity;
      ctx.translate(logoX + logoSize/2, logoY + logoSize/2);
      ctx.rotate(gameConfig.logoRotation * Math.PI / 180);
      ctx.drawImage(logo, -logoSize/2, -logoSize/2, logoSize, logoSize);
      ctx.restore();
    };
    logo.src = gameConfig.logoUrl;
    
    // Draw pockets
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    });
    
    // Draw balls
    balls.forEach(ball => {
      if (ball.pocketed) return;
      
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw ball number
      if (ball.id > 0) {
        ctx.fillStyle = ball.type === 'STRIPE' ? '#000' : '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ball.id.toString(), ball.x, ball.y + 3);
      }
      
      // Draw stripes for striped balls
      if (ball.type === 'STRIPE') {
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ball.x - ball.radius * 0.7, ball.y - ball.radius * 0.3);
        ctx.lineTo(ball.x + ball.radius * 0.7, ball.y - ball.radius * 0.3);
        ctx.moveTo(ball.x - ball.radius * 0.7, ball.y + ball.radius * 0.3);
        ctx.lineTo(ball.x + ball.radius * 0.7, ball.y + ball.radius * 0.3);
        ctx.stroke();
      }
    });
    
    // Draw aiming line
    if (isAiming && gamePhase === 'aiming') {
      const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
      if (cueBall) {
        const aimLength = power * 3;
        const endX = cueBall.x + Math.cos(aimAngle) * aimLength;
        const endY = cueBall.y + Math.sin(aimAngle) * aimLength;
        
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw power indicator
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
      }
    }
  }, [balls, isAiming, aimAngle, power, gamePhase, gameConfig]);

  // Render loop
  useEffect(() => {
    const renderLoop = () => {
      render();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }, [render]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAiming || gamePhase !== 'aiming') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
    if (cueBall) {
      const angle = Math.atan2(y - cueBall.y, x - cueBall.x);
      setAimAngle(angle);
    }
  }, [isAiming, gamePhase, balls]);

  const handleMouseDown = useCallback(() => {
    if (gamePhase === 'aiming') {
      setIsAiming(true);
    }
  }, [gamePhase]);

  const handleMouseUp = useCallback(() => {
    if (isAiming && gamePhase === 'aiming') {
      // Execute shot
      const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
      if (cueBall && power > 0) {
        const shotPower = (power / 100) * MAX_POWER;
        
        setBalls(prevBalls => 
          prevBalls.map(ball => {
            if (ball.id === 0) {
              return {
                ...ball,
                vx: Math.cos(aimAngle) * shotPower,
                vy: Math.sin(aimAngle) * shotPower
              };
            }
            return ball;
          })
        );
        
        setGamePhase('shooting');
        setIsAiming(false);
        setPower(0);
        
        emitGameEvent('shot', { 
          power: power / 100, 
          angle: aimAngle 
        });
      }
    }
  }, [isAiming, gamePhase, balls, power, aimAngle, emitGameEvent]);

  // Start game
  const startGame = useCallback(() => {
    initializeBalls();
    setGameStarted(true);
    setGamePhase('aiming');
    setCurrentPlayer(1);
    
    emitGameEvent('gameStart', { gameMode: '2P' });
  }, [initializeBalls, emitGameEvent]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-white/10 backdrop-blur border-white/20">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">🎱 Sinuca</h1>
              <p className="text-white/80">Trem Bão Delivery</p>
            </div>
            
            <Button 
              onClick={startGame}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              size="lg"
            >
              Iniciar Jogo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-white/10 backdrop-blur border-white/20">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">🎱 Sinuca Trem Bão</h2>
              <div className="text-sm">
                Jogador {currentPlayer} - {gamePhase === 'aiming' ? 'Mirando' : gamePhase === 'shooting' ? 'Tacada' : 'Aguardando'}
              </div>
            </div>
            
            <Button
              onClick={() => {
                setGameStarted(false);
                setGamePhase('waiting');
              }}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Reiniciar
            </Button>
          </div>
        </Card>

        {/* Game Canvas */}
        <Card className="p-4 bg-amber-900/20 backdrop-blur border-amber-700/30">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full max-w-full border-4 border-amber-700 rounded cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          />
        </Card>

        {/* Controls */}
        {gamePhase === 'aiming' && (
          <Card className="p-4 bg-white/10 backdrop-blur border-white/20">
            <div className="space-y-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm">Força da Tacada</span>
                <span className="text-sm font-mono">{power}%</span>
              </div>
              
              <input
                type="range"
                min="0"
                max="100"
                value={power}
                onChange={(e) => setPower(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              
              <div className="text-center text-sm opacity-75">
                Mova o mouse para mirar • Clique e arraste para ajustar a força • Solte para tacar
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SinucaTremBao;