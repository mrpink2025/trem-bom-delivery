import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

// Game constants
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
const BALL_RADIUS = 12;
const POCKET_RADIUS = 18;
const TABLE_MARGIN = 60;
const FRICTION = 0.985;
const BOUNCE_DAMPING = 0.8;
const MAX_POWER = 20;

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'cue' | 'solid' | 'stripe' | 'eight';
  pocketed: boolean;
  color: string;
  stripeColor: string;
}

interface GameConfig {
  logoUrl?: string;
  logoScale?: number;
  logoOpacity?: number;
  logoRotation?: number;
}

interface Props {
  config?: GameConfig;
  onGameEvent?: (eventType: string, payload: any) => void;
}

const ProfessionalPoolGame: React.FC<Props> = ({ config = {}, onGameEvent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isAiming, setIsAiming] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'aiming' | 'shooting'>('waiting');
  const [currentPlayer, setCurrentPlayer] = useState(1);

  // Game config with defaults
  const gameConfig = {
    logoUrl: config.logoUrl || '/assets/brand/trembao-logo-sinuca.png',
    logoScale: Math.max(0, Math.min(1, config.logoScale || 0.6)),
    logoOpacity: Math.max(0, Math.min(1, config.logoOpacity || 0.3)),
    logoRotation: config.logoRotation || 0,
  };

  // Ball colors and properties
  const getBallProperties = (id: number) => {
    const ballData = {
      0: { color: '#FFFFFF', stripeColor: '#FFFFFF', type: 'cue' as const },
      1: { color: '#FFD700', stripeColor: '#FFD700', type: 'solid' as const },
      2: { color: '#0066CC', stripeColor: '#0066CC', type: 'solid' as const },
      3: { color: '#FF3333', stripeColor: '#FF3333', type: 'solid' as const },
      4: { color: '#8B008B', stripeColor: '#8B008B', type: 'solid' as const },
      5: { color: '#FF8C00', stripeColor: '#FF8C00', type: 'solid' as const },
      6: { color: '#228B22', stripeColor: '#228B22', type: 'solid' as const },
      7: { color: '#8B0000', stripeColor: '#8B0000', type: 'solid' as const },
      8: { color: '#000000', stripeColor: '#000000', type: 'eight' as const },
      9: { color: '#FFFFFF', stripeColor: '#FFD700', type: 'stripe' as const },
      10: { color: '#FFFFFF', stripeColor: '#0066CC', type: 'stripe' as const },
      11: { color: '#FFFFFF', stripeColor: '#FF3333', type: 'stripe' as const },
      12: { color: '#FFFFFF', stripeColor: '#8B008B', type: 'stripe' as const },
      13: { color: '#FFFFFF', stripeColor: '#FF8C00', type: 'stripe' as const },
      14: { color: '#FFFFFF', stripeColor: '#228B22', type: 'stripe' as const },
      15: { color: '#FFFFFF', stripeColor: '#8B0000', type: 'stripe' as const },
    };
    return ballData[id as keyof typeof ballData] || ballData[0];
  };

  // Initialize balls in triangle formation
  const initializeBalls = useCallback(() => {
    const newBalls: Ball[] = [];
    
    // Cue ball
    const cueProps = getBallProperties(0);
    newBalls.push({
      id: 0,
      x: CANVAS_WIDTH * 0.25,
      y: CANVAS_HEIGHT * 0.5,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      ...cueProps,
      pocketed: false
    });

    // Triangle formation
    const rackX = CANVAS_WIDTH * 0.75;
    const rackY = CANVAS_HEIGHT * 0.5;
    const ballSpacing = BALL_RADIUS * 2.1;
    
    const rackOrder = [1, 2, 3, 4, 8, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
    const positions = [
      // Row 1
      { row: 0, col: 0 },
      // Row 2
      { row: 1, col: -0.5 },
      { row: 1, col: 0.5 },
      // Row 3
      { row: 2, col: -1 },
      { row: 2, col: 0 }, // 8-ball center
      { row: 2, col: 1 },
      // Row 4
      { row: 3, col: -1.5 },
      { row: 3, col: -0.5 },
      { row: 3, col: 0.5 },
      { row: 3, col: 1.5 },
      // Row 5
      { row: 4, col: -2 },
      { row: 4, col: -1 },
      { row: 4, col: 0 },
      { row: 4, col: 1 },
      { row: 4, col: 2 }
    ];

    positions.forEach((pos, index) => {
      const ballId = rackOrder[index];
      const x = rackX - (pos.row * ballSpacing * Math.cos(Math.PI / 6));
      const y = rackY + (pos.col * ballSpacing);
      const ballProps = getBallProperties(ballId);
      
      newBalls.push({
        id: ballId,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        ...ballProps,
        pocketed: false
      });
    });

    setBalls(newBalls);
  }, []);

  // Pocket positions
  const pockets = [
    { x: TABLE_MARGIN, y: TABLE_MARGIN },
    { x: CANVAS_WIDTH / 2, y: TABLE_MARGIN - 5 },
    { x: CANVAS_WIDTH - TABLE_MARGIN, y: TABLE_MARGIN },
    { x: TABLE_MARGIN, y: CANVAS_HEIGHT - TABLE_MARGIN },
    { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - TABLE_MARGIN + 5 },
    { x: CANVAS_WIDTH - TABLE_MARGIN, y: CANVAS_HEIGHT - TABLE_MARGIN }
  ];

  // Physics functions
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
          // Collision response
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);
          
          // Rotate velocities
          const vx1 = ball1.vx * cos + ball1.vy * sin;
          const vy1 = ball1.vy * cos - ball1.vx * sin;
          const vx2 = ball2.vx * cos + ball2.vy * sin;
          const vy2 = ball2.vy * cos - ball2.vx * sin;
          
          // Exchange velocities (elastic collision)
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

  const checkPockets = useCallback((balls: Ball[]) => {
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
          
          if (onGameEvent) {
            onGameEvent('ballPocketed', {
              ballId: ball.id,
              ballType: ball.type,
              player: currentPlayer
            });
          }
        }
      });
    });
  }, [currentPlayer, onGameEvent]);

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
        if (ball.x - ball.radius < TABLE_MARGIN) {
          ball.x = TABLE_MARGIN + ball.radius;
          ball.vx = -ball.vx * BOUNCE_DAMPING;
        }
        if (ball.x + ball.radius > CANVAS_WIDTH - TABLE_MARGIN) {
          ball.x = CANVAS_WIDTH - TABLE_MARGIN - ball.radius;
          ball.vx = -ball.vx * BOUNCE_DAMPING;
        }
        if (ball.y - ball.radius < TABLE_MARGIN) {
          ball.y = TABLE_MARGIN + ball.radius;
          ball.vy = -ball.vy * BOUNCE_DAMPING;
        }
        if (ball.y + ball.radius > CANVAS_HEIGHT - TABLE_MARGIN) {
          ball.y = CANVAS_HEIGHT - TABLE_MARGIN - ball.radius;
          ball.vy = -ball.vy * BOUNCE_DAMPING;
        }
        
        return { ...ball };
      });
      
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
        
        const isMoving = balls.some(ball => 
          !ball.pocketed && (Math.abs(ball.vx) > 0.1 || Math.abs(ball.vy) > 0.1)
        );
        
        if (!isMoving) {
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

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw wood table background
    const woodGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    woodGradient.addColorStop(0, '#8B4513');
    woodGradient.addColorStop(0.3, '#A0522D');
    woodGradient.addColorStop(0.7, '#8B4513');
    woodGradient.addColorStop(1, '#654321');
    ctx.fillStyle = woodGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw wood border with 3D effect
    ctx.save();
    ctx.shadowColor = '#00000080';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // Outer border (lighter)
    ctx.fillStyle = '#CD853F';
    ctx.fillRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
    
    // Inner border (darker)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(25, 25, CANVAS_WIDTH - 50, CANVAS_HEIGHT - 50);
    ctx.restore();
    
    // Draw felt
    const feltGradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.8
    );
    feltGradient.addColorStop(0, '#228B22');
    feltGradient.addColorStop(0.6, '#196619');
    feltGradient.addColorStop(1, '#0F4C0F');
    ctx.fillStyle = feltGradient;
    ctx.fillRect(TABLE_MARGIN, TABLE_MARGIN, CANVAS_WIDTH - TABLE_MARGIN * 2, CANVAS_HEIGHT - TABLE_MARGIN * 2);
    
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
      const pocketGradient = ctx.createRadialGradient(
        pocket.x, pocket.y, 0,
        pocket.x, pocket.y, POCKET_RADIUS
      );
      pocketGradient.addColorStop(0, '#000000');
      pocketGradient.addColorStop(0.8, '#222222');
      pocketGradient.addColorStop(1, '#444444');
      
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = pocketGradient;
      ctx.fill();
      
      // Pocket rim
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 4;
      ctx.stroke();
    });
    
    // Draw balls
    balls.forEach(ball => {
      if (ball.pocketed) return;
      
      ctx.save();
      
      // Ball shadow
      ctx.beginPath();
      ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
      
      // Ball gradient for 3D effect
      const ballGradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
        ball.x, ball.y, ball.radius
      );
      ballGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      ballGradient.addColorStop(0.3, ball.color);
      ballGradient.addColorStop(1, ball.color === '#FFFFFF' ? '#CCCCCC' : '#000000');
      
      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.fill();
      
      // Ball outline
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw stripes for striped balls
      if (ball.type === 'stripe') {
        ctx.fillStyle = ball.stripeColor;
        const stripeWidth = ball.radius * 0.6;
        const stripeHeight = ball.radius * 0.25;
        
        ctx.fillRect(ball.x - stripeWidth/2, ball.y - stripeHeight/2, stripeWidth, stripeHeight);
        ctx.fillRect(ball.x - stripeWidth/2, ball.y - stripeHeight/2 - ball.radius * 0.5, stripeWidth, stripeHeight);
        ctx.fillRect(ball.x - stripeWidth/2, ball.y - stripeHeight/2 + ball.radius * 0.5, stripeWidth, stripeHeight);
      }
      
      // Ball number
      if (ball.id > 0) {
        ctx.fillStyle = ball.type === 'stripe' || ball.id === 8 ? '#FFFFFF' : '#000000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.id.toString(), ball.x, ball.y);
      }
      
      ctx.restore();
    });
    
    // Draw cue stick and aiming line
    if (isAiming && gamePhase === 'aiming') {
      const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
      if (cueBall) {
        const aimLength = power * 4 + 60;
        const cueStartX = cueBall.x + Math.cos(aimAngle) * 30;
        const cueStartY = cueBall.y + Math.sin(aimAngle) * 30;
        const cueEndX = cueBall.x + Math.cos(aimAngle) * aimLength;
        const cueEndY = cueBall.y + Math.sin(aimAngle) * aimLength;
        
        // Cue stick
        ctx.beginPath();
        ctx.moveTo(cueStartX, cueStartY);
        ctx.lineTo(cueEndX, cueEndY);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Cue tip
        ctx.beginPath();
        ctx.arc(cueStartX, cueStartY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        // Aiming line
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(cueBall.x - Math.cos(aimAngle) * 100, cueBall.y - Math.sin(aimAngle) * 100);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
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
        
        if (onGameEvent) {
          onGameEvent('shot', {
            power: power / 100,
            angle: aimAngle,
            player: currentPlayer
          });
        }
      }
    }
  }, [isAiming, gamePhase, balls, power, aimAngle, currentPlayer, onGameEvent]);

  const startGame = useCallback(() => {
    initializeBalls();
    setGameStarted(true);
    setGamePhase('aiming');
    setCurrentPlayer(1);
    
    if (onGameEvent) {
      onGameEvent('gameStart', { gameMode: '8Ball' });
    }
  }, [initializeBalls, onGameEvent]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🎱 8-Ball Pool</h1>
          <p className="text-white/80 mb-6">Professional Billiards Game</p>
          <Button 
            onClick={startGame}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg"
          >
            Start Game
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">🎱 8-Ball Pool</h2>
              <div className="text-sm bg-white/20 px-3 py-1 rounded">
                Player {currentPlayer} - {gamePhase === 'aiming' ? 'Aiming' : gamePhase === 'shooting' ? 'Shot in Progress' : 'Waiting'}
              </div>
            </div>
            
            <Button
              onClick={() => {
                setGameStarted(false);
                setGamePhase('waiting');
              }}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              New Game
            </Button>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="bg-amber-900/30 backdrop-blur border border-amber-700/50 rounded-lg p-6">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full max-w-full border-4 border-amber-700 rounded-lg cursor-crosshair shadow-2xl"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          />
        </div>

        {/* Controls */}
        {gamePhase === 'aiming' && (
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4">
            <div className="space-y-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Shot Power</span>
                <span className="text-sm font-mono bg-white/20 px-2 py-1 rounded">{power}%</span>
              </div>
              
              <input
                type="range"
                min="0"
                max="100"
                value={power}
                onChange={(e) => setPower(Number(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #22c55e 0%, #22c55e ${power}%, #374151 ${power}%, #374151 100%)`
                }}
              />
              
              <div className="text-center text-sm text-white/75">
                Move mouse to aim • Click and drag to set power • Release to shoot
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalPoolGame;