import { Ball, ShotData, PhysicsConfig, GAME_CONSTANTS } from '../types/GameTypes';

export class BilliardsPhysics {
  private config: PhysicsConfig;
  private balls: Ball[] = [];
  private pockets: { x: number; y: number; radius: number }[] = [];

  constructor() {
    this.config = {
      gravity: GAME_CONSTANTS.PHYSICS.GRAVITY,
      friction: GAME_CONSTANTS.PHYSICS.FRICTION,
      restitution: GAME_CONSTANTS.PHYSICS.RESTITUTION,
      ballMass: GAME_CONSTANTS.BALL.MASS,
      ballRadius: GAME_CONSTANTS.BALL.RADIUS,
      tableWidth: GAME_CONSTANTS.TABLE.WIDTH,
      tableHeight: GAME_CONSTANTS.TABLE.HEIGHT,
      pocketRadius: GAME_CONSTANTS.TABLE.POCKET_RADIUS,
      railHeight: GAME_CONSTANTS.TABLE.CUSHION_HEIGHT
    };

    this.setupPockets();
  }

  private setupPockets(): void {
    const { tableWidth, tableHeight, pocketRadius } = this.config;
    const margin = pocketRadius * 0.8;

    // Corner pockets
    this.pockets = [
      { x: -tableWidth/2 + margin, y: -tableHeight/2 + margin, radius: pocketRadius },
      { x: tableWidth/2 - margin, y: -tableHeight/2 + margin, radius: pocketRadius },
      { x: -tableWidth/2 + margin, y: tableHeight/2 - margin, radius: pocketRadius },
      { x: tableWidth/2 - margin, y: tableHeight/2 - margin, radius: pocketRadius },
      // Side pockets
      { x: 0, y: -tableHeight/2 + margin, radius: pocketRadius },
      { x: 0, y: tableHeight/2 - margin, radius: pocketRadius }
    ];
  }

  public reset(balls: Ball[]): void {
    this.balls = balls.map(ball => ({ ...ball }));
  }

  public executeShot(cueBall: Ball, shotData: ShotData): void {
    const { power, angle, spin } = shotData;
    const maxPower = 15; // m/s
    const velocity = power * maxPower;

    // Apply velocity to cue ball
    cueBall.velocity.x = Math.cos(angle) * velocity;
    cueBall.velocity.y = Math.sin(angle) * velocity;
    cueBall.velocity.z = 0;

    // Apply spin (simplified)
    const spinFactor = 0.1;
    cueBall.rotation.x = spin.y * spinFactor;
    cueBall.rotation.y = spin.x * spinFactor;
    cueBall.rotation.z = 0;
  }

  public update(deltaTime: number): void {
    if (deltaTime <= 0) return;

    // Update ball positions and handle collisions
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (ball.isPocketed) continue;

      // Update position
      ball.position.x += ball.velocity.x * deltaTime;
      ball.position.y += ball.velocity.y * deltaTime;
      ball.position.z += ball.velocity.z * deltaTime;

      // Apply gravity to z-velocity
      ball.velocity.z += this.config.gravity * deltaTime;

      // Keep ball on table surface (minimum z = ball radius)
      if (ball.position.z <= this.config.ballRadius) {
        ball.position.z = this.config.ballRadius;
        ball.velocity.z = Math.abs(ball.velocity.z) * this.config.restitution;
      }

      // Apply friction
      const frictionForce = this.config.friction;
      const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      
      if (speed > 0) {
        const frictionX = -(ball.velocity.x / speed) * frictionForce;
        const frictionY = -(ball.velocity.y / speed) * frictionForce;
        
        ball.velocity.x += frictionX * deltaTime;
        ball.velocity.y += frictionY * deltaTime;
        
        // Stop ball if velocity becomes very small
        if (speed < GAME_CONSTANTS.PHYSICS.MIN_VELOCITY) {
          ball.velocity.x = 0;
          ball.velocity.y = 0;
        }
      }

      // Handle wall collisions
      this.handleWallCollisions(ball);

      // Check pocket collisions
      this.checkPocketCollision(ball);
    }

    // Handle ball-to-ball collisions
    this.handleBallCollisions(deltaTime);
  }

  private handleWallCollisions(ball: Ball): void {
    const { tableWidth, tableHeight, ballRadius } = this.config;
    const halfWidth = tableWidth / 2 - ballRadius;
    const halfHeight = tableHeight / 2 - ballRadius;

    // X boundaries
    if (ball.position.x <= -halfWidth) {
      ball.position.x = -halfWidth;
      ball.velocity.x = Math.abs(ball.velocity.x) * this.config.restitution;
    } else if (ball.position.x >= halfWidth) {
      ball.position.x = halfWidth;
      ball.velocity.x = -Math.abs(ball.velocity.x) * this.config.restitution;
    }

    // Y boundaries
    if (ball.position.y <= -halfHeight) {
      ball.position.y = -halfHeight;
      ball.velocity.y = Math.abs(ball.velocity.y) * this.config.restitution;
    } else if (ball.position.y >= halfHeight) {
      ball.position.y = halfHeight;
      ball.velocity.y = -Math.abs(ball.velocity.y) * this.config.restitution;
    }
  }

  private handleBallCollisions(deltaTime: number): void {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i];
        const ball2 = this.balls[j];

        if (ball1.isPocketed || ball2.isPocketed) continue;

        const dx = ball2.position.x - ball1.position.x;
        const dy = ball2.position.y - ball1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = ball1.radius + ball2.radius;

        if (distance < minDistance) {
          // Collision detected - resolve it
          this.resolveBallCollision(ball1, ball2, dx, dy, distance, minDistance);
        }
      }
    }
  }

  private resolveBallCollision(
    ball1: Ball, 
    ball2: Ball, 
    dx: number, 
    dy: number, 
    distance: number, 
    minDistance: number
  ): void {
    // Separate balls to prevent overlap
    const overlap = minDistance - distance;
    const separationX = (dx / distance) * overlap * 0.5;
    const separationY = (dy / distance) * overlap * 0.5;

    ball1.position.x -= separationX;
    ball1.position.y -= separationY;
    ball2.position.x += separationX;
    ball2.position.y += separationY;

    // Calculate collision response (elastic collision)
    const normalX = dx / distance;
    const normalY = dy / distance;

    // Relative velocity
    const relativeVelX = ball2.velocity.x - ball1.velocity.x;
    const relativeVelY = ball2.velocity.y - ball1.velocity.y;

    // Relative velocity along the normal
    const velAlongNormal = relativeVelX * normalX + relativeVelY * normalY;

    // Do not resolve if velocities are separating
    if (velAlongNormal > 0) return;

    // Calculate impulse
    const impulse = 2 * velAlongNormal / (ball1.mass + ball2.mass);

    // Apply impulse
    ball1.velocity.x += impulse * ball2.mass * normalX * this.config.restitution;
    ball1.velocity.y += impulse * ball2.mass * normalY * this.config.restitution;
    ball2.velocity.x -= impulse * ball1.mass * normalX * this.config.restitution;
    ball2.velocity.y -= impulse * ball1.mass * normalY * this.config.restitution;
  }

  private checkPocketCollision(ball: Ball): void {
    for (const pocket of this.pockets) {
      const dx = ball.position.x - pocket.x;
      const dy = ball.position.y - pocket.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < pocket.radius) {
        // Ball is pocketed
        ball.isPocketed = true;
        ball.velocity.x = 0;
        ball.velocity.y = 0;
        ball.velocity.z = 0;
        
        // Move ball below table
        ball.position.z = -0.1;
        break;
      }
    }
  }

  public isBallPocketed(ball: Ball): boolean {
    return ball.isPocketed;
  }

  public getBalls(): Ball[] {
    return this.balls;
  }

  public dispose(): void {
    this.balls = [];
  }
}
