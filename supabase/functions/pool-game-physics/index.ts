import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wx: number;
  wy: number;
  color: string;
  number?: number;
  inPocket: boolean;
  type: 'SOLID' | 'STRIPE' | 'CUE' | 'EIGHT';
}

interface PoolGameState {
  balls: Ball[];
  turn_user_id: string;
  players: Array<{
    userId: string;
    user_id: string;
    seat: number;
    connected: boolean;
    mmr: number;
    group?: 'SOLID' | 'STRIPE';
  }>;
  game_phase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL';
  ball_in_hand?: boolean;
  shot_clock?: number;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  winner_user_ids?: string[];
}

class PoolPhysics {
  private readonly FRICTION = 0.98;
  private readonly BALL_RADIUS = 12;
  private readonly TABLE_WIDTH = 800;
  private readonly TABLE_HEIGHT = 400;
  private readonly POCKET_RADIUS = 20;
  private readonly RESTITUTION = 0.8;

  private pockets = [
    { x: 0, y: 0 }, { x: this.TABLE_WIDTH/2, y: 0 }, { x: this.TABLE_WIDTH, y: 0 },
    { x: 0, y: this.TABLE_HEIGHT }, { x: this.TABLE_WIDTH/2, y: this.TABLE_HEIGHT }, { x: this.TABLE_WIDTH, y: this.TABLE_HEIGHT }
  ];

  simulateShot(balls: Ball[], shot: any): Ball[] {
    console.log('[PHYSICS] Simulating shot:', shot);
    
    // Find cue ball
    const cueBall = balls.find(b => b.type === 'CUE' && !b.inPocket);
    if (!cueBall) {
      console.log('[PHYSICS] No cue ball found');
      return balls;
    }

    // Apply shot force to cue ball
    const forceMultiplier = 15; // Adjust for realistic physics
    cueBall.vx = Math.cos(shot.dir) * shot.power * forceMultiplier;
    cueBall.vy = Math.sin(shot.dir) * shot.power * forceMultiplier;
    
    // Apply spin effects
    cueBall.wx = shot.spin?.sx * 2 || 0;
    cueBall.wy = shot.spin?.sy * 2 || 0;

    console.log('[PHYSICS] Cue ball velocity set to:', { vx: cueBall.vx, vy: cueBall.vy });

    // Simulate physics for several frames
    let simulationBalls = JSON.parse(JSON.stringify(balls)); // Deep copy
    const maxFrames = 300; // 5 seconds at 60fps
    let frame = 0;

    while (frame < maxFrames && this.hasMovement(simulationBalls)) {
      frame++;
      
      // Update positions
      simulationBalls.forEach(ball => {
        if (ball.inPocket) return;
        
        // Apply spin to velocity
        ball.vx += ball.wx * 0.1;
        ball.vy += ball.wy * 0.1;
        
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Apply friction
        ball.vx *= this.FRICTION;
        ball.vy *= this.FRICTION;
        ball.wx *= 0.95;
        ball.wy *= 0.95;
        
        // Stop very slow movement
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.1) ball.vy = 0;
        if (Math.abs(ball.wx) < 0.05) ball.wx = 0;
        if (Math.abs(ball.wy) < 0.05) ball.wy = 0;
      });

      // Handle collisions
      this.handleCollisions(simulationBalls);
      
      // Handle walls
      this.handleWallCollisions(simulationBalls);
      
      // Handle pockets
      this.handlePockets(simulationBalls);
      
      // Every 10 frames, check if we should break early
      if (frame % 10 === 0 && !this.hasSignificantMovement(simulationBalls)) {
        break;
      }
    }

    console.log('[PHYSICS] Simulation completed in', frame, 'frames');
    console.log('[PHYSICS] Final positions:', simulationBalls.map(b => ({ id: b.id, x: Math.round(b.x), y: Math.round(b.y), inPocket: b.inPocket })));
    
    return simulationBalls;
  }

  private hasMovement(balls: Ball[]): boolean {
    return balls.some(ball => 
      !ball.inPocket && 
      (Math.abs(ball.vx) > 0.01 || Math.abs(ball.vy) > 0.01)
    );
  }

  private hasSignificantMovement(balls: Ball[]): boolean {
    return balls.some(ball => 
      !ball.inPocket && 
      (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5)
    );
  }

  private handleCollisions(balls: Ball[]): void {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const ball1 = balls[i];
        const ball2 = balls[j];
        
        if (ball1.inPocket || ball2.inPocket) continue;
        
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.BALL_RADIUS * 2) {
          // Collision detected
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);
          
          // Rotate velocities
          const vx1 = ball1.vx * cos + ball1.vy * sin;
          const vy1 = ball1.vy * cos - ball1.vx * sin;
          const vx2 = ball2.vx * cos + ball2.vy * sin;
          const vy2 = ball2.vy * cos - ball2.vx * sin;
          
          // Elastic collision
          const newVx1 = vx2 * this.RESTITUTION;
          const newVx2 = vx1 * this.RESTITUTION;
          
          // Rotate back
          ball1.vx = newVx1 * cos - vy1 * sin;
          ball1.vy = vy1 * cos + newVx1 * sin;
          ball2.vx = newVx2 * cos - vy2 * sin;
          ball2.vy = vy2 * cos + newVx2 * sin;
          
          // Separate balls
          const overlap = this.BALL_RADIUS * 2 - distance;
          const separationX = (dx / distance) * overlap * 0.5;
          const separationY = (dy / distance) * overlap * 0.5;
          
          ball1.x -= separationX;
          ball1.y -= separationY;
          ball2.x += separationX;
          ball2.y += separationY;
        }
      }
    }
  }

  private handleWallCollisions(balls: Ball[]): void {
    balls.forEach(ball => {
      if (ball.inPocket) return;
      
      // Left/right walls
      if (ball.x <= this.BALL_RADIUS || ball.x >= this.TABLE_WIDTH - this.BALL_RADIUS) {
        ball.vx *= -this.RESTITUTION;
        ball.x = Math.max(this.BALL_RADIUS, Math.min(this.TABLE_WIDTH - this.BALL_RADIUS, ball.x));
      }
      
      // Top/bottom walls
      if (ball.y <= this.BALL_RADIUS || ball.y >= this.TABLE_HEIGHT - this.BALL_RADIUS) {
        ball.vy *= -this.RESTITUTION;
        ball.y = Math.max(this.BALL_RADIUS, Math.min(this.TABLE_HEIGHT - this.BALL_RADIUS, ball.y));
      }
    });
  }

  private handlePockets(balls: Ball[]): void {
    balls.forEach(ball => {
      if (ball.inPocket) return;
      
      for (const pocket of this.pockets) {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.POCKET_RADIUS) {
          console.log('[PHYSICS] Ball', ball.id, 'pocketed at', pocket);
          ball.inPocket = true;
          ball.vx = 0;
          ball.vy = 0;
          ball.wx = 0;
          ball.wy = 0;
          break;
        }
      }
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[POOL-PHYSICS] Request received');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { matchId, userId, shot } = await req.json();
    
    console.log('[POOL-PHYSICS] Processing shot for match:', matchId, 'user:', userId);

    // Get current match state
    const { data: match, error: matchError } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('[POOL-PHYSICS] Match not found:', matchError);
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify it's the player's turn
    if (match.turn_user_id !== userId) {
      console.log('[POOL-PHYSICS] Not player\'s turn');
      return new Response(
        JSON.stringify({ error: 'Not your turn' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulate physics
    const physics = new PoolPhysics();
    const newBalls = physics.simulateShot(match.balls || [], shot);
    
    // Determine next turn (simple alternation for now)
    const players = match.players || [];
    const currentPlayerIndex = players.findIndex((p: any) => p.userId === userId || p.user_id === userId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];
    const nextTurnUserId = nextPlayer?.userId || nextPlayer?.user_id;

    console.log('[POOL-PHYSICS] Next turn:', nextTurnUserId);

    // Update match state
    const { error: updateError } = await supabase
      .from('pool_matches')
      .update({
        balls: newBalls,
        turn_user_id: nextTurnUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('[POOL-PHYSICS] Error updating match:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update match' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[POOL-PHYSICS] Match updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        balls: newBalls,
        nextTurn: nextTurnUserId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[POOL-PHYSICS] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});