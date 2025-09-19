import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Settings, 
  RotateCcw, 
  Target,
  Zap,
  RotateCw
} from 'lucide-react';
import { GameState, GameConfig } from '../types/GameTypes';

interface GameUIProps {
  gameState: GameState;
  config: GameConfig;
  power: number;
  spin: { x: number; y: number };
  aimAngle: number;
  onPowerChange: (power: number) => void;
  onSpinChange: (spin: { x: number; y: number }) => void;
  onAimChange: (angle: number) => void;
  onShoot: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStartGame: (mode: '1P' | '2P') => void;
  onToggleSound: () => void;
  onQualityChange: (quality: 'LOW' | 'MEDIUM' | 'HIGH') => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  gameState,
  config,
  power,
  spin,
  aimAngle,
  onPowerChange,
  onSpinChange,
  onAimChange,
  onShoot,
  onPause,
  onResume,
  onReset,
  onStartGame,
  onToggleSound,
  onQualityChange
}) => {
  const currentPlayerName = gameState.gameMode === '1P' ? 'Você' : `Jogador ${gameState.currentPlayer}`;
  const playerGroup = gameState.playerGroups[gameState.currentPlayer];
  const playerScore = gameState.scores[gameState.currentPlayer];
  const playerFouls = gameState.fouls[gameState.currentPlayer];

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      {/* Top Status Bar */}
      <div className="pointer-events-auto flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-black/50 text-white border-white/20">
            {gameState.phase === 'BREAK' ? 'Quebra' : 
             gameState.phase === 'PLAYING' ? 'Jogando' : 
             gameState.phase === 'PAUSED' ? 'Pausado' : 'Menu'}
          </Badge>
          
          {gameState.phase === 'PLAYING' && (
            <div className="text-white">
              <span className="font-bold">{currentPlayerName}</span>
              {playerGroup && (
                <span className="ml-2 text-sm opacity-75">
                  ({playerGroup === 'solid' ? 'Lisas' : 'Listradas'})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSound}
            className="text-white hover:bg-white/10"
          >
            {config.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          {/* Pause/Resume */}
          {gameState.phase === 'PLAYING' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={gameState.isPaused ? onResume : onPause}
              className="text-white hover:bg-white/10"
            >
              {gameState.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Game Controls */}
      {gameState.phase === 'PLAYING' && !gameState.isPaused && (
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 flex flex-col items-center gap-4">
          
          {/* Shot Controls */}
          <Card className="w-full max-w-md p-4 bg-black/50 backdrop-blur-sm border-white/20">
            <div className="space-y-4">
              
              {/* Power Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Força
                  </label>
                  <span className="text-xs text-white/70">{Math.round(power * 100)}%</span>
                </div>
                <Slider
                  value={[power]}
                  onValueChange={(value) => onPowerChange(value[0])}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Spin Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Spin X</label>
                  <Slider
                    value={[spin.x]}
                    onValueChange={(value) => onSpinChange({ ...spin, x: value[0] })}
                    max={1}
                    min={-1}
                    step={0.01}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Spin Y</label>
                  <Slider
                    value={[spin.y]}
                    onValueChange={(value) => onSpinChange({ ...spin, y: value[0] })}
                    max={1}
                    min={-1}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Aim Angle Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Mira
                  </label>
                  <span className="text-xs text-white/70">{Math.round(aimAngle * 180 / Math.PI)}°</span>
                </div>
                <Slider
                  value={[aimAngle]}
                  onValueChange={(value) => onAimChange(value[0])}
                  max={Math.PI * 2}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Shoot Button */}
              <Button
                onClick={onShoot}
                className="w-full bg-primary hover:bg-primary/80"
                size="lg"
                disabled={power === 0}
              >
                <Target className="mr-2 h-5 w-5" />
                Executar Tacada
              </Button>
            </div>
          </Card>

          {/* Quick Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPowerChange(0)}
              className="bg-black/50 text-white border-white/20 hover:bg-white/10"
            >
              Reset Força
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSpinChange({ x: 0, y: 0 })}
              className="bg-black/50 text-white border-white/20 hover:bg-white/10"
            >
              Reset Spin
            </Button>
          </div>
        </div>
      )}

      {/* Score Display */}
      {gameState.gameMode === '2P' && gameState.phase === 'PLAYING' && (
        <div className="pointer-events-auto absolute top-20 left-4 right-4 flex justify-center">
          <Card className="bg-black/50 backdrop-blur-sm border-white/20 p-3">
            <div className="flex items-center gap-6 text-white text-sm">
              <div className="text-center">
                <div className="font-bold">Jogador 1</div>
                <div className="text-lg">{gameState.scores[1]}</div>
                <div className="text-xs opacity-70">
                  {gameState.playerGroups[1] === 'solid' ? 'Lisas' : 
                   gameState.playerGroups[1] === 'stripe' ? 'Listradas' : 'Não def.'}
                </div>
                {gameState.fouls[1] > 0 && (
                  <Badge variant="destructive" className="text-xs mt-1">
                    Faltas: {gameState.fouls[1]}
                  </Badge>
                )}
              </div>
              
              <div className="text-2xl opacity-50">VS</div>
              
              <div className="text-center">
                <div className="font-bold">Jogador 2</div>
                <div className="text-lg">{gameState.scores[2]}</div>
                <div className="text-xs opacity-70">
                  {gameState.playerGroups[2] === 'solid' ? 'Lisas' : 
                   gameState.playerGroups[2] === 'stripe' ? 'Listradas' : 'Não def.'}
                </div>
                {gameState.fouls[2] > 0 && (
                  <Badge variant="destructive" className="text-xs mt-1">
                    Faltas: {gameState.fouls[2]}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};