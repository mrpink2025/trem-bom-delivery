// Sinuca Game Engine - Physics and Game Logic

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  number: number;
  inPocket: boolean;
  type: 'SOLID' | 'STRIPE' | 'CUE' | 'EIGHT';
}

export interface ShotResult {
  balls: Ball[];
  pottedBalls: Ball[];
  sounds: string[];
  fouls: string[];
  validShot: boolean;
}

export interface GamePhysics {
  friction: number;
  restitution: number;
  ballRadius: number;
  pocketRadius: number;
  tableWidth: number;
  tableHeight: number;
  maxVelocity: number;
}

// Game constants
export const PHYSICS: GamePhysics = {
  friction: 0.98,
  restitution: 0.9,
  ballRadius: 8,
  pocketRadius: 15,
  tableWidth: 800,
  tableHeight: 400,
  maxVelocity: 20
};

// Pocket positions
export const POCKETS = [
  { x: 20, y: 20 },           // Top-left
  { x: 400, y: 20 },          // Top-center  
  { x: 780, y: 20 },          // Top-right
  { x: 20, y: 380 },          // Bottom-left
  { x: 400, y: 380 },         // Bottom-center
  { x: 780, y: 380 }          // Bottom-right
];

// Ball colors and setup
export const BALL_COLORS: Record<number, string> = {
  0: '#FFFFFF',  // Cue ball
  1: '#FFD700',  // Yellow
  2: '#0000FF',  // Blue  
  3: '#FF0000',  // Red
  4: '#800080',  // Purple
  5: '#FFA500',  // Orange
  6: '#008000',  // Green
  7: '#800000',  // Maroon
  8: '#000000',  // Black (8-ball)
  9: '#FFFF00',  // Yellow stripe
  10: '#0080FF', // Blue stripe
  11: '#FF8080', // Red stripe
  12: '#FF80FF', // Purple stripe
  13: '#FFCC80', // Orange stripe
  14: '#80FF80', // Green stripe
  15: '#FF8080'  // Maroon stripe
};

export class SinucaEngine {
  private balls: Ball[] = [];
  private sounds: string[] = [];

  constructor() {
    this.initializeBalls();
  }

  initializeBalls(): Ball[] {
    const balls: Ball[] = [
      // Cue ball
      { 
        id: 0, 
        x: PHYSICS.tableWidth * 0.25, 
        y: PHYSICS.tableHeight * 0.5, 
        vx: 0, vy: 0, 
        color: BALL_COLORS[0], 
        number: 0, 
        inPocket: false, 
        type: 'CUE' 
      }
    ];

    // Rack formation (triangle)
    const rackX = PHYSICS.tableWidth * 0.7;
    const rackY = PHYSICS.tableHeight * 0.5;
    const ballSpacing = PHYSICS.ballRadius * 2.2;

    // Define rack positions (15 balls in triangle)
    const rackPositions = [
      // Row 1 (front)
      { x: 0, y: 0 },
      // Row 2  
      { x: -ballSpacing, y: -ballSpacing/2 },
      { x: -ballSpacing, y: ballSpacing/2 },
      // Row 3
      { x: -ballSpacing*2, y: -ballSpacing },
      { x: -ballSpacing*2, y: 0 },
      { x: -ballSpacing*2, y: ballSpacing },
      // Row 4
      { x: -ballSpacing*3, y: -ballSpacing*1.5 },
      { x: -ballSpacing*3, y: -ballSpacing/2 },
      { x: -ballSpacing*3, y: ballSpacing/2 },
      { x: -ballSpacing*3, y: ballSpacing*1.5 },
      // Row 5
      { x: -ballSpacing*4, y: -ballSpacing*2 },
      { x: -ballSpacing*4, y: -ballSpacing },
      { x: -ballSpacing*4, y: 0 },
      { x: -ballSpacing*4, y: ballSpacing },
      { x: -ballSpacing*4, y: ballSpacing*2 }
    ];

    // Ball numbers in specific order for 8-ball
    const ballOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    
    rackPositions.forEach((pos, index) => {
      const ballNumber = ballOrder[index];
      const ballType = ballNumber === 8 ? 'EIGHT' : 
                      ballNumber <= 7 ? 'SOLID' : 'STRIPE';
      
      balls.push({
        id: ballNumber,
        x: rackX + pos.x,
        y: rackY + pos.y,
        vx: 0,
        vy: 0,
        color: BALL_COLORS[ballNumber],
        number: ballNumber,
        inPocket: false,
        type: ballType
      });
    });

    this.balls = balls;
    return balls;
  }

  simulateShot(angle: number, power: number, spin = { x: 0, y: 0 }): ShotResult {
    // Clone balls for simulation
    const simulatedBalls = this.balls.map(ball => ({ ...ball }));
    const cueBall = simulatedBalls.find(b => b.type === 'CUE');
    
    if (!cueBall || cueBall.inPocket) {
      return {
        balls: simulatedBalls,
        pottedBalls: [],
        sounds: [],
        fouls: ['no_cue_ball'],
        validShot: false
      };
    }

    // Apply initial velocity to cue ball
    const velocity = Math.min(power * PHYSICS.maxVelocity, PHYSICS.maxVelocity);
    cueBall.vx = Math.cos(angle) * velocity;
    cueBall.vy = Math.sin(angle) * velocity;

    const pottedBalls: Ball[] = [];
    const sounds: string[] = [];
    const fouls: string[] = [];
    let firstBallHit: Ball | null = null;
    let cueBallPocketed = false;

    // Physics simulation loop
    let iterations = 0;
    const maxIterations = 300; // Prevent infinite loops

    while (this.ballsMoving(simulatedBalls) && iterations < maxIterations) {
      iterations++;

      simulatedBalls.forEach(ball => {
        if (ball.inPocket) return;

        // Apply friction
        ball.vx *= PHYSICS.friction;
        ball.vy *= PHYSICS.friction;

        // Stop very slow balls
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.1) ball.vy = 0;

        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collisions
        this.handleWallCollisions(ball, sounds);

        // Check pockets
        if (this.checkPocketCollision(ball)) {
          ball.inPocket = true;
          ball.vx = 0;
          ball.vy = 0;
          pottedBalls.push({ ...ball });
          sounds.push('pocket');
          
          if (ball.type === 'CUE') {
            cueBallPocketed = true;
          }
        }
      });

      // Ball-to-ball collisions
      for (let i = 0; i < simulatedBalls.length; i++) {
        for (let j = i + 1; j < simulatedBalls.length; j++) {
          const ball1 = simulatedBalls[i];
          const ball2 = simulatedBalls[j];
          
          if (ball1.inPocket || ball2.inPocket) continue;
          
          if (this.checkBallCollision(ball1, ball2)) {
            // Track first ball hit by cue ball
            if ((ball1.type === 'CUE' || ball2.type === 'CUE') && !firstBallHit) {
              firstBallHit = ball1.type === 'CUE' ? ball2 : ball1;
            }
            
            this.resolveBallCollision(ball1, ball2);
            sounds.push('ball_hit');
          }
        }
      }
    }

    // Analyze shot for fouls
    if (!firstBallHit) {
      fouls.push('no_ball_hit');
    }

    if (cueBallPocketed) {
      fouls.push('cue_ball_pocketed');
    }

    // If cue ball was pocketed, place it back at starting position
    if (cueBallPocketed) {
      const cueBallIndex = simulatedBalls.findIndex(b => b.type === 'CUE');
      if (cueBallIndex !== -1) {
        simulatedBalls[cueBallIndex] = {
          ...simulatedBalls[cueBallIndex],
          x: PHYSICS.tableWidth * 0.25,
          y: PHYSICS.tableHeight * 0.5,
          vx: 0,
          vy: 0,
          inPocket: false
        };
      }
    }

    return {
      balls: simulatedBalls,
      pottedBalls,
      sounds,
      fouls,
      validShot: fouls.length === 0
    };
  }

  private ballsMoving(balls: Ball[]): boolean {
    return balls.some(ball => 
      !ball.inPocket && (Math.abs(ball.vx) > 0.1 || Math.abs(ball.vy) > 0.1)
    );
  }

  private handleWallCollisions(ball: Ball, sounds: string[]) {
    const margin = 20; // Table border
    const minX = margin + PHYSICS.ballRadius;
    const maxX = PHYSICS.tableWidth - margin - PHYSICS.ballRadius;
    const minY = margin + PHYSICS.ballRadius;
    const maxY = PHYSICS.tableHeight - margin - PHYSICS.ballRadius;

    if (ball.x <= minX || ball.x >= maxX) {
      ball.vx *= -PHYSICS.restitution;
      ball.x = ball.x <= minX ? minX : maxX;
      sounds.push('rail');
    }

    if (ball.y <= minY || ball.y >= maxY) {
      ball.vy *= -PHYSICS.restitution;
      ball.y = ball.y <= minY ? minY : maxY;
      sounds.push('rail');
    }
  }

  private checkPocketCollision(ball: Ball): boolean {
    return POCKETS.some(pocket => {
      const dx = ball.x - pocket.x;
      const dy = ball.y - pocket.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= PHYSICS.pocketRadius;
    });
  }

  private checkBallCollision(ball1: Ball, ball2: Ball): boolean {
    const dx = ball1.x - ball2.x;
    const dy = ball1.y - ball2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= PHYSICS.ballRadius * 2;
  }

  private resolveBallCollision(ball1: Ball, ball2: Ball) {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return; // Prevent division by zero

    // Normalize collision vector
    const nx = dx / distance;
    const ny = dy / distance;

    // Separate balls
    const overlap = PHYSICS.ballRadius * 2 - distance;
    ball1.x -= nx * overlap * 0.5;
    ball1.y -= ny * overlap * 0.5;
    ball2.x += nx * overlap * 0.5;
    ball2.y += ny * overlap * 0.5;

    // Calculate relative velocity
    const dvx = ball2.vx - ball1.vx;
    const dvy = ball2.vy - ball1.vy;

    // Calculate relative velocity along collision normal
    const dvn = dvx * nx + dvy * ny;

    // Do not resolve if velocities are separating
    if (dvn > 0) return;

    // Calculate collision impulse (assuming equal mass)
    const impulse = 2 * dvn / 2;

    // Update velocities
    ball1.vx += impulse * nx * PHYSICS.restitution;
    ball1.vy += impulse * ny * PHYSICS.restitution;
    ball2.vx -= impulse * nx * PHYSICS.restitution;
    ball2.vy -= impulse * ny * PHYSICS.restitution;
  }

  updateBalls(newBalls: Ball[]) {
    this.balls = newBalls;
  }

  getBalls(): Ball[] {
    return [...this.balls];
  }

  getCurrentPlayerGroup(pottedBalls: Ball[]): 'SOLID' | 'STRIPE' | null {
    // Determine player group based on first ball potted (excluding 8-ball)
    const firstBallPotted = pottedBalls.find(ball => ball.type !== 'EIGHT' && ball.type !== 'CUE');
    return firstBallPotted?.type === 'SOLID' ? 'SOLID' : 
           firstBallPotted?.type === 'STRIPE' ? 'STRIPE' : null;
  }

  checkGameWin(pottedBalls: Ball[], playerGroup: 'SOLID' | 'STRIPE'): boolean {
    // Win if all player's group balls are potted and 8-ball is potted last
    const eightBallPotted = pottedBalls.some(ball => ball.type === 'EIGHT');
    const playerBallsRemaining = this.balls.filter(ball => 
      ball.type === playerGroup && !ball.inPocket
    ).length;

    return eightBallPotted && playerBallsRemaining === 0;
  }

  checkGameLoss(fouls: string[], pottedBalls: Ball[], playerGroup: 'SOLID' | 'STRIPE'): boolean {
    // Lose if 8-ball is potted early or cue ball and 8-ball are potted together
    const eightBallPotted = pottedBalls.some(ball => ball.type === 'EIGHT');
    const cueBallPotted = fouls.includes('cue_ball_pocketed');
    const playerBallsRemaining = this.balls.filter(ball => 
      ball.type === playerGroup && !ball.inPocket
    ).length;

    return eightBallPotted && (cueBallPotted || playerBallsRemaining > 0);
  }
}

export const sinucaEngine = new SinucaEngine();