import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Timer, Target, Zap, RotateCcw, Settings, BookOpen, VolumeX, Volume2 } from 'lucide-react';
import { sinucaEngine, Ball, ShotResult } from '@/utils/sinucaEngine';
import { createSinucaAI, AIDifficulty } from '@/utils/sinucaAI';
import { sinucaSounds, initializeSoundsOnInteraction } from '@/utils/sinucaSounds';

// Interfaces
interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  number: number;
  inPocket: boolean;
  type: 'SOLID' | 'STRIPE' | 'CUE' | 'EIGHT';
}

interface GameConfig {
  uid?: string;
  jwt?: string;
  sig?: string;
  returnUrl?: string;
  logoUrl?: string;
  logoScale?: number;
  logoOpacity?: number;
  logoRotation?: number;
  targetOrigin?: string;
}

interface SinucaGameState {
  balls: Ball[];
  currentPlayer: 1 | 2;
  gamePhase: 'MENU' | 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL' | 'FINISHED';
  player1Group?: 'SOLID' | 'STRIPE';
  player2Group?: 'SOLID' | 'STRIPE';
  ballInHand?: boolean;
  shotClock: number;
  winner?: 1 | 2;
  fouls: number;
  gameMode: '1P' | '2P';
  aiDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  startTime?: number;
}

interface SinucaTremBaoProps {
  config?: GameConfig;
  onGameEvent?: (eventType: string, payload: any) => void;
}

// Game constants
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const BALL_RADIUS = 8;
const POCKET_RADIUS = 15;

// Trem Bão color palette
const COLORS = {
  primary: '#F59E0B', // Trem Bão yellow/orange
  secondary: '#2B5A2F', // Dark green
  felt: '#0F3128', // Pool table green
  wood: '#8B4513', // Wood brown
  white: '#FFFFFF',
  black: '#000000'
};

const SinucaTremBao: React.FC<SinucaTremBaoProps> = ({ 
  config = {}, 
  onGameEvent 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const { toast } = useToast();
  
  // Game state
  const [gameState, setGameState] = useState<SinucaGameState>({
    balls: [],
    currentPlayer: 1,
    gamePhase: 'MENU',
    shotClock: 30,
    fouls: 0,
    gameMode: '1P',
    aiDifficulty: 'MEDIUM'
  });

  // UI state
  const [aimAngle, setAimAngle] = useState(0);
  const [aimPower, setAimPower] = useState([50]);
  const [isAiming, setIsAiming] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);

  // Game config with defaults
  const gameConfig = useMemo(() => ({
    uid: config.uid || 'guest',
    jwt: config.jwt || '',
    sig: config.sig || '',
    returnUrl: config.returnUrl || '',
    logoUrl: config.logoUrl || '/assets/brand/trembao-logo.png',
    logoScale: Math.max(0, Math.min(1, config.logoScale || 0.6)),
    logoOpacity: Math.max(0, Math.min(1, config.logoOpacity || 0.9)),
    logoRotation: config.logoRotation || 0,
    targetOrigin: config.targetOrigin || window.location.origin
  }), [config]);

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
    
    // Also emit to parent window if in iframe
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'sinuca-' + eventType,
        ...eventData
      }, gameConfig.targetOrigin);
    }
    
    console.log('🎱 Event:', eventType, eventData);
  }, [gameConfig, onGameEvent]);

  // Initialize balls
  const initializeBalls = useCallback(() => {
    const balls = sinucaEngine.initializeBalls();
    setGameState(prev => ({ ...prev, balls }));
  }, []);

  // Canvas drawing
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw table background (wood border)
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw felt
    const feltMargin = 20;
    ctx.fillStyle = COLORS.felt;
    ctx.fillRect(feltMargin, feltMargin, 
      canvas.width - feltMargin * 2, 
      canvas.height - feltMargin * 2);
    
    // Draw logo on felt if configured
    if (gameConfig.logoUrl) {
      const logo = new Image();
      logo.onload = () => {
        const logoSize = Math.min(canvas.width, canvas.height) * gameConfig.logoScale;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = (canvas.height - logoSize) / 2;
        
        ctx.save();
        ctx.globalAlpha = gameConfig.logoOpacity;
        ctx.translate(logoX + logoSize/2, logoY + logoSize/2);
        ctx.rotate(gameConfig.logoRotation * Math.PI / 180);
        ctx.drawImage(logo, -logoSize/2, -logoSize/2, logoSize, logoSize);
        ctx.restore();
      };
      logo.src = gameConfig.logoUrl;
    }
    
    // Draw pockets
    const pockets = [
      { x: feltMargin, y: feltMargin },
      { x: canvas.width/2, y: feltMargin },
      { x: canvas.width - feltMargin, y: feltMargin },
      { x: feltMargin, y: canvas.height - feltMargin },
      { x: canvas.width/2, y: canvas.height - feltMargin },
      { x: canvas.width - feltMargin, y: canvas.height - feltMargin }
    ];
    
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.black;
      ctx.fill();
    });
    
    // Draw balls
    gameState.balls.forEach(ball => {
      if (ball.inPocket) return;
      
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw ball number
      if (ball.number > 0) {
        ctx.fillStyle = ball.type === 'STRIPE' ? COLORS.white : COLORS.black;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ball.number.toString(), ball.x, ball.y + 3);
      }
    });
    
    // Draw aim line if aiming
    if (isAiming && !animating) {
      const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);
      if (cueBall) {
        const aimLength = aimPower[0] * 2;
        const endX = cueBall.x + Math.cos(aimAngle) * aimLength;
        const endY = cueBall.y + Math.sin(aimAngle) * aimLength;
        
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw power indicator
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.primary;
        ctx.fill();
      }
    }
  }, [gameState, isAiming, aimAngle, aimPower, gameConfig, animating]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      drawGame();
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawGame]);

  // Mouse handling
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    
    if (isAiming) {
      const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);
      if (cueBall) {
        const angle = Math.atan2(y - cueBall.y, x - cueBall.x);
        setAimAngle(angle);
      }
    }
  }, [isAiming, gameState.balls]);

  const handleCanvasClick = useCallback(() => {
    if (animating) return;
    
    if (gameState.gamePhase === 'MENU') return;
    
    if (!isAiming) {
      setIsAiming(true);
    } else {
      // Execute shot
      const power = aimPower[0] / 100;
      executeShot(aimAngle, power);
    }
  }, [isAiming, aimPower, aimAngle, animating, gameState.gamePhase, emitGameEvent]);

  // Execute shot with physics
  const executeShot = useCallback((angle: number, power: number) => {
    emitGameEvent('shot', { power, angle });
    setIsAiming(false);
    setAnimating(true);
    
    const result = sinucaEngine.simulateShot(angle, power);
    
    // Play sounds
    result.sounds.forEach(sound => {
      sinucaSounds.playSound(sound as any);
    });
    
    // Update game state
    setTimeout(() => {
      setGameState(prev => ({ 
        ...prev, 
        balls: result.balls,
        currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
        fouls: prev.fouls + result.fouls.length
      }));
      setAnimating(false);
      
      // Emit events for potted balls
      result.pottedBalls.forEach(ball => {
        emitGameEvent('potted', { ball: { number: ball.number, type: ball.type } });
      });
      
      // Check fouls
      if (result.fouls.length > 0) {
        emitGameEvent('foul', { reason: result.fouls[0] });
        sinucaSounds.playSound('foul');
      }
    }, 1000);
  }, [emitGameEvent]);

  // Start new game
  const startGame = useCallback((mode: '1P' | '2P') => {
    setGameState(prev => ({
      ...prev,
      gameMode: mode,
      gamePhase: 'BREAK',
      currentPlayer: 1,
      startTime: Date.now(),
      winner: undefined,
      fouls: 0
    }));
    
    initializeBalls();
    setShowMenu(false);
    
    emitGameEvent('gameStart', { gameMode: mode });
  }, [initializeBalls, emitGameEvent]);

  // Handle visibility change (anti-AFK)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState.gamePhase !== 'MENU') {
        // Pause game logic here
        console.log('🎱 Game paused due to visibility change');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameState.gamePhase]);

  // Heartbeat
  useEffect(() => {
    if (gameState.gamePhase !== 'MENU' && gameState.startTime) {
      const interval = setInterval(() => {
        const playtimeSec = Math.floor((Date.now() - gameState.startTime!) / 1000);
        emitGameEvent('heartbeat', { playtimeSec });
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [gameState.gamePhase, gameState.startTime, emitGameEvent]);

  if (showMenu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-white/10 backdrop-blur border-white/20">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">Sinuca</h1>
              <p className="text-white/80">Trem Bão Delivery</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => startGame('1P')} 
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Target className="mr-2 h-4 w-4" />
                Jogar vs IA
              </Button>
              
              <Button 
                onClick={() => startGame('2P')} 
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                <Zap className="mr-2 h-4 w-4" />
                2 Jogadores
              </Button>
            </div>
            
            <Separator className="bg-white/20" />
            
            <div className="space-y-2">
              <Button 
                onClick={() => setShowRules(true)} 
                variant="ghost" 
                size="sm" 
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Regras
              </Button>
              
              <Button 
                onClick={() => setShowSettings(true)} 
                variant="ghost" 
                size="sm" 
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-secondary/80 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setShowMenu(true)} 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/10"
            >
              ← Menu
            </Button>
            
            <Badge variant="outline" className="border-primary text-primary">
              {gameState.gameMode === '1P' ? 'vs IA' : '2 Jogadores'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsMuted(!isMuted)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center gap-1 text-sm">
              <Timer className="h-4 w-4" />
              {gameState.shotClock}s
            </div>
          </div>
        </div>

        {/* Game Area */}
        <Card className="p-4 bg-wood">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={TABLE_WIDTH}
              height={TABLE_HEIGHT}
              className="w-full max-w-full border-4 border-wood rounded cursor-crosshair"
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
            />
            
            {/* Game HUD */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                Jogador {gameState.currentPlayer}
                {gameState.ballInHand && " - Ball in Hand"}
              </div>
              
              {animating && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 text-white px-4 py-2 rounded">
                    Executando tacada...
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Controls */}
        {isAiming && !animating && (
          <Card className="p-4 bg-white/10 backdrop-blur border-white/20">
            <div className="space-y-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm">Força da Tacada</span>
                <span className="text-sm font-mono">{aimPower[0]}%</span>
              </div>
              
              <Slider
                value={aimPower}
                onValueChange={setAimPower}
                max={100}
                min={1}
                step={1}
                className="w-full"
              />
              
              <div className="flex gap-2">
                <Button onClick={handleCanvasClick} className="flex-1 bg-primary hover:bg-primary/90">
                  Tacar
                </Button>
                
                <Button 
                  onClick={() => setIsAiming(false)} 
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SinucaTremBao;