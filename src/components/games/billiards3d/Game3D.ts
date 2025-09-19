import * as THREE from 'three';
import * as CANNON from 'cannon';
import { GameState3D, GameConfig3D, LogoConfig, GameEvent3D, ShotData3D } from './types/GameTypes';
import { WebGLBilliardsEngine } from './WebGLBilliardsEngine';

export class Game3D {
  private engine: WebGLBilliardsEngine;
  private gameState: GameState3D;
  private eventListeners: ((event: GameEvent3D) => void)[] = [];

  // Propriedades públicas esperadas pelo componente React
  public onGameEvent?: (event: GameEvent3D) => void;
  public onStateChange?: (state: Partial<GameState3D>) => void;

  constructor(container: HTMLElement, config: GameConfig3D, logoConfig: LogoConfig) {
    this.gameState = {
      phase: 'MENU',
      currentPlayer: 1,
      playerGroups: { 1: null, 2: null },
      scores: { 1: 0, 2: 0 },
      fouls: { 1: 0, 2: 0 },
      gameMode: '1P',
      isPaused: false,
      isGameOver: false,
      winner: null
    };

    // Criar o engine WebGL-Billiards
    this.engine = new WebGLBilliardsEngine(container, config, logoConfig);
    
    // Encaminhar eventos do engine
    this.engine.addEventListener((event) => {
      this.eventListeners.forEach(listener => listener(event));
      
      // Chamar callback se definido
      if (this.onGameEvent) {
        this.onGameEvent(event);
      }
    });
    
    // Emitir evento ready após pequeno delay
    setTimeout(() => {
      this.emitEvent({
        type: 'gameStart',
        data: { ready: true },
        timestamp: Date.now()
      });
    }, 100);
  }

  // Métodos da API pública
  public startNewGame(mode: '1P' | '2P'): void {
    this.engine.startNewGame(mode);
    this.gameState.gameMode = mode;
    this.gameState.phase = 'BREAK';
    this.gameState.currentPlayer = 1;
    this.gameState.isGameOver = false;
    this.gameState.winner = null;
    
    // Notificar mudança de estado
    if (this.onStateChange) {
      this.onStateChange({ 
        gameMode: mode, 
        phase: 'BREAK',
        isGameOver: false 
      });
    }
  }

  public executeShot(shotData: ShotData3D): void {
    this.engine.executeShot(shotData);
  }

  public pause(): void {
    this.engine.pause();
    this.gameState.isPaused = true;
    
    if (this.onStateChange) {
      this.onStateChange({ isPaused: true });
    }
  }

  public resume(): void {
    this.engine.resume();
    this.gameState.isPaused = false;
    
    if (this.onStateChange) {
      this.onStateChange({ isPaused: false });
    }
  }

  public getGameState(): GameState3D {
    return { ...this.gameState };
  }

  public setAimDirection(angle: number): void {
    this.engine.setAimAngle(angle);
  }
 
  public showAiming(show: boolean): void {
    // Engine shows aiming automatically when cue ball is sleeping
  }
 
  public updateLogo(logoConfig: LogoConfig): void {
    this.engine.updateLogo(logoConfig);
  }

  public addEventListener(listener: (event: GameEvent3D) => void): void {
    this.eventListeners.push(listener);
  }

  public removeEventListener(listener: (event: GameEvent3D) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  public onResize(width: number, height: number): void {
    this.engine.onResize(width, height);
  }

  public dispose(): void {
    this.engine.dispose();
    this.eventListeners.length = 0;
  }

  private emitEvent(event: GameEvent3D): void {
    this.eventListeners.forEach(listener => listener(event));
    
    if (this.onGameEvent) {
      this.onGameEvent(event);
    }
  }
}