import * as THREE from 'three';
import * as CANNON from 'cannon';
import { Ball3D as IBall3D, GAME_CONSTANTS_3D, BALL_COLORS } from './types/GameTypes';

export class Ball3D implements IBall3D {
  public id: number;
  public name: string;
  public type: 'cue' | 'solid' | 'stripe' | '8ball';
  public mesh: THREE.Mesh;
  public rigidBody: CANNON.Body;
  public sphere: THREE.Sphere;
  public fallen: boolean = false;
  public number?: number;

  private static envMap: THREE.CubeTexture | null = null;
  private static ballContactMaterial = new CANNON.Material("ballMaterial");

  constructor(
    x: number, 
    y: number, 
    z: number, 
    name: string, 
    scene: THREE.Scene, 
    world: CANNON.World,
    type: 'cue' | 'solid' | 'stripe' | '8ball' = 'solid',
    number?: number
  ) {
    this.id = Math.random();
    this.name = name;
    this.type = type;
    this.number = number;

    // Create visual mesh
    this.mesh = this.createMesh(x, y, z);
    this.sphere = new THREE.Sphere(this.mesh.position, GAME_CONSTANTS_3D.BALL.RADIUS);
    scene.add(this.mesh);

    // Create physics body
    this.rigidBody = this.createRigidBody(x, y, z);
    world.addBody(this.rigidBody);

    // Load environment map if not already loaded
    if (!Ball3D.envMap) {
      this.loadEnvironmentMap();
    }
  }

  private createMesh(x: number, y: number, z: number): THREE.Mesh {
    const { BALL } = GAME_CONSTANTS_3D;
    
    const geometry = new THREE.SphereGeometry(BALL.RADIUS, 16, 16);
    
    // Create material based on ball type
    let material: THREE.MeshPhongMaterial;
    
    if (this.name === 'whiteball') {
      material = new THREE.MeshPhongMaterial({
        color: BALL_COLORS[this.name],
        shininess: 100,
        specular: 0x404040
      });
    } else {
      // Try to load ball texture, fallback to solid color
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(
        `/assets/balls/${this.name}.png`,
        undefined,
        undefined,
        () => {
          // Fallback to solid color if texture fails
          material.color.setHex(BALL_COLORS[this.name] || 0xcc0000);
        }
      );

      material = new THREE.MeshPhongMaterial({
        map: texture,
        color: BALL_COLORS[this.name] || 0xcc0000,
        shininess: 100,
        specular: 0x404040
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  private createRigidBody(x: number, y: number, z: number): CANNON.Body {
    const { BALL, PHYSICS } = GAME_CONSTANTS_3D;
    
    const sphereBody = new CANNON.Body({
      mass: BALL.MASS,
      position: new CANNON.Vec3(x, y, z),
      shape: new CANNON.Sphere(BALL.RADIUS),
      material: Ball3D.ballContactMaterial
    });

    sphereBody.linearDamping = PHYSICS.DAMPING;
    sphereBody.angularDamping = PHYSICS.DAMPING;
    sphereBody.allowSleep = true;
    sphereBody.sleepSpeedLimit = 0.5;
    sphereBody.sleepTimeLimit = 1;

    return sphereBody;
  }

  private loadEnvironmentMap(): void {
    // Create a simple environment map for reflections
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const envMapUrls = [
      '/assets/skybox/px.png', '/assets/skybox/nx.png',
      '/assets/skybox/py.png', '/assets/skybox/ny.png', 
      '/assets/skybox/pz.png', '/assets/skybox/nz.png'
    ];

    Ball3D.envMap = cubeTextureLoader.load(
      envMapUrls,
      (texture) => {
        // Apply environment map to existing balls
        if (this.mesh.material instanceof THREE.MeshPhongMaterial) {
          this.mesh.material.envMap = texture;
          this.mesh.material.reflectivity = 0.3;
          this.mesh.material.needsUpdate = true;
        }
      },
      undefined,
      () => {
        // Ignore environment map loading errors
        console.log('Environment map not available, using basic material');
      }
    );
  }

  public update(): void {
    // Sync visual mesh with physics body
    this.mesh.position.copy(this.rigidBody.position as any);
    this.mesh.quaternion.copy(this.rigidBody.quaternion as any);
    
    // Update bounding sphere
    this.sphere.center.copy(this.mesh.position);
  }

  public onEnterHole(): void {
    this.rigidBody.velocity.set(0, 0, 0);
    this.rigidBody.angularVelocity.set(0, 0, 0);
    this.fallen = true;
    
    // Hide the ball
    this.mesh.visible = false;
  }

  public reset(x: number, y: number, z: number): void {
    this.rigidBody.position.set(x, y, z);
    this.rigidBody.velocity.set(0, 0, 0);
    this.rigidBody.angularVelocity.set(0, 0, 0);
    this.rigidBody.wakeUp();
    
    this.mesh.visible = true;
    this.fallen = false;
  }

  public isMoving(): boolean {
    const velocity = this.rigidBody.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    return speed > 0.1;
  }

  public static getContactMaterial(): CANNON.Material {
    return Ball3D.ballContactMaterial;
  }

  public dispose(): void {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}