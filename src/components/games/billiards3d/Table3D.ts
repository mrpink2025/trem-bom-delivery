import * as THREE from 'three';
import * as CANNON from 'cannon';
import { GAME_CONSTANTS_3D, LogoConfig } from './types/GameTypes';

export class Table3D {
  private scene: THREE.Scene;
  private world: CANNON.World;
  private logoMesh: THREE.Mesh | null = null;
  private logoTexture: THREE.Texture | null = null;
  
  public static floorContactMaterial = new CANNON.Material("floorMaterial");
  public static wallContactMaterial = new CANNON.Material("wallMaterial");

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.scene = scene;
    this.world = world;
    this.createTable();
    this.createPhysicsBodies();
  }

  private createTable(): void {
    const { TABLE } = GAME_CONSTANTS_3D;
    
    // Table base (wood frame) - richer wood texture
    const baseGeometry = new THREE.BoxGeometry(
      TABLE.LEN_X + 25, 
      TABLE.HEIGHT - 5, 
      TABLE.LEN_Z + 25
    );
    const baseMaterial = new THREE.MeshPhongMaterial({
      color: 0x6b4423, // Richer mahogany brown
      shininess: 80,
      specular: 0x333333
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(0, TABLE.HEIGHT / 2 - 5, 0);
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    this.scene.add(baseMesh);

    // Table felt (playing surface) - create realistic felt texture
    const feltGeometry = new THREE.PlaneGeometry(TABLE.LEN_X, TABLE.LEN_Z);
    
    // Create felt texture with canvas
    const feltTexture = this.createFeltTexture();
    const feltMaterial = new THREE.MeshLambertMaterial({
      map: feltTexture,
      color: 0x0d8c0d // Base green color
    });
    
    const feltMesh = new THREE.Mesh(feltGeometry, feltMaterial);
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.position.y = TABLE.HEIGHT;
    feltMesh.receiveShadow = true;
    feltMesh.name = 'tableFelt';
    this.scene.add(feltMesh);

    // Table rails (cushions)
    this.createRails();
    
    // Pockets
    this.createPockets();
  }

  private createRails(): void {
    const { TABLE } = GAME_CONSTANTS_3D;
    const railHeight = TABLE.CUSHION_HEIGHT;
    const railWidth = 8;
    
    const railMaterial = new THREE.MeshPhongMaterial({
      color: 0x0d5d0d, // Darker green for rails
      shininess: 30,
      specular: 0x222222
    });

    // Long rails (left and right)
    [-1, 1].forEach(side => {
      const railGeometry = new THREE.BoxGeometry(TABLE.LEN_X - 40, railHeight, railWidth);
      const railMesh = new THREE.Mesh(railGeometry, railMaterial);
      railMesh.position.set(0, TABLE.HEIGHT + railHeight / 2, side * (TABLE.LEN_Z / 2 + railWidth / 2));
      railMesh.castShadow = true;
      railMesh.receiveShadow = true;
      this.scene.add(railMesh);
    });

    // Short rails (top and bottom)
    [-1, 1].forEach(side => {
      const railGeometry = new THREE.BoxGeometry(railWidth, railHeight, TABLE.LEN_Z - 40);
      const railMesh = new THREE.Mesh(railGeometry, railMaterial);
      railMesh.position.set(side * (TABLE.LEN_X / 2 + railWidth / 2), TABLE.HEIGHT + railHeight / 2, 0);
      railMesh.castShadow = true;
      railMesh.receiveShadow = true;
      this.scene.add(railMesh);
    });
  }

  private createPockets(): void {
    const { TABLE } = GAME_CONSTANTS_3D;
    const pocketRadius = TABLE.POCKET_RADIUS;
    
    const pocketGeometry = new THREE.CylinderGeometry(pocketRadius, pocketRadius, 10, 16);
    const pocketMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      shininess: 5
    });

    // Corner pockets
    const cornerPositions = [
      [-TABLE.LEN_X / 2, -TABLE.LEN_Z / 2],
      [TABLE.LEN_X / 2, -TABLE.LEN_Z / 2],
      [-TABLE.LEN_X / 2, TABLE.LEN_Z / 2],
      [TABLE.LEN_X / 2, TABLE.LEN_Z / 2]
    ];

    cornerPositions.forEach(([x, z]) => {
      const pocketMesh = new THREE.Mesh(pocketGeometry, pocketMaterial);
      pocketMesh.position.set(x, TABLE.HEIGHT - 5, z);
      this.scene.add(pocketMesh);
    });

    // Side pockets
    const sidePositions = [
      [0, -TABLE.LEN_Z / 2],
      [0, TABLE.LEN_Z / 2]
    ];

    sidePositions.forEach(([x, z]) => {
      const pocketMesh = new THREE.Mesh(pocketGeometry, pocketMaterial);
      pocketMesh.position.set(x, TABLE.HEIGHT - 5, z);
      this.scene.add(pocketMesh);
    });
  }

  private createPhysicsBodies(): void {
    const { TABLE } = GAME_CONSTANTS_3D;
    
    // Floor collision body
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: floorShape,
      position: new CANNON.Vec3(0, TABLE.HEIGHT, 0),
      material: Table3D.floorContactMaterial
    });
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(floorBody);

    // Wall collision bodies
    const wallThickness = 5;
    const wallHeight = TABLE.CUSHION_HEIGHT;
    
    // Long walls
    [-1, 1].forEach(side => {
      const wallShape = new CANNON.Box(new CANNON.Vec3(TABLE.LEN_X / 2, wallHeight, wallThickness));
      const wallBody = new CANNON.Body({
        mass: 0,
        shape: wallShape,
        position: new CANNON.Vec3(0, TABLE.HEIGHT + wallHeight, side * (TABLE.LEN_Z / 2 + wallThickness)),
        material: Table3D.wallContactMaterial
      });
      this.world.addBody(wallBody);
    });

    // Short walls
    [-1, 1].forEach(side => {
      const wallShape = new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight, TABLE.LEN_Z / 2));
      const wallBody = new CANNON.Body({
        mass: 0,
        shape: wallShape,
        position: new CANNON.Vec3(side * (TABLE.LEN_X / 2 + wallThickness), TABLE.HEIGHT + wallHeight, 0),
        material: Table3D.wallContactMaterial
      });
      this.world.addBody(wallBody);
    });
  }

  private createFeltTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Create felt texture pattern
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0e7a0e');
    gradient.addColorStop(0.5, '#0d8c0d');
    gradient.addColorStop(1, '#0c6b0c');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add felt texture with random noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.Texture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    texture.needsUpdate = true;
    
    return texture;
  }

  public updateLogo(config: LogoConfig): void {
    if (!config.url) return;

    // Load logo image and integrate it into felt texture
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.createFeltWithLogo(config, img);
    };
    img.onerror = () => {
      console.warn('Failed to load logo:', config.url);
    };
    img.src = config.url;
  }

  private createFeltWithLogo(config: LogoConfig, logoImg: HTMLImageElement): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Create base felt texture
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0e7a0e');
    gradient.addColorStop(0.5, '#0d8c0d');
    gradient.addColorStop(1, '#0c6b0c');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add felt texture with random noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    
    ctx.putImageData(imageData, 0, 0);

    // Draw logo in center with embroidered effect
    const logoScale = config.scale || 0.6;
    const logoSize = Math.min(canvas.width, canvas.height) * logoScale * 0.4;
    const x = (canvas.width - logoSize) / 2;
    const y = (canvas.height - logoSize) / 2;

    // Apply rotation if specified
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((config.rotation || 0) * Math.PI / 180);
    ctx.translate(-logoSize / 2, -logoSize / 2);

    // Create embroidered effect
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(logoImg, 2, 2, logoSize, logoSize);
    
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = config.opacity || 0.85;
    ctx.drawImage(logoImg, 0, 0, logoSize, logoSize);
    
    ctx.restore();

    // Find the felt mesh and update its texture
    const feltMesh = this.scene.getObjectByName('tableFelt') as THREE.Mesh;
    if (feltMesh && feltMesh.material instanceof THREE.MeshLambertMaterial) {
      if (feltMesh.material.map) {
        feltMesh.material.map.dispose();
      }
      
      const newTexture = new THREE.Texture(canvas);
      newTexture.wrapS = newTexture.wrapT = THREE.RepeatWrapping;
      newTexture.repeat.set(2, 1);
      newTexture.needsUpdate = true;
      
      feltMesh.material.map = newTexture;
      feltMesh.material.needsUpdate = true;
    }
  }

  public dispose(): void {
    if (this.logoMesh) {
      this.scene.remove(this.logoMesh);
      this.logoMesh = null;
    }
    
    if (this.logoTexture) {
      this.logoTexture.dispose();
      this.logoTexture = null;
    }
  }
}