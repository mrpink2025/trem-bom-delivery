import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

function cors(req:Request) {
  const origin = req.headers.get('origin') || '*';
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": req.headers.get('access-control-request-headers') || "authorization, content-type, x-internal, x-request-id",
    "Vary": "Origin, Access-Control-Request-Headers, Access-Control-Request-Method"
  };
}
function json(req:Request, status:number, body:unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json", ...cors(req) }});
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST')    return json(req, 405, { error:'METHOD_NOT_ALLOWED' });

  // CORRIGIDO: verificação interna simples (verify_jwt=false)
  if (req.headers.get('x-internal') !== '1') {
    return json(req, 403, { error: 'FORBIDDEN' });
  }

  const body = await req.json().catch(()=> ({}));
  if (body?.type !== 'SHOOT') return json(req, 422, { error:'INVALID_TYPE' });

  const { matchId, userId, dir, power, spin, aimPoint } = body;
  // Carrega estado atual para simular
  const { data:match, error } = await sb.from('pool_matches').select('id, game_state, rules').eq('id', matchId).single();
  if (error || !match) return json(req, 404, { error:'MATCH_NOT_FOUND' });

  const state = match.game_state || {};
  const rules = match.rules || {};
  
  // ======= MOTOR DE FÍSICA REALISTA =======
  
  // Configurações da mesa e física
  const TABLE_WIDTH = 800;
  const TABLE_HEIGHT = 400;
  const BALL_RADIUS = 12;
  const POCKET_RADIUS = 20;
  const RAIL_THICKNESS = 10;
  const FRICTION = 0.985; // Fricção da mesa (0.985 = desaceleração gradual)
  const BOUNCE_DAMPING = 0.7; // Perda de energia no rebote
  const MIN_SPEED = 0.5; // Velocidade mínima antes de parar
  const MAX_SPEED = 20; // Velocidade máxima
  
  // Posições das caçapas (6 caçapas padrão de sinuca)
  const POCKETS = [
    { x: POCKET_RADIUS, y: POCKET_RADIUS }, // Superior esquerda
    { x: TABLE_WIDTH / 2, y: POCKET_RADIUS }, // Superior meio
    { x: TABLE_WIDTH - POCKET_RADIUS, y: POCKET_RADIUS }, // Superior direita
    { x: POCKET_RADIUS, y: TABLE_HEIGHT - POCKET_RADIUS }, // Inferior esquerda  
    { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - POCKET_RADIUS }, // Inferior meio
    { x: TABLE_WIDTH - POCKET_RADIUS, y: TABLE_HEIGHT - POCKET_RADIUS } // Inferior direita
  ];
  
  // Estado inicial das bolas
  let balls = state?.balls || [
    { id: 0, x: 200, y: 200, vx: 0, vy: 0, type: 'CUE', number: 0, inPocket: false, color: '#ffffff' },
    { id: 1, x: 600, y: 200, vx: 0, vy: 0, type: 'SOLID', number: 1, inPocket: false, color: '#ffff00' },
    { id: 2, x: 620, y: 185, vx: 0, vy: 0, type: 'SOLID', number: 2, inPocket: false, color: '#0000ff' },
    { id: 3, x: 620, y: 215, vx: 0, vy: 0, type: 'SOLID', number: 3, inPocket: false, color: '#ff0000' },
    { id: 4, x: 640, y: 170, vx: 0, vy: 0, type: 'SOLID', number: 4, inPocket: false, color: '#800080' },
    { id: 5, x: 640, y: 230, vx: 0, vy: 0, type: 'SOLID', number: 5, inPocket: false, color: '#ff6600' },
    { id: 6, x: 660, y: 155, vx: 0, vy: 0, type: 'SOLID', number: 6, inPocket: false, color: '#00aa00' },
    { id: 7, x: 660, y: 245, vx: 0, vy: 0, type: 'SOLID', number: 7, inPocket: false, color: '#660066' },
    { id: 8, x: 660, y: 200, vx: 0, vy: 0, type: 'EIGHT', number: 8, inPocket: false, color: '#000000' }
  ];
  
  // Aplicar força inicial na bola branca (cue ball)
  const cueBall = balls.find(b => b.number === 0);
  if (cueBall && !cueBall.inPocket) {
    const speed = Math.min(power * MAX_SPEED, MAX_SPEED);
    cueBall.vx = Math.cos(dir) * speed;
    cueBall.vy = Math.sin(dir) * speed;
  }
  
  // Funções auxiliares para física
  function distance(ball1, ball2) {
    return Math.sqrt((ball1.x - ball2.x) ** 2 + (ball1.y - ball2.y) ** 2);
  }
  
  function ballsColliding(ball1, ball2) {
    return distance(ball1, ball2) <= (BALL_RADIUS * 2) && !ball1.inPocket && !ball2.inPocket;
  }
  
  function resolveBallCollision(ball1, ball2) {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return; // Evitar divisão por zero
    
    // Normalizar vetor de colisão
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Separar bolas que estão sobrepostas
    const overlap = (BALL_RADIUS * 2) - dist;
    if (overlap > 0) {
      ball1.x -= nx * overlap * 0.5;
      ball1.y -= ny * overlap * 0.5;
      ball2.x += nx * overlap * 0.5;
      ball2.y += ny * overlap * 0.5;
    }
    
    // Velocidade relativa
    const dvx = ball2.vx - ball1.vx;
    const dvy = ball2.vy - ball1.vy;
    
    // Velocidade relativa na direção normal
    const dvn = dvx * nx + dvy * ny;
    
    // Não resolver se as bolas estão se afastando
    if (dvn > 0) return;
    
    // Impulso (assumindo massa igual)
    const impulse = 2 * dvn / 2;
    
    // Aplicar impulso
    ball1.vx += impulse * nx;
    ball1.vy += impulse * ny;
    ball2.vx -= impulse * nx;
    ball2.vy -= impulse * ny;
  }
  
  function checkWallCollisions(ball) {
    if (ball.inPocket) return;
    
    // Parede esquerda
    if (ball.x - BALL_RADIUS <= RAIL_THICKNESS) {
      ball.x = RAIL_THICKNESS + BALL_RADIUS;
      ball.vx = -ball.vx * BOUNCE_DAMPING;
      return 'wall';
    }
    
    // Parede direita
    if (ball.x + BALL_RADIUS >= TABLE_WIDTH - RAIL_THICKNESS) {
      ball.x = TABLE_WIDTH - RAIL_THICKNESS - BALL_RADIUS;
      ball.vx = -ball.vx * BOUNCE_DAMPING;
      return 'wall';
    }
    
    // Parede superior
    if (ball.y - BALL_RADIUS <= RAIL_THICKNESS) {
      ball.y = RAIL_THICKNESS + BALL_RADIUS;
      ball.vy = -ball.vy * BOUNCE_DAMPING;
      return 'wall';
    }
    
    // Parede inferior
    if (ball.y + BALL_RADIUS >= TABLE_HEIGHT - RAIL_THICKNESS) {
      ball.y = TABLE_HEIGHT - RAIL_THICKNESS - BALL_RADIUS;
      ball.vy = -ball.vy * BOUNCE_DAMPING;
      return 'wall';
    }
    
    return null;
  }
  
  function checkPocketCollisions(ball) {
    if (ball.inPocket) return false;
    
    for (const pocket of POCKETS) {
      const dist = distance(ball, pocket);
      if (dist <= POCKET_RADIUS - BALL_RADIUS * 0.5) {
        ball.inPocket = true;
        ball.vx = 0;
        ball.vy = 0;
        // Mover bola para fora da mesa (posição invisível)
        ball.x = -100;
        ball.y = -100;
        return true;
      }
    }
    return false;
  }
  
  // Simulação física frame por frame
  const frames = [];
  const FPS = 60;
  const SIMULATION_TIME = 3; // 3 segundos máximo
  const TOTAL_FRAMES = FPS * SIMULATION_TIME;
  const dt = 1 / FPS; // Delta time
  
  let pocketedBalls = [];
  let collisionSounds = [];
  
  for (let frame = 0; frame <= TOTAL_FRAMES; frame++) {
    const t = frame / TOTAL_FRAMES;
    let hasMovement = false;
    let frameCollisionSounds = [];
    
    // Atualizar posições das bolas
    for (const ball of balls) {
      if (ball.inPocket) continue;
      
      // Aplicar movimento
      ball.x += ball.vx * dt * 60; // Escalar para 60fps
      ball.y += ball.vy * dt * 60;
      
      // Aplicar fricção
      ball.vx *= FRICTION;
      ball.vy *= FRICTION;
      
      // Parar bolas muito lentas
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (speed < MIN_SPEED) {
        ball.vx = 0;
        ball.vy = 0;
      } else {
        hasMovement = true;
      }
      
      // Verificar colisões com paredes
      const wallHit = checkWallCollisions(ball);
      if (wallHit && speed > 2) {
        frameCollisionSounds.push('wall');
      }
      
      // Verificar colisões com caçapas
      const pocketed = checkPocketCollisions(ball);
      if (pocketed) {
        pocketedBalls.push(ball.number);
        frameCollisionSounds.push('pocket');
      }
    }
    
    // Verificar colisões entre bolas
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (ballsColliding(balls[i], balls[j])) {
          resolveBallCollision(balls[i], balls[j]);
          const speed1 = Math.sqrt(balls[i].vx ** 2 + balls[i].vy ** 2);
          const speed2 = Math.sqrt(balls[j].vx ** 2 + balls[j].vy ** 2);
          if (speed1 > 1 || speed2 > 1) {
            frameCollisionSounds.push('ball');
          }
        }
      }
    }
    
    // Criar frame
    frames.push({
      t,
      balls: balls.map(b => ({ ...b })), // Copiar estado das bolas
      sounds: frameCollisionSounds
    });
    
    // Parar simulação se não há movimento
    if (!hasMovement && frame > 30) { // Esperar pelo menos 30 frames
      break;
    }
  }
  
  const finalState = { 
    ...state, 
    balls: frames.at(-1)!.balls,
    turnUserId: userId // Poderia ser o próximo jogador
  };
  
  const response = {
    frames,
    finalState,
    fouls: [],
    pockets: [],
    nextTurnUserId: userId,   // ajuste sua regra de troca de vez
    gamePhase: 'OPEN',  // Use valid database enum value instead of 'PLAY'
    ballInHand: false
  };
  
  return json(req, 200, response);
});