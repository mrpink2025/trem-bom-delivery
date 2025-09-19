import * as THREE from 'three';
import { Ball, GameConfig, LogoConfig, RenderConfig, GAME_CONSTANTS, TREM_BAO_THEME } from '../types/GameTypes';

export class BilliardsRenderer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private config: GameConfig;
  
  private ballMeshes: Map<number, THREE.Mesh> = new Map();
  private tableMesh: THREE.Group | null = null;
  private logoMesh: THREE.Mesh | null = null;
  private lights: THREE.Light[] = [];
  
  private textureLoader: THREE.TextureLoader;
  private logoTexture: THREE.Texture | null = null;
  
  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = config;
    this.textureLoader = new THREE.TextureLoader();
    
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50, 
      canvas.clientWidth / canvas.clientHeight, 
      0.1, 
      100
    );
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.quality !== 'LOW',
      alpha: false
    });
    
    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
  }

  async initialize(): Promise<void> {
    await this.setupTable();
    await this.setupBalls();
    await this.setupLogo();
    this.handleResize();
    
    // Add resize listener
    window.addEventListener('resize', this.handleResize.bind(this));
    
    console.log('🎱 Billiards Renderer initialized');
  }

  private setupRenderer(): void {
    const pixelRatio = Math.min(window.devicePixelRatio, this.config.quality === 'HIGH' ? 2 : 1);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    
    this.renderer.shadowMap.enabled = this.config.quality !== 'LOW';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.scene.background = new THREE.Color(TREM_BAO_THEME.background);
  }

  private setupCamera(): void {
    // Position camera for optimal pool table view
    this.camera.position.set(0, -4, 3);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Main spotlight (pool table light)
    const mainLight = new THREE.SpotLight(0xffffff, 1.5, 20, Math.PI / 6);
    mainLight.position.set(0, 0, 4);
    mainLight.target.position.set(0, 0, 0);
    mainLight.castShadow = this.config.quality !== 'LOW';
    mainLight.shadow.mapSize.width = this.config.quality === 'HIGH' ? 2048 : 1024;
    mainLight.shadow.mapSize.height = this.config.quality === 'HIGH' ? 2048 : 1024;
    
    this.scene.add(mainLight);
    this.scene.add(mainLight.target);
    this.lights.push(mainLight);

    // Side lights for better visibility
    const sideLight1 = new THREE.DirectionalLight(0x404040, 0.5);
    sideLight1.position.set(2, 2, 2);
    this.scene.add(sideLight1);
    this.lights.push(sideLight1);

    const sideLight2 = new THREE.DirectionalLight(0x404040, 0.5);
    sideLight2.position.set(-2, -2, 2);
    this.scene.add(sideLight2);
    this.lights.push(sideLight2);
  }

  private async setupTable(): Promise<void> {
    const table = new THREE.Group();
    const { TABLE } = GAME_CONSTANTS;

    // Felt surface
    const feltGeometry = new THREE.PlaneGeometry(TABLE.WIDTH, TABLE.HEIGHT);
    const feltMaterial = new THREE.MeshLambertMaterial({ 
      color: TREM_BAO_THEME.secondary,
      side: THREE.DoubleSide
    });
    
    try {
      // Load felt texture with noise
      const feltNoise = await this.textureLoader.loadAsync('/assets/pool/felt-noise.png');
      feltNoise.wrapS = feltNoise.wrapT = THREE.RepeatWrapping;
      feltNoise.repeat.set(4, 2);
      feltMaterial.map = feltNoise;
    } catch (error) {
      console.warn('Could not load felt texture, using solid color');
    }

    const feltMesh = new THREE.Mesh(feltGeometry, feltMaterial);
    feltMesh.receiveShadow = true;
    table.add(feltMesh);

    // Rails/cushions
    const railHeight = TABLE.CUSHION_HEIGHT;
    const railWidth = TABLE.RAIL_WIDTH;
    
    const railMaterial = new THREE.MeshPhongMaterial({ 
      color: '#8B4513', // Saddle brown
      shininess: 30
    });

    // Top rail
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.WIDTH + railWidth * 2, railWidth, railHeight),
      railMaterial
    );
    topRail.position.set(0, TABLE.HEIGHT / 2 + railWidth / 2, railHeight / 2);
    topRail.castShadow = true;
    table.add(topRail);

    // Bottom rail
    const bottomRail = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.WIDTH + railWidth * 2, railWidth, railHeight),
      railMaterial
    );
    bottomRail.position.set(0, -TABLE.HEIGHT / 2 - railWidth / 2, railHeight / 2);
    bottomRail.castShadow = true;
    table.add(bottomRail);

    // Left rail
    const leftRail = new THREE.Mesh(
      new THREE.BoxGeometry(railWidth, TABLE.HEIGHT, railHeight),
      railMaterial
    );
    leftRail.position.set(-TABLE.WIDTH / 2 - railWidth / 2, 0, railHeight / 2);
    leftRail.castShadow = true;
    table.add(leftRail);

    // Right rail
    const rightRail = new THREE.Mesh(
      new THREE.BoxGeometry(railWidth, TABLE.HEIGHT, railHeight),
      railMaterial
    );
    rightRail.position.set(TABLE.WIDTH / 2 + railWidth / 2, 0, railHeight / 2);
    rightRail.castShadow = true;
    table.add(rightRail);

    // Pockets
    this.createPockets(table);

    this.tableMesh = table;
    this.scene.add(table);
  }

  private createPockets(table: THREE.Group): void {
    const { TABLE } = GAME_CONSTANTS;
    const pocketRadius = TABLE.POCKET_RADIUS;
    const pocketDepth = 0.05;
    
    const pocketGeometry = new THREE.CylinderGeometry(pocketRadius, pocketRadius * 0.8, pocketDepth, 16);
    const pocketMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

    const pocketPositions = [
      [-TABLE.WIDTH/2, -TABLE.HEIGHT/2], // Bottom left
      [TABLE.WIDTH/2, -TABLE.HEIGHT/2],  // Bottom right
      [-TABLE.WIDTH/2, TABLE.HEIGHT/2],  // Top left
      [TABLE.WIDTH/2, TABLE.HEIGHT/2],   // Top right
      [0, -TABLE.HEIGHT/2],              // Bottom center
      [0, TABLE.HEIGHT/2]                // Top center
    ];

    pocketPositions.forEach(([x, y]) => {
      const pocket = new THREE.Mesh(pocketGeometry, pocketMaterial);
      pocket.position.set(x, y, -pocketDepth / 2);
      table.add(pocket);
    });
  }

  private async setupBalls(): Promise<void> {
    const ballGeometry = new THREE.SphereGeometry(GAME_CONSTANTS.BALL.RADIUS, 16, 12);
    
    // Create ball materials
    const ballMaterials = new Map<number, THREE.MeshPhongMaterial>();
    
    for (let i = 0; i <= 15; i++) {
      const color = this.getBallColor(i);
      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: 100,
        specular: 0x222222
      });
      ballMaterials.set(i, material);
    }

    // Create ball meshes (will be positioned when updateBalls is called)
    for (let i = 0; i <= 15; i++) {
      const ballMesh = new THREE.Mesh(ballGeometry, ballMaterials.get(i));
      ballMesh.castShadow = true;
      ballMesh.receiveShadow = true;
      ballMesh.visible = false; // Hidden until positioned
      
      this.ballMeshes.set(i, ballMesh);
      this.scene.add(ballMesh);
    }
  }

  private getBallColor(number: number): string {
    const colors: { [key: number]: string } = {
      0: '#FFFFFF', // Cue ball
      1: '#FFD700', 2: '#0066CC', 3: '#FF0000', 4: '#800080',
      5: '#FF8800', 6: '#008000', 7: '#8B0000', 8: '#000000',
      9: '#FFD700', 10: '#0066CC', 11: '#FF0000', 12: '#800080',
      13: '#FF8800', 14: '#008000', 15: '#8B0000'
    };
    return colors[number] || '#FFFFFF';
  }

  private async setupLogo(): Promise<void> {
    await this.updateLogoConfig(this.config.logoConfig);
  }

  public async updateLogoConfig(logoConfig: LogoConfig): Promise<void> {
    // Remove existing logo
    if (this.logoMesh) {
      this.scene.remove(this.logoMesh);
      this.logoMesh = null;
    }

    try {
      // Load logo texture
      this.logoTexture = await this.textureLoader.loadAsync(logoConfig.url);
      this.logoTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.logoTexture.minFilter = THREE.LinearMipmapLinearFilter;
      this.logoTexture.magFilter = THREE.LinearFilter;

      // Calculate logo size with safety margins
      const { TABLE, LOGO } = GAME_CONSTANTS;
      const maxSize = Math.min(TABLE.WIDTH, TABLE.HEIGHT) * (1 - LOGO.SAFETY_MARGIN * 2);
      const logoSize = maxSize * Math.max(LOGO.MIN_SCALE, Math.min(logoConfig.scale, LOGO.MAX_SCALE));

      // Create logo geometry
      const logoGeometry = new THREE.PlaneGeometry(logoSize, logoSize);
      const logoMaterial = new THREE.MeshBasicMaterial({
        map: this.logoTexture,
        transparent: true,
        opacity: Math.max(LOGO.MIN_OPACITY, Math.min(logoConfig.opacity, LOGO.MAX_OPACITY)),
        depthWrite: false,
        depthTest: true
      });

      // Create logo mesh
      this.logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
      this.logoMesh.position.set(0, 0, 0.001); // Slightly above the felt
      this.logoMesh.rotation.z = logoConfig.rotation * Math.PI / 180;
      this.logoMesh.renderOrder = 1; // Render after felt but before balls

      this.scene.add(this.logoMesh);
      
      console.log('🎱 Logo updated:', logoConfig);
      
    } catch (error) {
      console.warn('Failed to load logo:', logoConfig.url, error);
    }
  }

  public updateBalls(balls: Ball[]): void {
    balls.forEach(ball => {
      const mesh = this.ballMeshes.get(ball.id);
      if (!mesh) return;

      if (ball.isPocketed) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.position.set(ball.position.x, ball.position.y, ball.position.z);
        mesh.rotation.set(ball.rotation.x, ball.rotation.y, ball.rotation.z);
      }
    });
  }

  public setQuality(quality: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    this.config.quality = quality;
    
    // Update renderer settings
    const pixelRatio = Math.min(window.devicePixelRatio, quality === 'HIGH' ? 2 : 1);
    this.renderer.setPixelRatio(pixelRatio);
    
    // Update shadow settings
    this.renderer.shadowMap.enabled = quality !== 'LOW';
    
    // Update texture anisotropy
    if (this.logoTexture) {
      const anisotropy = quality === 'HIGH' ? this.renderer.capabilities.getMaxAnisotropy() : 
                       quality === 'MEDIUM' ? 4 : 1;
      this.logoTexture.anisotropy = anisotropy;
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    // Dispose geometries and materials
    this.ballMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    
    if (this.logoTexture) {
      this.logoTexture.dispose();
    }
    
    this.renderer.dispose();
  }
}