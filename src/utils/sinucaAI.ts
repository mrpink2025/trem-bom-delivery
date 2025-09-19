// Sinuca AI Player Logic

import { Ball, SinucaEngine, PHYSICS } from './sinucaEngine';

export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AIShot {
  angle: number;
  power: number;
  spin: { x: number; y: number };
  confidence: number;
}

export class SinucaAI {
  private engine: SinucaEngine;
  private difficulty: AIDifficulty;

  constructor(engine: SinucaEngine, difficulty: AIDifficulty = 'MEDIUM') {
    this.engine = engine;
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty: AIDifficulty) {
    this.difficulty = difficulty;
  }

  calculateBestShot(
    balls: Ball[], 
    playerGroup: 'SOLID' | 'STRIPE' | null,
    gamePhase: string
  ): AIShot {
    const cueBall = balls.find(b => b.type === 'CUE' && !b.inPocket);
    if (!cueBall) {
      return { angle: 0, power: 0.5, spin: { x: 0, y: 0 }, confidence: 0 };
    }

    // Get target balls based on game phase and player group
    const targetBalls = this.getTargetBalls(balls, playerGroup, gamePhase);
    
    if (targetBalls.length === 0) {
      // Defensive shot or break shot
      return this.calculateDefensiveShot(cueBall, balls);
    }

    // Find best shot among target balls
    let bestShot: AIShot = { angle: 0, power: 0.5, spin: { x: 0, y: 0 }, confidence: 0 };
    
    for (const targetBall of targetBalls) {
      const shot = this.calculateShotToBall(cueBall, targetBall, balls);
      if (shot.confidence > bestShot.confidence) {
        bestShot = shot;
      }
    }

    // Apply difficulty modifiers
    return this.applyDifficultyModifiers(bestShot);
  }

  private getTargetBalls(
    balls: Ball[], 
    playerGroup: 'SOLID' | 'STRIPE' | null,
    gamePhase: string
  ): Ball[] {
    if (gamePhase === 'BREAK') {
      // Target the front ball in the rack
      return balls.filter(ball => ball.number === 1);
    }

    if (gamePhase === 'OPEN') {
      // Can target any ball except 8-ball
      return balls.filter(ball => 
        !ball.inPocket && 
        ball.type !== 'CUE' && 
        ball.type !== 'EIGHT'
      );
    }

    if (playerGroup && gamePhase === 'GROUPS_SET') {
      // Target player's group balls
      return balls.filter(ball => 
        !ball.inPocket && 
        ball.type === playerGroup
      );
    }

    if (gamePhase === 'EIGHT_BALL') {
      // Target the 8-ball
      return balls.filter(ball => 
        !ball.inPocket && 
        ball.type === 'EIGHT'
      );
    }

    return [];
  }

  private calculateShotToBall(cueBall: Ball, targetBall: Ball, allBalls: Ball[]): AIShot {
    // Calculate direct angle to target ball
    const dx = targetBall.x - cueBall.x;
    const dy = targetBall.y - cueBall.y;
    const directAngle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Find best pocket for target ball
    const bestPocket = this.findBestPocket(targetBall, allBalls);
    if (!bestPocket) {
      return { angle: directAngle, power: 0.3, spin: { x: 0, y: 0 }, confidence: 0.1 };
    }

    // Calculate angle needed to pot the ball
    const pocketAngle = this.calculatePocketAngle(targetBall, bestPocket);
    
    // Calculate the angle the cue ball needs to hit the target ball
    const requiredAngle = this.calculateRequiredCueBallAngle(
      cueBall, targetBall, pocketAngle
    );

    // Check if shot is physically possible (no obstructions)
    const clearPath = this.checkClearPath(cueBall, targetBall, allBalls, requiredAngle);
    
    // Calculate power based on distance and required precision
    const power = this.calculateOptimalPower(distance, clearPath);
    
    // Calculate confidence based on various factors
    const confidence = this.calculateShotConfidence(
      cueBall, targetBall, bestPocket, allBalls, clearPath
    );

    return {
      angle: requiredAngle,
      power,
      spin: { x: 0, y: 0 }, // TODO: Add spin calculations for advanced shots
      confidence
    };
  }

  private findBestPocket(targetBall: Ball, allBalls: Ball[]): { x: number; y: number } | null {
    const pockets = [
      { x: 20, y: 20 },
      { x: PHYSICS.tableWidth / 2, y: 20 },
      { x: PHYSICS.tableWidth - 20, y: 20 },
      { x: 20, y: PHYSICS.tableHeight - 20 },
      { x: PHYSICS.tableWidth / 2, y: PHYSICS.tableHeight - 20 },
      { x: PHYSICS.tableWidth - 20, y: PHYSICS.tableHeight - 20 }
    ];

    let bestPocket = null;
    let bestScore = -1;

    for (const pocket of pockets) {
      const distance = Math.sqrt(
        Math.pow(targetBall.x - pocket.x, 2) + 
        Math.pow(targetBall.y - pocket.y, 2)
      );
      
      // Check if path to pocket is clear
      const pathClear = this.isPathClear(targetBall, pocket, allBalls);
      
      // Score based on distance and path clarity
      const score = pathClear ? (1000 - distance) : 0;
      
      if (score > bestScore) {
        bestScore = score;
        bestPocket = pocket;
      }
    }

    return bestPocket;
  }

  private calculatePocketAngle(ball: Ball, pocket: { x: number; y: number }): number {
    return Math.atan2(pocket.y - ball.y, pocket.x - ball.x);
  }

  private calculateRequiredCueBallAngle(
    cueBall: Ball, 
    targetBall: Ball, 
    pocketAngle: number
  ): number {
    // Calculate where cue ball needs to hit target ball to send it to pocket
    // This is simplified - in reality this involves more complex geometry
    
    const ballToPocket = pocketAngle;
    const ballToCue = Math.atan2(cueBall.y - targetBall.y, cueBall.x - targetBall.x);
    
    // The required angle is approximately the angle needed to create
    // the correct collision vector
    const hitAngle = ballToPocket + Math.PI; // Opposite direction to pocket
    
    // Adjust based on ball positions
    const dx = targetBall.x - cueBall.x;
    const dy = targetBall.y - cueBall.y;
    
    return Math.atan2(dy, dx);
  }

  private checkClearPath(
    cueBall: Ball, 
    targetBall: Ball, 
    allBalls: Ball[], 
    angle: number
  ): boolean {
    // Check if there are any balls blocking the path
    const dx = targetBall.x - cueBall.x;
    const dy = targetBall.y - cueBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check points along the path
    const steps = Math.floor(distance / (PHYSICS.ballRadius * 2));
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const checkX = cueBall.x + dx * t;
      const checkY = cueBall.y + dy * t;
      
      // Check if any ball is near this point
      for (const ball of allBalls) {
        if (ball === cueBall || ball === targetBall || ball.inPocket) continue;
        
        const ballDx = ball.x - checkX;
        const ballDy = ball.y - checkY;
        const ballDistance = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
        
        if (ballDistance < PHYSICS.ballRadius * 2.5) {
          return false; // Path blocked
        }
      }
    }
    
    return true;
  }

  private isPathClear(
    fromBall: Ball, 
    toPocket: { x: number; y: number }, 
    allBalls: Ball[]
  ): boolean {
    const dx = toPocket.x - fromBall.x;
    const dy = toPocket.y - fromBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const steps = Math.floor(distance / (PHYSICS.ballRadius * 2));
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const checkX = fromBall.x + dx * t;
      const checkY = fromBall.y + dy * t;
      
      for (const ball of allBalls) {
        if (ball === fromBall || ball.inPocket) continue;
        
        const ballDx = ball.x - checkX;
        const ballDy = ball.y - checkY;
        const ballDistance = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
        
        if (ballDistance < PHYSICS.ballRadius * 2) {
          return false;
        }
      }
    }
    
    return true;
  }

  private calculateOptimalPower(distance: number, clearPath: boolean): number {
    // Base power on distance
    let power = Math.min(distance / (PHYSICS.tableWidth * 0.8), 1.0);
    
    // Reduce power if path is not completely clear
    if (!clearPath) {
      power *= 0.7;
    }
    
    // Ensure minimum and maximum power
    return Math.max(0.2, Math.min(0.95, power));
  }

  private calculateShotConfidence(
    cueBall: Ball,
    targetBall: Ball,
    pocket: { x: number; y: number } | null,
    allBalls: Ball[],
    clearPath: boolean
  ): number {
    if (!pocket) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Distance factor (closer = more confident)
    const cueToTarget = Math.sqrt(
      Math.pow(targetBall.x - cueBall.x, 2) + 
      Math.pow(targetBall.y - cueBall.y, 2)
    );
    confidence += Math.max(0, (200 - cueToTarget) / 200) * 0.3;
    
    // Pocket distance factor
    const targetToPocket = Math.sqrt(
      Math.pow(pocket.x - targetBall.x, 2) + 
      Math.pow(pocket.y - targetBall.y, 2)
    );
    confidence += Math.max(0, (150 - targetToPocket) / 150) * 0.2;
    
    // Clear path bonus
    if (clearPath) {
      confidence += 0.3;
    }
    
    // Angle difficulty (straight shots are easier)
    const shotAngle = Math.abs(Math.atan2(
      targetBall.y - cueBall.y,
      targetBall.x - cueBall.x
    ));
    const angleBonus = Math.cos(shotAngle) * 0.1;
    confidence += angleBonus;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private calculateDefensiveShot(cueBall: Ball, allBalls: Ball[]): AIShot {
    // Simple defensive shot - aim for a rail to hide cue ball
    const angle = Math.random() * Math.PI * 2;
    const power = 0.3 + Math.random() * 0.3;
    
    return {
      angle,
      power,
      spin: { x: 0, y: 0 },
      confidence: 0.4
    };
  }

  private applyDifficultyModifiers(shot: AIShot): AIShot {
    const modifiedShot = { ...shot };
    
    switch (this.difficulty) {
      case 'EASY':
        // Add more randomness and reduce confidence
        modifiedShot.angle += (Math.random() - 0.5) * 0.3;
        modifiedShot.power += (Math.random() - 0.5) * 0.2;
        modifiedShot.confidence *= 0.6;
        break;
        
      case 'MEDIUM':
        // Slight randomness
        modifiedShot.angle += (Math.random() - 0.5) * 0.1;
        modifiedShot.power += (Math.random() - 0.5) * 0.1;
        modifiedShot.confidence *= 0.8;
        break;
        
      case 'HARD':
        // Very accurate, slight confidence boost
        modifiedShot.angle += (Math.random() - 0.5) * 0.05;
        modifiedShot.confidence *= 1.1;
        break;
    }
    
    // Ensure values stay in valid ranges
    modifiedShot.power = Math.max(0.1, Math.min(1.0, modifiedShot.power));
    modifiedShot.confidence = Math.max(0, Math.min(1.0, modifiedShot.confidence));
    
    return modifiedShot;
  }

  // Calculate thinking time based on difficulty
  getThinkingTime(): number {
    switch (this.difficulty) {
      case 'EASY': return 1000 + Math.random() * 2000; // 1-3 seconds
      case 'MEDIUM': return 1500 + Math.random() * 2500; // 1.5-4 seconds  
      case 'HARD': return 2000 + Math.random() * 3000; // 2-5 seconds
      default: return 2000;
    }
  }
}

export const createSinucaAI = (engine: SinucaEngine, difficulty: AIDifficulty = 'MEDIUM') => {
  return new SinucaAI(engine, difficulty);
};