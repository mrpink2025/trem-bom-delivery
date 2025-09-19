import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Settings, RotateCcw, Trophy } from 'lucide-react';
import { BilliardsEngine } from './billiards/engine/BilliardsEngine';
import { BilliardsRenderer } from './billiards/render/BilliardsRenderer';
import { BilliardsPhysics } from './billiards/physics/BilliardsPhysics';
import { GameUI } from './billiards/ui/GameUI';
import { GameConfig, GameState, LogoConfig } from './billiards/types/GameTypes';

interface SinucaTremBaoProps {
  uid?: string;
  jwt?: string;
  sig?: string;
  returnUrl?: string;
  logoUrl?: string;
  logoScale?: number;
  logoOpacity?: number;
  logoRotation?: number;
  onGameEvent?: (event: any) => void;
}

export const SinucaTremBao: React.FC<SinucaTremBaoProps> = ({
  uid,
  jwt,
  sig,
  returnUrl,
  logoUrl = '/assets/brand/trembao-logo.png',
  logoScale = 0.6,
  logoOpacity = 0.85,
  logoRotation = 0,
  onGameEvent
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BilliardsEngine | null>(null);
  const rendererRef = useRef<BilliardsRenderer | null>(null);
  const physicsRef = useRef<BilliardsPhysics | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'MENU',
    currentPlayer: 1,
    playerGroups: { 1: null, 2: null },
    scores: { 1: 0, 2: 0 },
    fouls: { 1: 0, 2: 0 },
    gameMode: '1P',
    isPaused: false,
    isGameOver: false,
    winner: null
  });
  
  const [config, setConfig] = useState<GameConfig>({
    quality: 'HIGH',
    soundEnabled: true,
    showTrajectory: true,
    logoConfig: {
      url: logoUrl,
      scale: logoScale,
      opacity: logoOpacity,
      rotation: logoRotation
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [power, setPower] = useState(0);
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [aimAngle, setAimAngle] = useState(0);

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const initializeGame = async () => {
      try {
        setIsLoading(true);
        
        // Initialize physics engine
        const physics = new BilliardsPhysics();
        physicsRef.current = physics;
        
        // Initialize renderer with Trem Bão branding
        const renderer = new BilliardsRenderer(canvasRef.current, config);
        await renderer.initialize();
        rendererRef.current = renderer;
        
        // Initialize game engine
        const engine = new BilliardsEngine(physics, renderer, config);
        await engine.initialize();
        engineRef.current = engine;
        
        // Setup game event handlers
        engine.onGameEvent = (event) => {
          handleGameEvent(event);
          if (onGameEvent) onGameEvent(event);
        };
        
        // Setup game state updates
        engine.onStateChange = (newState) => {
          setGameState(prev => ({ ...prev, ...newState }));
        };
        
        setIsLoading(false);
        console.log('🎱 Sinuca Trem Bão initialized successfully');
        
      } catch (error) {
        console.error('Failed to initialize Sinuca Trem Bão:', error);
        setIsLoading(false);
      }
    };

    initializeGame();

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (physicsRef.current) {
        physicsRef.current.dispose();
      }
    };
  }, []);

  // Handle visibility change (anti-AFK)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState.phase === 'PLAYING') {
        pauseGame();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameState.phase]);

  // Update logo configuration
  useEffect(() => {
    if (rendererRef.current) {
      const newLogoConfig: LogoConfig = {
        url: logoUrl,
        scale: logoScale,
        opacity: logoOpacity,
        rotation: logoRotation
      };
      
      rendererRef.current.updateLogoConfig(newLogoConfig);
      setConfig(prev => ({ ...prev, logoConfig: newLogoConfig }));
    }
  }, [logoUrl, logoScale, logoOpacity, logoRotation]);

  const handleGameEvent = useCallback((event: any) => {
    console.log('🎱 Game event:', event.type, event);
    
    // Send event to parent via postMessage (for integration)
    if (window.parent && window.parent !== window) {
      const targetOrigin = window.location.origin; // Should be configured
      window.parent.postMessage({
        type: 'sinuca-event',
        event: event,
        uid: uid,
        timestamp: Date.now()
      }, targetOrigin);
    }
    
    // Handle specific events
    switch (event.type) {
      case 'gameStart':
        setGameState(prev => ({ ...prev, phase: 'PLAYING' }));
        break;
      case 'frameEnd':
        if (event.winner) {
          setGameState(prev => ({ 
            ...prev, 
            isGameOver: true, 
            winner: event.winner,
            phase: 'GAME_OVER'
          }));
        }
        break;
      case 'foul':
        setGameState(prev => ({
          ...prev,
          fouls: {
            ...prev.fouls,
            [event.player]: prev.fouls[event.player] + 1
          }
        }));
        break;
    }
  }, [uid]);

  const startGame = useCallback((mode: '1P' | '2P') => {
    if (engineRef.current) {
      engineRef.current.startNewGame(mode);
      setGameState(prev => ({ 
        ...prev, 
        gameMode: mode,
        phase: 'PLAYING',
        isGameOver: false,
        winner: null,
        scores: { 1: 0, 2: 0 },
        fouls: { 1: 0, 2: 0 }
      }));
    }
  }, []);

  const pauseGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
      setGameState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resumeGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
      setGameState(prev => ({ ...prev, isPaused: false }));
    }
  }, []);

  const resetGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setGameState(prev => ({ 
        ...prev, 
        phase: 'MENU',
        isGameOver: false,
        winner: null,
        scores: { 1: 0, 2: 0 },
        fouls: { 1: 0, 2: 0 }
      }));
    }
  }, []);

  const executeShot = useCallback(() => {
    if (engineRef.current && gameState.phase === 'PLAYING') {
      engineRef.current.executeShot({
        power,
        angle: aimAngle,
        spin
      });
      
      // Reset controls
      setPower(0);
      setSpin({ x: 0, y: 0 });
    }
  }, [power, aimAngle, spin, gameState.phase]);

  const toggleSound = useCallback(() => {
    setConfig(prev => ({ 
      ...prev, 
      soundEnabled: !prev.soundEnabled 
    }));
    
    if (engineRef.current) {
      engineRef.current.setSoundEnabled(!config.soundEnabled);
    }
  }, [config.soundEnabled]);

  const changeQuality = useCallback((quality: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setConfig(prev => ({ ...prev, quality }));
    
    if (rendererRef.current) {
      rendererRef.current.setQuality(quality);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-900 to-green-700">
        <Card className="p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">Carregando Sinuca Trem Bão...</h2>
          <p className="text-muted-foreground">Preparando a mesa para você!</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-green-900 to-green-700 overflow-hidden">
      {/* Main Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Game UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <GameUI
          gameState={gameState}
          config={config}
          power={power}
          spin={spin}
          aimAngle={aimAngle}
          onPowerChange={setPower}
          onSpinChange={setSpin}
          onAimChange={setAimAngle}
          onShoot={executeShot}
          onPause={pauseGame}
          onResume={resumeGame}
          onReset={resetGame}
          onStartGame={startGame}
          onToggleSound={toggleSound}
          onQualityChange={changeQuality}
        />
      </div>

      {/* Menu Overlay */}
      {gameState.phase === 'MENU' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-auto">
          <Card className="p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <img 
                src="/assets/brand/trembao-logo.png" 
                alt="Trem Bão" 
                className="w-24 h-24 mx-auto mb-4 object-contain"
              />
              <h1 className="text-3xl font-bold text-primary mb-2">Sinuca</h1>
              <p className="text-muted-foreground">Trem Bão Delivery</p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={() => startGame('1P')} 
                className="w-full"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5" />
                Treino (1 Jogador)
              </Button>
              
              <Button 
                onClick={() => startGame('2P')} 
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Trophy className="mr-2 h-5 w-5" />
                Local (2 Jogadores)
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Som</span>
                <Switch 
                  checked={config.soundEnabled}
                  onCheckedChange={toggleSound}
                />
              </div>
              
              <div className="space-y-2">
                <span className="text-sm">Qualidade Gráfica</span>
                <div className="flex gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((quality) => (
                    <Button
                      key={quality}
                      variant={config.quality === quality ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => changeQuality(quality)}
                      className="flex-1"
                    >
                      {quality === 'LOW' ? 'Baixa' : quality === 'MEDIUM' ? 'Média' : 'Alta'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-auto">
          <Card className="p-8 max-w-md w-full mx-4 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">
              {gameState.winner === 1 ? 'Jogador 1 Venceu!' : 'Jogador 2 Venceu!'}
            </h2>
            <p className="text-muted-foreground mb-6">
              Parabéns pela partida!
            </p>
            <div className="space-y-3">
              <Button onClick={resetGame} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Nova Partida
              </Button>
              <Button onClick={() => setGameState(prev => ({ ...prev, phase: 'MENU' }))} variant="outline" className="w-full">
                Menu Principal
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SinucaTremBao;