import * as THREE from 'three';
import * as CANNON from 'cannon';
import { Ball3D } from './Ball3D';
import { GAME_CONSTANTS_3D, ShotData3D } from './types/GameTypes';

export class WhiteBall3D extends Ball3D {
  private forward: THREE.Vector3;
  private forwardLine: THREE.Line | null = null;
  private aimDot: THREE.Mesh | null = null;
  private defaultPosition: CANNON.Vec3;
  private scene: THREE.Scene;
  private world: CANNON.World;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    const { TABLE, BALL } = GAME_CONSTANTS_3D;
    const x = -TABLE.LEN_X / 4;
    const y = TABLE.HEIGHT + BALL.RADIUS;
    const z = 0;

    super(x, y, z, 'whiteball', scene, world, 'cue');
    
    this.scene = scene;
    this.world = world;
    this.forward = new THREE.Vector3(1, 0, 0);
    this.defaultPosition = new CANNON.Vec3(x, y, z);
    
    this.createAimingLine();
    this.createAimDot();
  }

  private createAimingLine(): void {
    const points = [];
    for (let i = 0; i < 100; i++) {
      points.push(new THREE.Vector3(i * 2, 0, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.5 
    });
    
    this.forwardLine = new THREE.Line(geometry, material);
    this.forwardLine.visible = false;
    this.scene.add(this.forwardLine);
  }

  private createAimDot(): void {
    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.7
    });
    
    this.aimDot = new THREE.Mesh(geometry, material);
    this.aimDot.visible = false;
    this.scene.add(this.aimDot);
  }

  public setAimDirection(angle: number): void {
    this.forward.set(Math.cos(angle), 0, Math.sin(angle));
    this.updateAimingVisuals();
  }

  public setAimTarget(targetPosition: THREE.Vector3): void {
    this.forward.subVectors(targetPosition, this.mesh.position).normalize();
    this.forward.y = 0; // Keep aim horizontal
    this.updateAimingVisuals();
  }

  private updateAimingVisuals(): void {
    if (!this.forwardLine || !this.aimDot) return;

    // Update aiming line position and rotation
    this.forwardLine.position.copy(this.mesh.position);
    this.forwardLine.lookAt(
      this.mesh.position.x + this.forward.x,
      this.mesh.position.y + this.forward.y,
      this.mesh.position.z + this.forward.z
    );

    // Find intersection point with other balls or walls for aim dot
    const intersectionPoint = this.findAimIntersection();
    if (intersectionPoint) {
      this.aimDot.position.copy(intersectionPoint);
      this.aimDot.visible = true;
    } else {
      this.aimDot.visible = false;
    }
  }

  private findAimIntersection(): THREE.Vector3 | null {
    const raycaster = new THREE.Raycaster(this.mesh.position, this.forward);
    const { TABLE } = GAME_CONSTANTS_3D;
    
    // Simple intersection with table bounds
    const maxDistance = Math.max(TABLE.LEN_X, TABLE.LEN_Z);
    const intersectionPoint = this.mesh.position.clone().add(
      this.forward.clone().multiplyScalar(maxDistance * 0.8)
    );
    
    // Keep within table bounds
    intersectionPoint.x = Math.max(-TABLE.LEN_X / 2, Math.min(TABLE.LEN_X / 2, intersectionPoint.x));
    intersectionPoint.z = Math.max(-TABLE.LEN_Z / 2, Math.min(TABLE.LEN_Z / 2, intersectionPoint.z));
    
    return intersectionPoint;
  }

  public showAiming(show: boolean): void {
    if (this.forwardLine) this.forwardLine.visible = show;
    if (this.aimDot) this.aimDot.visible = show;
    
    if (show) {
      this.updateAimingVisuals();
    }
  }

  public executeShot(shotData: ShotData3D): void {
    this.rigidBody.wakeUp();
    
    // Calculate shot direction (use forward if no direction provided)
    const direction = shotData.direction.length() > 0 ? shotData.direction : this.forward;
    direction.normalize();
    
    // Apply force at contact point
    const ballPoint = new CANNON.Vec3();
    ballPoint.copy(this.rigidBody.position);
    
    // Offset the contact point slightly behind the ball
    const forceOffset = new CANNON.Vec3(
      -direction.x * GAME_CONSTANTS_3D.BALL.RADIUS,
      0,
      -direction.z * GAME_CONSTANTS_3D.BALL.RADIUS
    );
    ballPoint.vadd(forceOffset, ballPoint);
    
    // Create force vector
    const force = new CANNON.Vec3(
      direction.x * shotData.power * 50, // Scale force appropriately
      0,
      direction.z * shotData.power * 50
    );
    
    // Apply impulse
    this.rigidBody.applyImpulse(force, ballPoint);
    
    // Hide aiming aids
    this.showAiming(false);
  }

  public onEnterHole(): void {
    // Override to reset position instead of hiding
    this.rigidBody.velocity.set(0, 0, 0);
    this.rigidBody.angularVelocity.set(0, 0, 0);
    this.rigidBody.position.copy(this.defaultPosition);
    this.rigidBody.wakeUp();
  }

  public update(): void {
    super.update();
    
    // Update aiming visuals if shown
    if (this.forwardLine && this.forwardLine.visible) {
      this.updateAimingVisuals();
    }
  }

  public dispose(): void {
    super.dispose();
    
    if (this.forwardLine) {
      this.scene.remove(this.forwardLine);
      if (this.forwardLine.geometry) this.forwardLine.geometry.dispose();
      if (this.forwardLine.material instanceof THREE.Material) {
        this.forwardLine.material.dispose();
      }
    }
    
    if (this.aimDot) {
      this.scene.remove(this.aimDot);
      if (this.aimDot.geometry) this.aimDot.geometry.dispose();
      if (this.aimDot.material instanceof THREE.Material) {
        this.aimDot.material.dispose();
      }
    }
  }
}
