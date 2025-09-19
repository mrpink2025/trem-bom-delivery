import * as THREE from 'three';
import * as CANNON from 'cannon';
import { GameState3D, GameConfig3D, LogoConfig, GameEvent3D, ShotData3D } from './types/GameTypes';

// Global variables (as in original WebGL-Billiards)
let scene: THREE.Scene;
let world: CANNON.World;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: any;
let textureLoader: THREE.TextureLoader;

export class WebGLBilliardsEngine {
  private container: HTMLElement;
  private config: GameConfig3D;
  private logoConfig: LogoConfig;
  private gameState: GameState3D;
  private eventListeners: ((event: GameEvent3D) => void)[] = [];
  private animationId: number | null = null;
  
  // Game objects
  private table: BilliardsTable | null = null;
  private balls: BilliardsGame | null = null;
  private logoSprite: THREE.Sprite | null = null;
  private logoTexture: THREE.Texture | null = null;
  private aimAngle: number = 0;

  constructor(container: HTMLElement, config: GameConfig3D, logoConfig: LogoConfig) {
    this.container = container;
    this.config = config;
    this.logoConfig = logoConfig;
    
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

    this.initialize();
  }

  private async initialize() {
    this.createScene();
    this.createPhysicsWorld();
    this.setupCamera();
    this.setupRenderer();
    this.setupLighting();
    this.setupControls();
    
    // Create game objects
    this.table = new BilliardsTable();
    this.balls = new BilliardsGame();
    
    // Apply branding/logo on felt
    this.updateLogo(this.logoConfig);
    
    this.startRenderLoop();
    
    // Emit ready event
    this.emitEvent({
      type: 'gameStart',
      data: { ready: true },
      timestamp: Date.now()
    });
  }

  private createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    textureLoader = new THREE.TextureLoader();
  }

  private createPhysicsWorld() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82 * 30, 0); // Scaled gravity
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    
    // Floor contact material
    const floorMaterial = new CANNON.Material("floorMaterial");
    const ballMaterial = new CANNON.Material("ballMaterial");
    
    const ballFloorContactMaterial = new CANNON.ContactMaterial(ballMaterial, floorMaterial, {
      friction: 0.7,
      restitution: 0.1,
    });
    world.addContactMaterial(ballFloorContactMaterial);
    
    // Add floor at y = 0 (table plane)
    const floorShape = new CANNON.Box(new CANNON.Vec3(1000, 0.5, 1000));
    const floorBody = new CANNON.Body({ mass: 0, material: floorMaterial });
    floorBody.addShape(floorShape);
    floorBody.position.set(0, 0, 0);
    world.addBody(floorBody);
  }

  private setupCamera() {
    camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 1, 1000);
    // Better camera angle - closer and more inclined for better table view
    camera.position.set(0, 180, 220);
    camera.lookAt(0, 40, 0);
  }

  private setupRenderer() {
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Lighter background for better contrast
    renderer.setClearColor(0x2a2a2a, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
  }

  private setupLighting() {
    // Brighter ambient light for pool hall atmosphere
    const ambientLight = new THREE.AmbientLight(0x606060, 0.7);
    scene.add(ambientLight);

    // Main overhead light (simulating pool hall lighting)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(0, 300, 0);
    mainLight.castShadow = true;
    
    // Shadow camera settings for overhead light
    mainLight.shadow.camera.left = -150;
    mainLight.shadow.camera.right = 150;
    mainLight.shadow.camera.top = 150;
    mainLight.shadow.camera.bottom = -150;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 400;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    
    scene.add(mainLight);

    // Additional side lights for better illumination
    const sideLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    sideLight1.position.set(200, 150, 200);
    scene.add(sideLight1);

    const sideLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    sideLight2.position.set(-200, 150, -200);
    scene.add(sideLight2);

    // Spotlight focused on table for dramatic effect
    const spotlight = new THREE.SpotLight(0xffffff, 0.8, 400, Math.PI / 6, 0.3, 1);
    spotlight.position.set(0, 250, 0);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    
    scene.add(spotlight);
  }

  private setupControls() {
    // Simple orbit controls implementation
    controls = {
      getAzimuthalAngle: () => {
        const vector = new THREE.Vector3();
        camera.getWorldDirection(vector);
        return Math.atan2(vector.x, vector.z);
      }
    };
    
    // Basic mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y
        };

        // Rotate camera around the table
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaMove.x * 0.01;
        spherical.phi += deltaMove.y * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });

    renderer.domElement.addEventListener('wheel', (e) => {
      const distance = camera.position.length();
      const newDistance = Math.max(50, Math.min(300, distance + e.deltaY * 0.1));
      camera.position.normalize().multiplyScalar(newDistance);
    });
  }

  private startRenderLoop() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      if (this.balls) {
        this.balls.tick(0.016); // ~60fps
      }
      
      world.step(1/60);
      
      renderer.render(scene, camera);
    };
    animate();
  }

  // Public API methods
  public startNewGame(mode: '1P' | '2P') {
    if (this.balls) {
      this.balls.reset();
    }
    this.gameState.gameMode = mode;
    this.gameState.phase = 'BREAK';
    this.gameState.currentPlayer = 1;
    this.gameState.playerGroups = { 1: null, 2: null };
    this.gameState.scores = { 1: 0, 2: 0 };
    this.gameState.fouls = { 1: 0, 2: 0 };
    this.gameState.isGameOver = false;
    this.gameState.winner = null;
  }

  public executeShot(shotData: ShotData3D) {
    if (this.balls) {
      const strength = shotData.power * 100; // Scale power
      this.balls.ballHit(strength);
      
      this.emitEvent({
        type: 'shot',
        player: this.gameState.currentPlayer,
        data: { power: shotData.power },
        timestamp: Date.now()
      });
    }
  }

  public pause() {
    this.gameState.isPaused = true;
  }

  public resume() {
    this.gameState.isPaused = false;
  }

  public getGameState(): GameState3D {
    return { ...this.gameState };
  }

  public setAimAngle(angle: number) {
    this.aimAngle = angle;
    if (this.balls) {
      this.balls.setAimAngle(angle);
    }
  }

  public updateLogo(logo: LogoConfig) {
    this.logoConfig = logo;
    // create sprite if needed
    if (!this.logoSprite) {
      const mat = new THREE.SpriteMaterial({ opacity: logo.opacity ?? 0.85, transparent: true });
      this.logoSprite = new THREE.Sprite(mat);
      scene.add(this.logoSprite);
    }
    if (logo.url) {
      const loader = textureLoader ?? new THREE.TextureLoader();
      loader.load(logo.url, (tex) => {
        this.logoTexture = tex;
        if (this.logoSprite && this.logoSprite.material instanceof THREE.SpriteMaterial) {
          this.logoSprite.material.map = tex;
          this.logoSprite.material.needsUpdate = true;
        }
      });
    }
    // scale relative to table
    const scale = (logo.scale ?? 0.6) * 60;
    this.logoSprite!.scale.set(scale, scale, 1);
    this.logoSprite!.position.set(0, 0.1, 0);
    this.logoSprite!.rotation.z = (logo.rotation ?? 0) * (Math.PI / 180);
    if (this.logoSprite && this.logoSprite.material instanceof THREE.SpriteMaterial) {
      this.logoSprite.material.opacity = logo.opacity ?? 0.85;
    }
  }

  public addEventListener(listener: (event: GameEvent3D) => void) {
    this.eventListeners.push(listener);
  }

  public removeEventListener(listener: (event: GameEvent3D) => void) {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(event: GameEvent3D) {
    this.eventListeners.forEach(listener => listener(event));
  }

  public onResize(width: number, height: number) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  public dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (renderer) {
      this.container.removeChild(renderer.domElement);
      renderer.dispose();
    }
    
    // Clean up Three.js resources
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
}

// Table constants
const TABLE_CONSTANTS = {
  LEN_X: 254,
  LEN_Z: 127,
  COLORS: {
    cloth: 0x2bbf3e,
    wood: 0x6b3e1e
  }
};

// Billiards Table class (simplified version)
class BilliardsTable {
  constructor() {
    this.createTable();
    this.createWalls();
  }

  private createTable() {
    // Create felt surface
    const feltGeometry = new THREE.PlaneGeometry(TABLE_CONSTANTS.LEN_X, TABLE_CONSTANTS.LEN_Z);
    const feltMaterial = new THREE.MeshPhongMaterial({ 
      color: TABLE_CONSTANTS.COLORS.cloth,
      shininess: 20
    });
    const felt = new THREE.Mesh(feltGeometry, feltMaterial);
    felt.rotation.x = -Math.PI / 2;
    felt.receiveShadow = true;
    scene.add(felt);

    // Create table base
    const baseGeometry = new THREE.BoxGeometry(TABLE_CONSTANTS.LEN_X + 20, 18, TABLE_CONSTANTS.LEN_Z + 20);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: TABLE_CONSTANTS.COLORS.wood });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -9;
    base.receiveShadow = true;
    base.castShadow = true;
    scene.add(base);

    // Visual rails (wood)
    const railHeight = 6;
    const railThickness = 6;
    const railMaterial = new THREE.MeshPhongMaterial({ color: TABLE_CONSTANTS.COLORS.wood });

    const longRailGeom = new THREE.BoxGeometry(TABLE_CONSTANTS.LEN_X + railThickness * 2, railHeight, railThickness);
    const shortRailGeom = new THREE.BoxGeometry(railThickness, railHeight, TABLE_CONSTANTS.LEN_Z + railThickness * 2);

    const rail1 = new THREE.Mesh(longRailGeom, railMaterial);
    rail1.position.set(0, railHeight / 2, TABLE_CONSTANTS.LEN_Z / 2 + railThickness / 2);
    const rail2 = rail1.clone();
    rail2.position.z = -TABLE_CONSTANTS.LEN_Z / 2 - railThickness / 2;

    const rail3 = new THREE.Mesh(shortRailGeom, railMaterial);
    rail3.position.set(TABLE_CONSTANTS.LEN_X / 2 + railThickness / 2, railHeight / 2, 0);
    const rail4 = rail3.clone();
    rail4.position.x = -TABLE_CONSTANTS.LEN_X / 2 - railThickness / 2;

    for (const r of [rail1, rail2, rail3, rail4]) {
      r.castShadow = true;
      r.receiveShadow = true;
      scene.add(r);
    }

    // Visual pockets (6)
    const pocketRadius = 6;
    const pocketDepth = 2;
    const pocketMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const pocketGeom = new THREE.CylinderGeometry(pocketRadius, pocketRadius, pocketDepth, 24);

    const pocketPositions: [number, number][] = [
      [-TABLE_CONSTANTS.LEN_X/2, -TABLE_CONSTANTS.LEN_Z/2],
      [0, -TABLE_CONSTANTS.LEN_Z/2],
      [TABLE_CONSTANTS.LEN_X/2, -TABLE_CONSTANTS.LEN_Z/2],
      [-TABLE_CONSTANTS.LEN_X/2, TABLE_CONSTANTS.LEN_Z/2],
      [0, TABLE_CONSTANTS.LEN_Z/2],
      [TABLE_CONSTANTS.LEN_X/2, TABLE_CONSTANTS.LEN_Z/2]
    ];

    for (const [px, pz] of pocketPositions) {
      const pocket = new THREE.Mesh(pocketGeom, pocketMaterial);
      pocket.rotation.x = -Math.PI / 2;
      pocket.position.set(px, 0.1, pz);
      pocket.castShadow = false;
      pocket.receiveShadow = false;
      scene.add(pocket);
    }
  }

  private createWalls() {
    const wallHeight = 10;
    const wallThickness = 5;
    
    // Create physics walls
    const wallMaterial = new CANNON.Material("wallMaterial");
    
    // Long walls
    for (let i = -1; i <= 1; i += 2) {
      const wallShape = new CANNON.Box(new CANNON.Vec3(TABLE_CONSTANTS.LEN_X / 2, wallHeight, wallThickness));
      const wallBody = new CANNON.Body({ mass: 0 });
      wallBody.addShape(wallShape);
      wallBody.position.set(0, wallHeight, i * (TABLE_CONSTANTS.LEN_Z / 2 + wallThickness));
      world.addBody(wallBody);
    }
    
    // Short walls
    for (let i = -1; i <= 1; i += 2) {
      const wallShape = new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight, TABLE_CONSTANTS.LEN_Z / 2));
      const wallBody = new CANNON.Body({ mass: 0 });
      wallBody.addShape(wallShape);
      wallBody.position.set(i * (TABLE_CONSTANTS.LEN_X / 2 + wallThickness), wallHeight, 0);
      world.addBody(wallBody);
    }
  }
}

// Ball class (adapted from WebGL-Billiards)
class BilliardsGameBall {
  public mesh: THREE.Mesh;
  public rigidBody: CANNON.Body;
  public sphere: THREE.Sphere;
  public name: string;
  public fallen: boolean = false;
  public color: number;

  static RADIUS = 5.715 / 2; // cm
  static MASS = 0.170; // kg
  static contactMaterial = new CANNON.Material("ballMaterial");

  constructor(x: number, y: number, z: number, name: string, color: number = 0xcc0000) {
    this.color = color;
    this.name = name;
    
    this.mesh = this.createMesh(x, y, z);
    this.sphere = new THREE.Sphere(this.mesh.position, BilliardsGameBall.RADIUS);
    scene.add(this.mesh);

    this.rigidBody = this.createBody(x, y, z);
    world.addBody(this.rigidBody);
  }

  private createMesh(x: number, y: number, z: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(BilliardsGameBall.RADIUS, 24, 24);
    const material = new THREE.MeshPhongMaterial({
      color: this.color,
      specular: 0xffffff,
      shininess: 140,
      reflectivity: 0.1
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    return sphere;
  }

  private createBody(x: number, y: number, z: number): CANNON.Body {
    const sphereBody = new CANNON.Body({
      mass: BilliardsGameBall.MASS,
      position: new CANNON.Vec3(x, y, z),
      shape: new CANNON.Sphere(BilliardsGameBall.RADIUS),
      material: BilliardsGameBall.contactMaterial
    });

    sphereBody.linearDamping = sphereBody.angularDamping = 0.5;
    sphereBody.allowSleep = true;
    sphereBody.sleepSpeedLimit = 0.5;
    sphereBody.sleepTimeLimit = 0.1;

    return sphereBody;
  }

  public tick(dt: number) {
    this.mesh.position.copy(this.rigidBody.position as any);
    this.mesh.quaternion.copy(this.rigidBody.quaternion as any);

    // Check if ball fell into hole
    if (this.rigidBody.position.y < -4 * BilliardsGameBall.RADIUS && !this.fallen) {
      this.fallen = true;
      this.onEnterHole();
    }
  }

  protected onEnterHole() {
    this.rigidBody.velocity = new CANNON.Vec3(0, 0, 0);
    this.rigidBody.angularVelocity = new CANNON.Vec3(0, 0, 0);
    world.removeBody(this.rigidBody);
  }
}

// White Ball class (adapted from WebGL-Billiards)
class WhiteBall extends BilliardsGameBall {
  public forward: THREE.Vector3;
  private defaultPosition: CANNON.Vec3;
  private aimAngle: number = 0;
  private aimLine: THREE.Line | null = null;

  constructor() {
    const defaultPos = new CANNON.Vec3(-TABLE_CONSTANTS.LEN_X / 4, BilliardsGameBall.RADIUS, 0);
    super(defaultPos.x, defaultPos.y, defaultPos.z, 'whiteball', 0xffffff);
    
    this.defaultPosition = defaultPos;
    this.forward = new THREE.Vector3(1, 0, 0);

    // Create dashed aim line
    const points = [new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(25, 0.05, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1, gapSize: 0.5 });
    this.aimLine = new THREE.Line(geometry, material);
    this.aimLine.computeLineDistances();
    this.aimLine.visible = false;
    scene.add(this.aimLine);
  }

  public setAimAngle(angle: number) {
    this.aimAngle = angle;
    this.forward.set(Math.cos(angle), 0, Math.sin(angle));
  }

  public hitForward(strength: number) {
    this.rigidBody.wakeUp();
    const ballPoint = new CANNON.Vec3();
    ballPoint.copy(this.rigidBody.position);

    const vec = new CANNON.Vec3();
    vec.copy(this.forward as any);
    vec.normalize();
    const scaledVec = new CANNON.Vec3();
    vec.scale(BilliardsGameBall.RADIUS, scaledVec);
    ballPoint.vsub(scaledVec, ballPoint);

    const force = new CANNON.Vec3();
    force.copy(this.forward.normalize() as any);
    const scaledForce = new CANNON.Vec3();
    force.scale(strength, scaledForce);
    this.rigidBody.applyImpulse(scaledForce, ballPoint);
  }

  protected onEnterHole() {
    this.rigidBody.velocity = new CANNON.Vec3(0, 0, 0);
    this.rigidBody.angularVelocity = new CANNON.Vec3(0, 0, 0);
    this.rigidBody.position.copy(this.defaultPosition);
  }

  public tick(dt: number) {
    super.tick(dt);
    
    // When sleeping, show aim line and align with aimAngle
    const sleeping = this.rigidBody.sleepState === CANNON.Body.SLEEPING;
    if (this.aimLine) {
      this.aimLine.visible = sleeping;
      this.aimLine.position.set(this.rigidBody.position.x, 0, this.rigidBody.position.z);
      const dir = new THREE.Vector3(Math.cos(this.aimAngle), 0, Math.sin(this.aimAngle));
      const end = new THREE.Vector3().copy(dir).multiplyScalar(25);
      const positions = (this.aimLine.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, 0, 0.05, 0);
      positions.setXYZ(1, end.x, 0.05, end.z);
      positions.needsUpdate = true;
      this.forward.copy(dir);
    }
  }
}

// Game class (adapted from WebGL-Billiards)
class BilliardsGame {
  public balls: BilliardsGameBall[] = [];
  private cueBall!: WhiteBall;

  constructor() {
    this.setupBalls();
  }

  private setupBalls() {
    const X_offset = TABLE_CONSTANTS.LEN_X / 4;
    const X_offset_2 = 1.72;

    // Ball colors
    const ballColors: { [key: string]: number } = {
      '1ball': 0xffff00,   '2ball': 0x0000ff,   '3ball': 0xff0000,
      '4ball': 0x800080,   '5ball': 0xff8000,   '6ball': 0x008000,
      '7ball': 0x800000,   '8ball': 0x000000,   '9ball': 0xffff00,
      '10ball': 0x0000ff,  '11ball': 0xff0000,  '12ball': 0x800080,
      '13ball': 0xff8000,  '14ball': 0x008000,  '15ball': 0x800000
    };

    this.cueBall = new WhiteBall();
    this.balls = [
      this.cueBall,
      
      // Rack formation (copied from original)
      new BilliardsGameBall(X_offset, BilliardsGameBall.RADIUS, 4 * BilliardsGameBall.RADIUS, '4ball', ballColors['4ball']),
      new BilliardsGameBall(X_offset, BilliardsGameBall.RADIUS, 2 * BilliardsGameBall.RADIUS, '3ball', ballColors['3ball']),
      new BilliardsGameBall(X_offset, BilliardsGameBall.RADIUS, 0, '14ball', ballColors['14ball']),
      new BilliardsGameBall(X_offset, BilliardsGameBall.RADIUS, -2 * BilliardsGameBall.RADIUS, '2ball', ballColors['2ball']),
      new BilliardsGameBall(X_offset, BilliardsGameBall.RADIUS, -4 * BilliardsGameBall.RADIUS, '15ball', ballColors['15ball']),
      
      // 2nd row
      new BilliardsGameBall(X_offset - X_offset_2 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, 3 * BilliardsGameBall.RADIUS, '13ball', ballColors['13ball']),
      new BilliardsGameBall(X_offset - X_offset_2 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, '7ball', ballColors['7ball']),
      new BilliardsGameBall(X_offset - X_offset_2 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, -1 * BilliardsGameBall.RADIUS, '12ball', ballColors['12ball']),
      new BilliardsGameBall(X_offset - X_offset_2 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, -3 * BilliardsGameBall.RADIUS, '5ball', ballColors['5ball']),
      
      // 3rd row
      new BilliardsGameBall(X_offset - X_offset_2 * 2 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, 2 * BilliardsGameBall.RADIUS, '6ball', ballColors['6ball']),
      new BilliardsGameBall(X_offset - X_offset_2 * 2 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, 0, '8ball', ballColors['8ball']),
      new BilliardsGameBall(X_offset - X_offset_2 * 2 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, -2 * BilliardsGameBall.RADIUS, '9ball', ballColors['9ball']),
      
      // 4th row
      new BilliardsGameBall(X_offset - X_offset_2 * 3 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, '10ball', ballColors['10ball']),
      new BilliardsGameBall(X_offset - X_offset_2 * 3 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, -1 * BilliardsGameBall.RADIUS, '11ball', ballColors['11ball']),
      
      // 5th row
      new BilliardsGameBall(X_offset - X_offset_2 * 4 * BilliardsGameBall.RADIUS, BilliardsGameBall.RADIUS, 0, '1ball', ballColors['1ball'])
    ];
  }

  public tick(dt: number) {
    for (const ball of this.balls) {
      ball.tick(dt);
    }
  }

  public ballHit(strength: number) {
    if (this.cueBall.rigidBody.sleepState === CANNON.Body.SLEEPING) {
      this.cueBall.hitForward(strength);
    }
  }

  public reset() {
    // Remove existing balls
    this.balls.forEach(ball => {
      scene.remove(ball.mesh);
      world.removeBody(ball.rigidBody);
    });
    
    // Create new balls
    this.setupBalls();
  }

  public setAimAngle(angle: number) {
    this.cueBall.setAimAngle(angle);
  }
}