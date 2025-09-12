// Official 8-Ball Pool Rules Implementation
// Based on WPA/BCA official rules

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  type: 'CUE' | 'SOLID' | 'STRIPE' | 'EIGHT';
  number: number;
  inPocket: boolean;
  color: string;
}

export interface PoolGameState {
  balls: Ball[];
  phase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL';
  currentPlayer: number;
  playerGroups: { [playerId: string]: 'SOLID' | 'STRIPE' | null };
  ballInHand: boolean;
  legalShot: boolean;
  scratched: boolean;
  winner?: string;
  turnUserId?: string;
}

export interface ShotResult {
  isLegal: boolean;
  ballInHand: boolean;
  pocketedBalls: Ball[];
  scratchType?: string;
  nextPlayer?: number;
  gameWon?: boolean;
  winner?: string;
}

export class PoolRuleEngine {
  
  // Check if shot is legal based on 8-ball rules
  validateShot(gameState: PoolGameState, shotBalls: Ball[], firstContact?: Ball): ShotResult {
    const result: ShotResult = {
      isLegal: true,
      ballInHand: false,
      pocketedBalls: []
    };

    const cueBall = shotBalls.find(b => b.type === 'CUE');
    const pocketedBalls = shotBalls.filter(b => b.inPocket && !gameState.balls.find(gb => gb.id === b.id)?.inPocket);
    
    result.pocketedBalls = pocketedBalls;

    // Rule 1: Cue ball scratch (most common)
    if (cueBall?.inPocket) {
      result.isLegal = false;
      result.ballInHand = true;
      result.scratchType = 'CUE_BALL_POCKETED';
      result.nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
      return result;
    }

    // Rule 2: No first contact (cue ball didn't hit anything)
    if (!firstContact) {
      result.isLegal = false;
      result.ballInHand = true;
      result.scratchType = 'NO_CONTACT';
      result.nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
      return result;
    }

    // Rule 3: Wrong ball contacted first
    const currentPlayerId = gameState.turnUserId || `player${gameState.currentPlayer}`;
    const playerGroup = gameState.playerGroups[currentPlayerId];
    
    if (gameState.phase === 'GROUPS_SET' && playerGroup) {
      // Player must hit their group first
      if (firstContact.type !== playerGroup && firstContact.type !== 'EIGHT') {
        result.isLegal = false;
        result.ballInHand = true;
        result.scratchType = 'WRONG_BALL_FIRST';
        result.nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        return result;
      }

      // Can only shoot 8-ball if their group is cleared
      if (firstContact.type === 'EIGHT') {
        const remainingPlayerBalls = gameState.balls.filter(b => 
          b.type === playerGroup && !b.inPocket
        );
        
        if (remainingPlayerBalls.length > 0) {
          result.isLegal = false;
          result.ballInHand = true;
          result.scratchType = 'EIGHT_BALL_EARLY';
          result.nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
          return result;
        }
      }
    }

    // Rule 4: 8-ball pocketed illegally = instant loss
    const eightBallPocketed = pocketedBalls.find(b => b.type === 'EIGHT');
    if (eightBallPocketed) {
      const remainingPlayerBalls = gameState.balls.filter(b => 
        b.type === playerGroup && !b.inPocket && b.id !== eightBallPocketed.id
      );

      if (remainingPlayerBalls.length > 0 || !result.isLegal) {
        // 8-ball pocketed too early or with a foul = loss
        result.gameWon = true;
        result.winner = gameState.currentPlayer === 1 ? 'player2' : 'player1';
        return result;
      } else {
        // Legal 8-ball win
        result.gameWon = true;
        result.winner = currentPlayerId;
        return result;
      }
    }

    // Rule 5: Check rail contact requirement
    // After legal first contact, either cue ball or object ball must hit rail or pocket
    const railContactMade = this.checkRailContact(shotBalls, cueBall, firstContact);
    if (!railContactMade && pocketedBalls.length === 0) {
      result.isLegal = false;
      result.ballInHand = true;
      result.scratchType = 'NO_RAIL_CONTACT';
      result.nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
      return result;
    }

    // Determine if player continues (pocketed legal ball)
    const legalPocket = this.checkLegalPocket(pocketedBalls, playerGroup, gameState.phase);
    if (!legalPocket) {
      result.nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    }

    return result;
  }

  private checkRailContact(allBalls: Ball[], cueBall?: Ball, firstContact?: Ball): boolean {
    // Simplified: assume rail contact happened if balls moved significantly
    // In real implementation, would track rail collisions during physics sim
    return true; // Placeholder - needs physics integration
  }

  private checkLegalPocket(pocketedBalls: Ball[], playerGroup?: string | null, phase?: string): boolean {
    if (pocketedBalls.length === 0) return false;
    
    // In open table, any solid/stripe pocket assigns group
    if (phase === 'OPEN') return true;
    
    // Must pocket own group
    return pocketedBalls.every(ball => 
      playerGroup === ball.type || ball.type === 'EIGHT'
    );
  }

  // Assign groups after break or first legal pocket
  assignGroups(gameState: PoolGameState, pocketedBalls: Ball[], playerId: string): PoolGameState {
    if (gameState.phase !== 'OPEN' || pocketedBalls.length === 0) {
      return gameState;
    }

    const solidsPocketed = pocketedBalls.filter(b => b.type === 'SOLID').length > 0;
    const stripesPocketed = pocketedBalls.filter(b => b.type === 'STRIPE').length > 0;

    if (solidsPocketed && !stripesPocketed) {
      gameState.playerGroups[playerId] = 'SOLID';
      gameState.phase = 'GROUPS_SET';
    } else if (stripesPocketed && !solidsPocketed) {
      gameState.playerGroups[playerId] = 'STRIPE';
      gameState.phase = 'GROUPS_SET';
    }

    // Assign opponent opposite group
    if (gameState.phase === 'GROUPS_SET') {
      const otherPlayerId = playerId.includes('1') ? 'player2' : 'player1';
      gameState.playerGroups[otherPlayerId] = 
        gameState.playerGroups[playerId] === 'SOLID' ? 'STRIPE' : 'SOLID';
    }

    return gameState;
  }

  // Check if ball in hand should be active
  checkBallInHand(gameState: PoolGameState): boolean {
    const cueBall = gameState.balls.find(b => b.type === 'CUE');
    return gameState.ballInHand || !cueBall || cueBall.inPocket;
  }

  // Validate cue ball placement during ball in hand
  validateCueBallPlacement(x: number, y: number, balls: Ball[], tableWidth: number = 2240, tableHeight: number = 1120): boolean {
    const ballRadius = 30; // Updated for larger balls
    const railWidth = 44;
    
    // Check table boundaries
    if (x < railWidth + ballRadius || x > tableWidth - railWidth - ballRadius ||
        y < railWidth + ballRadius || y > tableHeight - railWidth - ballRadius) {
      return false;
    }

    // Check distance from other balls
    return balls.every(ball => {
      if (ball.type === 'CUE' || ball.inPocket) return true;
      const dx = x - ball.x;
      const dy = y - ball.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance > ballRadius * 2.2; // More spacing for larger balls
    });
  }
}

export const poolRules = new PoolRuleEngine();