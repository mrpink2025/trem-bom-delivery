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

    // Table felt (playing surface) - vibrant green with subtle texture
    const feltGeometry = new THREE.PlaneGeometry(TABLE.LEN_X, TABLE.LEN_Z);
    const feltMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a7c0a, // Vibrant billiards green
      shininess: 5
    });
    const feltMesh = new THREE.Mesh(feltGeometry, feltMaterial);
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.position.y = TABLE.HEIGHT;
    feltMesh.receiveShadow = true;
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

  public updateLogo(config: LogoConfig): void {
    // Remove existing logo
    if (this.logoMesh) {
      this.scene.remove(this.logoMesh);
      this.logoMesh = null;
    }

    if (this.logoTexture) {
      this.logoTexture.dispose();
      this.logoTexture = null;
    }

    // Load new logo
    const loader = new THREE.TextureLoader();
    loader.load(
      config.url,
      (texture) => {
        this.logoTexture = texture;
        this.createLogoMesh(config);
      },
      undefined,
      (error) => {
        console.warn('Failed to load logo:', error);
      }
    );
  }

  private createLogoMesh(config: LogoConfig): void {
    if (!this.logoTexture) return;

    const { TABLE } = GAME_CONSTANTS_3D;
    
    // Calculate logo size based on scale and table dimensions
    const maxSize = Math.min(TABLE.LEN_X, TABLE.LEN_Z) * 0.3; // Max 30% of table dimension
    const logoSize = maxSize * config.scale;
    
    // Create logo geometry
    const logoGeometry = new THREE.PlaneGeometry(logoSize, logoSize);
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: this.logoTexture,
      transparent: true,
      opacity: config.opacity,
      depthWrite: false,
      depthTest: true
    });

    this.logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
    
    // Position logo on table surface with slight offset to prevent z-fighting
    this.logoMesh.position.set(0, TABLE.HEIGHT + 0.1, 0);
    this.logoMesh.rotation.x = -Math.PI / 2;
    this.logoMesh.rotation.z = (config.rotation * Math.PI) / 180;
    
    // Ensure logo renders after table but before balls
    this.logoMesh.renderOrder = 1;
    
    this.scene.add(this.logoMesh);
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