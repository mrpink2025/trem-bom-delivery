import { Ball, GameState, GameEvent, ShotData, GameConfig, GAME_CONSTANTS } from '../types/GameTypes';
import { BilliardsPhysics } from '../physics/BilliardsPhysics';
import { BilliardsRenderer } from '../render/BilliardsRenderer';
import { SoundManager } from '../audio/SoundManager';

export class BilliardsEngine {
  private physics: BilliardsPhysics;
  private renderer: BilliardsRenderer;
  private soundManager: SoundManager;
  private config: GameConfig;
  
  private balls: Ball[] = [];
  private gameState: GameState;
  private animationId: number | null = null;
  private lastTime = 0;
  private eventNonce = 0;
  
  public onGameEvent?: (event: GameEvent) => void;
  public onStateChange?: (state: Partial<GameState>) => void;

  constructor(physics: BilliardsPhysics, renderer: BilliardsRenderer, config: GameConfig) {
    this.physics = physics;
    this.renderer = renderer;
    this.config = config;
    this.soundManager = new SoundManager(config.soundEnabled);
    
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
  }

  async initialize(): Promise<void> {
    await this.soundManager.initialize();
    await this.setupTable();
    this.startRenderLoop();
    console.log('🎱 Billiards Engine initialized');
  }

  private async setupTable(): Promise<void> {
    // Initialize balls in standard 8-ball rack formation
    this.balls = this.createInitialBalls();
    this.physics.reset(this.balls);
    this.renderer.updateBalls(this.balls);
  }

  private createInitialBalls(): Ball[] {
    const balls: Ball[] = [];
    const { TABLE, BALL } = GAME_CONSTANTS;
    
    // Cue ball
    balls.push({
      id: 0,
      position: { x: -TABLE.WIDTH * 0.25, y: 0, z: BALL.RADIUS },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'cue',
      color: '#FFFFFF',
      isPocketed: false,
      mass: BALL.MASS,
      radius: BALL.RADIUS
    });

    // Object balls in rack formation
    const rackX = TABLE.WIDTH * 0.25;
    const rackY = 0;
    const spacing = BALL.RADIUS * 2.1;
    
    // Standard 8-ball rack
    const rackPattern = [
      [1],
      [2, 3],
      [4, 8, 5],
      [6, 7, 9, 10],
      [11, 12, 13, 14, 15]
    ];

    let ballId = 1;
    for (let row = 0; row < rackPattern.length; row++) {
      const rowBalls = rackPattern[row];
      const rowY = rackY - (rowBalls.length - 1) * spacing * 0.5;
      
      for (let col = 0; col < rowBalls.length; col++) {
        const number = rowBalls[col];
        const type = number === 8 ? '8ball' : number <= 7 ? 'solid' : 'stripe';
        
        balls.push({
          id: ballId++,
          number,
          position: { 
            x: rackX + row * spacing * 0.866, 
            y: rowY + col * spacing, 
            z: BALL.RADIUS 
          },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type,
          color: this.getBallColor(number),
          isPocketed: false,
          mass: BALL.MASS,
          radius: BALL.RADIUS
        });
      }
    }

    return balls;
  }

  private getBallColor(number: number): string {
    const colors: { [key: number]: string } = {
      1: '#FFD700', 2: '#0066CC', 3: '#FF0000', 4: '#800080',
      5: '#FF8800', 6: '#008000', 7: '#8B0000', 8: '#000000',
      9: '#FFD700', 10: '#0066CC', 11: '#FF0000', 12: '#800080',
      13: '#FF8800', 14: '#008000', 15: '#8B0000'
    };
    return colors[number] || '#FFFFFF';
  }

  public startNewGame(mode: '1P' | '2P'): void {
    this.gameState = {
      phase: 'BREAK',
      currentPlayer: 1,
      playerGroups: { 1: null, 2: null },
      scores: { 1: 0, 2: 0 },
      fouls: { 1: 0, 2: 0 },
      gameMode: mode,
      isPaused: false,
      isGameOver: false,
      winner: null
    };

    this.setupTable();
    this.emitEvent({
      type: 'gameStart',
      data: { mode },
      timestamp: Date.now()
    });

    if (this.onStateChange) {
      this.onStateChange(this.gameState);
    }
  }

  public executeShot(shotData: ShotData): void {
    if (this.gameState.isPaused || this.gameState.isGameOver) return;
    
    const cueBall = this.balls.find(b => b.type === 'cue' && !b.isPocketed);
    if (!cueBall) return;

    // Apply shot to physics
    this.physics.executeShot(cueBall, shotData);
    
    // Play shot sound
    this.soundManager.playSound('hit', shotData.power);
    
    this.emitEvent({
      type: 'shot',
      player: this.gameState.currentPlayer,
      data: shotData,
      timestamp: Date.now()
    });

    // Update game phase
    if (this.gameState.phase === 'BREAK') {
      this.gameState.phase = 'PLAYING';
      if (this.onStateChange) {
        this.onStateChange({ phase: 'PLAYING' });
      }
    }
  }

  public pause(): void {
    this.gameState.isPaused = true;
    if (this.onStateChange) {
      this.onStateChange({ isPaused: true });
    }
  }

  public resume(): void {
    this.gameState.isPaused = false;
    if (this.onStateChange) {
      this.onStateChange({ isPaused: false });
    }
  }

  public reset(): void {
    this.setupTable();
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
    
    if (this.onStateChange) {
      this.onStateChange(this.gameState);
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundManager.setEnabled(enabled);
  }

  private startRenderLoop(): void {
    const animate = (currentTime: number) => {
      if (this.gameState.isPaused) {
        this.animationId = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30); // Cap at 30 FPS
      this.lastTime = currentTime;

      // Update physics
      this.physics.update(deltaTime);
      
      // Get updated ball positions
      this.balls = this.physics.getBalls();
      
      // Check for pocketed balls
      this.checkPocketedBalls();
      
      // Update renderer
      this.renderer.updateBalls(this.balls);
      this.renderer.render();
      
      // Check if all balls have stopped moving
      if (this.areAllBallsStopped()) {
        this.checkEndTurn();
      }
      
      // Send heartbeat
      if (Math.floor(currentTime) % 5000 < 16) { // Every 5 seconds
        this.emitEvent({
          type: 'heartbeat',
          data: { 
            ballsMoving: !this.areAllBallsStopped(),
            currentPlayer: this.gameState.currentPlayer
          },
          timestamp: Date.now()
        });
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private checkPocketedBalls(): void {
    this.balls.forEach(ball => {
      if (!ball.isPocketed && this.physics.isBallPocketed(ball)) {
        ball.isPocketed = true;
        this.soundManager.playSound('pocket', 0.8);
        
        this.emitEvent({
          type: 'potted',
          player: this.gameState.currentPlayer,
          data: { ballId: ball.id, ballNumber: ball.number, ballType: ball.type },
          timestamp: Date.now()
        });

        // Update player groups and scores
        this.handleBallPocketed(ball);
      }
    });
  }

  private handleBallPocketed(ball: Ball): void {
    if (ball.type === 'cue') {
      // Cue ball pocketed - foul
      this.handleFoul('cue_ball_pocketed');
      return;
    }

    if (ball.type === '8ball') {
      // 8-ball pocketed - check if legal
      this.check8BallPocketed();
      return;
    }

    // Assign groups if not already assigned
    if (this.gameState.playerGroups[this.gameState.currentPlayer] === null) {
      this.gameState.playerGroups[this.gameState.currentPlayer] = ball.type as 'solid' | 'stripe';
      const otherPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
      this.gameState.playerGroups[otherPlayer] = ball.type === 'solid' ? 'stripe' : 'solid';
    }

    // Update score
    const playerGroup = this.gameState.playerGroups[this.gameState.currentPlayer];
    if (ball.type === playerGroup) {
      this.gameState.scores[this.gameState.currentPlayer]++;
    } else {
      // Wrong group - foul
      this.handleFoul('wrong_group');
    }
  }

  private check8BallPocketed(): void {
    const currentPlayerGroup = this.gameState.playerGroups[this.gameState.currentPlayer];
    const playerBallsRemaining = this.balls.filter(b => 
      !b.isPocketed && 
      b.type === currentPlayerGroup
    ).length;

    if (playerBallsRemaining === 0) {
      // Legal 8-ball win
      this.gameState.winner = this.gameState.currentPlayer;
      this.gameState.isGameOver = true;
      this.gameState.phase = 'GAME_OVER';
      
      this.emitEvent({
        type: 'frameEnd',
        data: { winner: this.gameState.winner, reason: '8ball_legal' },
        timestamp: Date.now()
      });
    } else {
      // Premature 8-ball - opponent wins
      this.gameState.winner = this.gameState.currentPlayer === 1 ? 2 : 1;
      this.gameState.isGameOver = true;
      this.gameState.phase = 'GAME_OVER';
      
      this.emitEvent({
        type: 'frameEnd',
        data: { winner: this.gameState.winner, reason: '8ball_premature' },
        timestamp: Date.now()
      });
    }

    if (this.onStateChange) {
      this.onStateChange(this.gameState);
    }
  }

  private handleFoul(reason: string): void {
    this.gameState.fouls[this.gameState.currentPlayer]++;
    
    this.emitEvent({
      type: 'foul',
      player: this.gameState.currentPlayer,
      data: { reason },
      timestamp: Date.now()
    });

    // Switch player immediately on foul
    this.switchPlayer();
  }

  private checkEndTurn(): void {
    // Switch player if no balls were pocketed (and no foul occurred)
    const playerGroup = this.gameState.playerGroups[this.gameState.currentPlayer];
    const ballsPocketedThisTurn = this.balls.filter(b => 
      b.isPocketed && b.type === playerGroup
    ).length - this.gameState.scores[this.gameState.currentPlayer];

    if (ballsPocketedThisTurn === 0) {
      this.switchPlayer();
    }
  }

  private switchPlayer(): void {
    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
    
    if (this.onStateChange) {
      this.onStateChange({ currentPlayer: this.gameState.currentPlayer });
    }
  }

  private areAllBallsStopped(): boolean {
    return this.balls.every(ball => {
      if (ball.isPocketed) return true;
      const v = ball.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      return speed < GAME_CONSTANTS.PHYSICS.MIN_VELOCITY;
    });
  }

  private emitEvent(event: GameEvent): void {
    event.data = { ...event.data, nonce: this.eventNonce++ };
    
    if (this.onGameEvent) {
      this.onGameEvent(event);
    }
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.physics.dispose();
    this.renderer.dispose();
    this.soundManager.dispose();
  }
}