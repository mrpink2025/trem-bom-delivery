import * as THREE from 'three';
import * as CANNON from 'cannon';
import { Ball3D } from './Ball3D';
import { WhiteBall3D } from './WhiteBall3D';
import { Table3D } from './Table3D';
import { GameState3D, GameConfig3D, LogoConfig, ShotData3D, GameEvent3D, GAME_CONSTANTS_3D } from './types/GameTypes';

export class Game3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: CANNON.World;
  private controls: any; // OrbitControls type
  private clock: THREE.Clock;
  
  private balls: Ball3D[] = [];
  private whiteBall: WhiteBall3D | null = null;
  private table: Table3D;
  
  private gameState: GameState3D;
  private config: GameConfig3D;
  private animationId: number | null = null;
  
  public onGameEvent?: (event: GameEvent3D) => void;
  public onStateChange?: (state: Partial<GameState3D>) => void;

  constructor(
    container: HTMLElement,
    config: GameConfig3D,
    logoConfig: LogoConfig
  ) {
    this.config = config;
    this.clock = new THREE.Clock();
    
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      GAME_CONSTANTS_3D.CAMERA.FOV,
      container.clientWidth / container.clientHeight,
      GAME_CONSTANTS_3D.CAMERA.NEAR,
      GAME_CONSTANTS_3D.CAMERA.FAR
    );
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: config.quality !== 'LOW',
      alpha: false 
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.quality === 'HIGH' ? 2 : 1));
    this.renderer.shadowMap.enabled = config.quality !== 'LOW';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x262626, 1);
    container.appendChild(this.renderer.domElement);
    
    // Initialize physics world
    this.world = this.createPhysicsWorld();
    
    // Create table
    this.table = new Table3D(this.scene, this.world);
    this.table.updateLogo(logoConfig);
    
    // Setup lighting
    this.setupLighting();
    
    // Setup camera controls
    this.setupControls();
    
    // Initialize game state
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
    
    // Setup collision detection
    this.setupCollisionDetection();
    
    // Setup balls
    this.setupBalls();
    
    // Start render loop
    this.startRenderLoop();
  }

  private createPhysicsWorld(): CANNON.World {
    const world = new CANNON.World();
    const { PHYSICS } = GAME_CONSTANTS_3D;
    
    world.gravity.set(0, PHYSICS.GRAVITY, 0);
    world.solver.iterations = 10;
    world.solver.tolerance = 0;
    world.allowSleep = true;
    world.fixedTimeStep = PHYSICS.FIXED_TIMESTEP;
    
    return world;
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
    
    // Directional light (main)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = this.config.quality !== 'LOW';
    directionalLight.shadow.mapSize.width = this.config.quality === 'HIGH' ? 2048 : 1024;
    directionalLight.shadow.mapSize.height = this.config.quality === 'HIGH' ? 2048 : 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    this.scene.add(directionalLight);
    
    // Table spotlights
    [-GAME_CONSTANTS_3D.TABLE.LEN_X / 4, GAME_CONSTANTS_3D.TABLE.LEN_X / 4].forEach(x => {
      const spotlight = new THREE.SpotLight(0xffffff, 0.6, 300, Math.PI / 6, 0.1, 2);
      spotlight.position.set(x, 150, 0);
      spotlight.target.position.set(x, GAME_CONSTANTS_3D.TABLE.HEIGHT, 0);
      spotlight.castShadow = this.config.quality === 'HIGH';
      this.scene.add(spotlight);
      this.scene.add(spotlight.target);
    });
  }

  private setupControls(): void {
    // We'll need to import OrbitControls
    // For now, setup basic camera position
    this.camera.position.set(-170, 70, 0);
    this.camera.lookAt(0, GAME_CONSTANTS_3D.TABLE.HEIGHT, 0);
  }

  private setupCollisionDetection(): void {
    const { PHYSICS } = GAME_CONSTANTS_3D;
    
    // Default contact material
    this.world.defaultContactMaterial.friction = 0.1;
    this.world.defaultContactMaterial.restitution = 0.85;
    
    // Ball-floor contact
    const ballFloorContact = new CANNON.ContactMaterial(
      Ball3D.getContactMaterial(),
      Table3D.floorContactMaterial,
      { friction: PHYSICS.FRICTION, restitution: PHYSICS.RESTITUTION }
    );
    this.world.addContactMaterial(ballFloorContact);
    
    // Ball-wall contact
    const ballWallContact = new CANNON.ContactMaterial(
      Ball3D.getContactMaterial(),
      Table3D.wallContactMaterial,
      { friction: 0.5, restitution: 0.9 }
    );
    this.world.addContactMaterial(ballWallContact);
  }

  private setupBalls(): void {
    const { TABLE, BALL } = GAME_CONSTANTS_3D;
    
    // Create white ball
    this.whiteBall = new WhiteBall3D(this.scene, this.world);
    this.balls.push(this.whiteBall);
    
    // Ball arrangement (standard 8-ball rack)
    const rackX = TABLE.LEN_X / 4;
    const rackZ = 0;
    const spacing = BALL.RADIUS * 2.1;
    
    const ballArrangement = [
      { name: '1ball', type: 'solid', number: 1 },
      { name: '2ball', type: 'solid', number: 2 },
      { name: '3ball', type: 'solid', number: 3 },
      { name: '4ball', type: 'solid', number: 4 },
      { name: '5ball', type: 'solid', number: 5 },
      { name: '6ball', type: 'solid', number: 6 },
      { name: '7ball', type: 'solid', number: 7 },
      { name: '8ball', type: '8ball', number: 8 },
      { name: '9ball', type: 'stripe', number: 9 },
      { name: '10ball', type: 'stripe', number: 10 },
      { name: '11ball', type: 'stripe', number: 11 },
      { name: '12ball', type: 'stripe', number: 12 },
      { name: '13ball', type: 'stripe', number: 13 },
      { name: '14ball', type: 'stripe', number: 14 },
      { name: '15ball', type: 'stripe', number: 15 }
    ];
    
    // Standard rack formation
    const rackPattern = [
      [0],              // 1 ball
      [1, 2],           // 2 balls  
      [3, 7, 4],        // 3 balls (8-ball in middle)
      [5, 6, 8, 9],     // 4 balls
      [10, 11, 12, 13, 14] // 5 balls
    ];
    
    let ballIndex = 0;
    rackPattern.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        if (ballIndex < ballArrangement.length) {
          const ballInfo = ballArrangement[ballIndex];
          const x = rackX + rowIndex * spacing * 0.866;
          const y = TABLE.HEIGHT + BALL.RADIUS;
          const z = rackZ - (row.length - 1) * spacing * 0.5 + colIndex * spacing;
          
          const ball = new Ball3D(
            x, y, z,
            ballInfo.name,
            this.scene,
            this.world,
            ballInfo.type as any,
            ballInfo.number
          );
          
          this.balls.push(ball);
          ballIndex++;
        }
      });
    });
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (!this.gameState.isPaused) {
        const deltaTime = this.clock.getDelta();
        
        // Update physics
        this.world.step(GAME_CONSTANTS_3D.PHYSICS.FIXED_TIMESTEP, deltaTime, 3);
        
        // Update ball positions
        this.balls.forEach(ball => ball.update());
        
        // Check for pocketed balls
        this.checkPocketedBalls();
        
        // Check if turn should end
        if (this.areAllBallsStopped() && this.gameState.phase === 'PLAYING') {
          this.checkEndTurn();
        }
      }
      
      // Update controls if available
      // if (this.controls) this.controls.update();
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  private checkPocketedBalls(): void {
    const { TABLE } = GAME_CONSTANTS_3D;
    const pocketRadius = TABLE.POCKET_RADIUS;
    
    // Pocket positions
    const pockets = [
      { x: -TABLE.LEN_X / 2, z: -TABLE.LEN_Z / 2 }, // Corner pockets
      { x: TABLE.LEN_X / 2, z: -TABLE.LEN_Z / 2 },
      { x: -TABLE.LEN_X / 2, z: TABLE.LEN_Z / 2 },
      { x: TABLE.LEN_X / 2, z: TABLE.LEN_Z / 2 },
      { x: 0, z: -TABLE.LEN_Z / 2 }, // Side pockets
      { x: 0, z: TABLE.LEN_Z / 2 }
    ];
    
    this.balls.forEach(ball => {
      if (ball.fallen) return;
      
      const ballPos = ball.mesh.position;
      
      // Check if ball is in any pocket
      pockets.forEach(pocket => {
        const distance = Math.sqrt(
          Math.pow(ballPos.x - pocket.x, 2) + 
          Math.pow(ballPos.z - pocket.z, 2)
        );
        
        if (distance < pocketRadius) {
          ball.onEnterHole();
          this.handleBallPocketed(ball);
        }
      });
    });
  }

  private handleBallPocketed(ball: Ball3D): void {
    this.emitEvent({
      type: 'potted',
      player: this.gameState.currentPlayer,
      data: { ballId: ball.id, ballName: ball.name, ballType: ball.type },
      timestamp: Date.now()
    });
    
    if (ball.type === 'cue') {
      this.handleFoul('cue_ball_pocketed');
    } else if (ball.type === '8ball') {
      this.check8BallPocketed();
    } else {
      this.updatePlayerScore(ball);
    }
  }

  private updatePlayerScore(ball: Ball3D): void {
    const currentPlayer = this.gameState.currentPlayer;
    const playerGroup = this.gameState.playerGroups[currentPlayer];
    
    // Assign groups if not set
    if (playerGroup === null && ball.type !== '8ball') {
      this.gameState.playerGroups[currentPlayer] = ball.type as 'solid' | 'stripe';
      const otherPlayer = currentPlayer === 1 ? 2 : 1;
      this.gameState.playerGroups[otherPlayer] = ball.type === 'solid' ? 'stripe' : 'solid';
    }
    
    // Update score if correct group
    if (ball.type === playerGroup) {
      this.gameState.scores[currentPlayer]++;
    } else if (playerGroup !== null) {
      this.handleFoul('wrong_group');
    }
  }

  private check8BallPocketed(): void {
    const currentPlayer = this.gameState.currentPlayer;
    const playerGroup = this.gameState.playerGroups[currentPlayer];
    
    // Count remaining balls of player's group
    const remainingBalls = this.balls.filter(ball => 
      !ball.fallen && ball.type === playerGroup
    ).length;
    
    if (remainingBalls === 0) {
      // Legal 8-ball win
      this.gameState.winner = currentPlayer;
      this.endGame('8ball_legal');
    } else {
      // Premature 8-ball - opponent wins
      this.gameState.winner = currentPlayer === 1 ? 2 : 1;
      this.endGame('8ball_premature');
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
    
    this.switchPlayer();
  }

  private checkEndTurn(): void {
    // Switch player if no valid balls were pocketed
    // (This is simplified - real 8-ball rules are more complex)
    this.switchPlayer();
  }

  private switchPlayer(): void {
    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
    
    if (this.onStateChange) {
      this.onStateChange({ currentPlayer: this.gameState.currentPlayer });
    }
  }

  private areAllBallsStopped(): boolean {
    return this.balls.every(ball => ball.fallen || !ball.isMoving());
  }

  private endGame(reason: string): void {
    this.gameState.isGameOver = true;
    this.gameState.phase = 'GAME_OVER';
    
    this.emitEvent({
      type: 'frameEnd',
      data: { winner: this.gameState.winner, reason },
      timestamp: Date.now()
    });
    
    if (this.onStateChange) {
      this.onStateChange(this.gameState);
    }
  }

  private emitEvent(event: GameEvent3D): void {
    if (this.onGameEvent) {
      this.onGameEvent(event);
    }
  }

  // Public methods
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
    
    // Reset balls
    this.resetBalls();
    
    this.emitEvent({
      type: 'gameStart',
      data: { mode },
      timestamp: Date.now()
    });
    
    if (this.onStateChange) {
      this.onStateChange(this.gameState);
    }
  }

  private resetBalls(): void {
    // Implementation depends on how balls are initially positioned
    // For now, just make sure they're all visible and stopped
    this.balls.forEach(ball => {
      ball.rigidBody.velocity.set(0, 0, 0);
      ball.rigidBody.angularVelocity.set(0, 0, 0);
      ball.mesh.visible = true;
      ball.fallen = false;
    });
  }

  public executeShot(shotData: ShotData3D): void {
    if (this.whiteBall && this.gameState.phase !== 'GAME_OVER' && !this.gameState.isPaused) {
      this.whiteBall.executeShot(shotData);
      
      this.emitEvent({
        type: 'shot',
        player: this.gameState.currentPlayer,
        data: shotData,
        timestamp: Date.now()
      });
      
      if (this.gameState.phase === 'BREAK') {
        this.gameState.phase = 'PLAYING';
        if (this.onStateChange) {
          this.onStateChange({ phase: 'PLAYING' });
        }
      }
    }
  }

  public setAimDirection(angle: number): void {
    if (this.whiteBall) {
      this.whiteBall.setAimDirection(angle);
    }
  }

  public showAiming(show: boolean): void {
    if (this.whiteBall) {
      this.whiteBall.showAiming(show);
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

  public updateLogo(logoConfig: LogoConfig): void {
    this.table.updateLogo(logoConfig);
  }

  public getGameState(): GameState3D {
    return { ...this.gameState };
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Dispose of all balls
    this.balls.forEach(ball => ball.dispose());
    
    // Dispose of table
    this.table.dispose();
    
    // Dispose of renderer
    this.renderer.dispose();
    
    // Clear physics world
    this.world.bodies.forEach(body => this.world.removeBody(body));
  }
}