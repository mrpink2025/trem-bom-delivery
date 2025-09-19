import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Settings, RotateCcw, Trophy, Target, Zap } from 'lucide-react';
import { Game3D } from './billiards3d/Game3D';
import { GameState3D, GameConfig3D, LogoConfig, ShotData3D, GameEvent3D } from './billiards3d/types/GameTypes';
import * as THREE from 'three';

interface SinucaTremBaoProps {
  uid?: string;
  jwt?: string;
  sig?: string;
  returnUrl?: string;
  logoUrl?: string;
  logoScale?: number;
  logoOpacity?: number;
  logoRotation?: number;
  onGameEvent?: (event: GameEvent3D) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game3D | null>(null);
  
  const [gameState, setGameState] = useState<GameState3D>({
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
  
  const [config, setConfig] = useState<GameConfig3D>({
    quality: 'HIGH',
    soundEnabled: true,
    physics: {
      gravity: -9.82 * 30,
      friction: 0.7,
      restitution: 0.1
    }
  });
  
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    url: logoUrl,
    scale: logoScale,
    opacity: logoOpacity,
    rotation: logoRotation
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [power, setPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);

  // Initialize 3D game engine
  useEffect(() => {
    if (!containerRef.current) return;

    const initializeGame = async () => {
      try {
        setIsLoading(true);
        
        // Initialize 3D game
        const game = new Game3D(containerRef.current, config, logoConfig);
        gameRef.current = game;
        
        // Setup game event handlers
        game.onGameEvent = (event) => {
          handleGameEvent(event);
          if (onGameEvent) onGameEvent(event);
        };
        
        // Setup game state updates
        game.onStateChange = (newState) => {
          setGameState(prev => ({ ...prev, ...newState }));
        };
        
        setIsLoading(false);
        console.log('🎱 Sinuca 3D Trem Bão initialized successfully');
        
      } catch (error) {
        console.error('Failed to initialize Sinuca 3D Trem Bão:', error);
        setIsLoading(false);
      }
    };

    initializeGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
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
    const newLogoConfig: LogoConfig = {
      url: logoUrl,
      scale: logoScale,
      opacity: logoOpacity,
      rotation: logoRotation
    };
    
    setLogoConfig(newLogoConfig);
    
    if (gameRef.current) {
      gameRef.current.updateLogo(newLogoConfig);
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
        if (event.data?.ready) {
          setGameState(prev => ({ ...prev, phase: 'MENU' }));
        } else {
          setGameState(prev => ({ ...prev, phase: 'PLAYING' }));
        }
        break;
      case 'frameEnd':
        if (event.data?.winner) {
          setGameState(prev => ({ 
            ...prev, 
            isGameOver: true, 
            winner: event.data.winner,
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
    if (gameRef.current) {
      gameRef.current.startNewGame(mode);
    }
  }, []);

  const pauseGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.pause();
    }
  }, []);

  const resumeGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.resume();
    }
  }, []);

  const resetGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.startNewGame(gameState.gameMode);
      setGameState(prev => ({ 
        ...prev, 
        phase: 'MENU',
        isGameOver: false,
        winner: null
      }));
    }
  }, [gameState.gameMode]);

  const executeShot = useCallback(() => {
    if (gameRef.current && gameState.phase === 'PLAYING' && power > 0) {
      const shotData: ShotData3D = {
        power: power,
        direction: new THREE.Vector3(Math.cos(aimAngle), 0, Math.sin(aimAngle))
      };
      
      gameRef.current.executeShot(shotData);
      
      // Reset controls
      setPower(0);
    }
  }, [power, aimAngle, gameState.phase]);

  const toggleSound = useCallback(() => {
    setConfig(prev => ({ 
      ...prev, 
      soundEnabled: !prev.soundEnabled 
    }));
  }, []);

  const changeQuality = useCallback((quality: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setConfig(prev => ({ ...prev, quality }));
  }, []);


  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-green-900 to-green-700 overflow-hidden">
      {/* Main 3D Game Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <Card className="p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Carregando Sinuca Trem Bão...</h2>
            <p className="text-muted-foreground">Preparando a mesa para você!</p>
          </Card>
        </div>
      )}
      
      {/* Game Controls UI */}
      {gameState.phase === 'PLAYING' && !gameState.isPaused && (
        <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
          <Card className="p-4 bg-black/80 backdrop-blur-sm text-white">
            <div className="space-y-4">
              {/* Player Info */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                  {gameState.gameMode === '1P' ? 'Treino' : `Jogador ${gameState.currentPlayer}`}
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSound}
                    className="text-white hover:bg-white/10"
                  >
                    {config.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={gameState.isPaused ? resumeGame : pauseGame}
                    className="text-white hover:bg-white/10"
                  >
                    {gameState.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetGame}
                    className="text-white hover:bg-white/10"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Shot Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Força
                    </label>
                    <span className="text-xs text-white/70">{power}%</span>
                  </div>
                  <Slider
                    value={[power]}
                    onValueChange={(value) => setPower(value[0])}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Mira
                    </label>
                    <span className="text-xs text-white/70">{Math.round(aimAngle * 180 / Math.PI)}°</span>
                  </div>
                  <Slider
                    value={[aimAngle]}
                    onValueChange={(value) => {
                      setAimAngle(value[0]);
                      gameRef.current?.setAimDirection(value[0]);
                    }}
                    max={Math.PI * 2}
                    min={0}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Shoot Button */}
              <Button
                onClick={executeShot}
                className="w-full bg-primary hover:bg-primary/80"
                size="lg"
                disabled={power === 0}
              >
                <Target className="mr-2 h-5 w-5" />
                Executar Tacada ({power}%)
              </Button>
            </div>
          </Card>
        </div>
      )}

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