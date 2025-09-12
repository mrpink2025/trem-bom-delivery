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
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'POST') return json(req, 405, { error:'METHOD_NOT_ALLOWED' });

    // Simplificada: apenas verificar que é chamada interna (opcional)
    const isInternal = req.headers.get('x-internal') === '1';
    console.log('🎯 Physics called with internal header:', isInternal);

    const body = await req.json().catch(() => ({}));
    if (body?.type !== 'SHOOT') return json(req, 422, { error:'INVALID_TYPE' });

    const { matchId, userId, dir, power, spin, aimPoint } = body;
    console.log('🎱 Physics simulation request:', { matchId, userId, dir, power });
    
    // Carrega estado atual para simular
    const { data:match, error } = await sb.from('pool_matches').select('id, game_state, rules, creator_user_id, opponent_user_id').eq('id', matchId).single();
    if (error || !match) {
      console.error('❌ Match not found:', error);
      return json(req, 404, { error:'MATCH_NOT_FOUND' });
    }

    const state = match.game_state || {};
    const rules = match.rules || {};
  
  // ======= MOTOR DE FÍSICA REALISTA =======
  
    // Configurações da mesa e física - CALIBRADO PARA MÁXIMO REALISMO
    const TABLE_WIDTH = 800;
    const TABLE_HEIGHT = 400;
    const BALL_RADIUS = 12;
    const POCKET_RADIUS = 20;
    const RAIL_THICKNESS = 10;
    const FRICTION = 0.996; // Fricção reduzida para movimento mais longo e fluido
    const BOUNCE_DAMPING = 0.8; // Rebote nas bordas mais realista
    const MIN_SPEED = 1.5; // Parar bolas mais lentas
    const MAX_SPEED = 150; // Velocidade máxima aumentada significativamente
    const RESTITUTION = 0.92; // Coeficiente de restituição para colisões realistas
  
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
  
    // Aplicar força inicial na bola branca (cue ball) - FORÇA AUMENTADA
    const cueBall = balls.find(b => b.number === 0);
    if (cueBall && !cueBall.inPocket) {
      // Força exponencial para tacadas mais potentes
      const speed = Math.min(Math.pow(power, 0.7) * MAX_SPEED, MAX_SPEED);
      cueBall.vx = Math.cos(dir) * speed;
      cueBall.vy = Math.sin(dir) * speed;
      console.log('🎯 Applied force to cue ball:', { power, speed, dir });
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
    
    // Física corrigida: Impulso com coeficiente de restituição
    const impulse = -(1 + RESTITUTION) * dvn / 2;
    
    // Aplicar impulso (conservação de momento)
    ball1.vx -= impulse * nx;
    ball1.vy -= impulse * ny;
    ball2.vx += impulse * nx;
    ball2.vy += impulse * ny;
    
    return Math.abs(impulse); // Retorna força da colisão para sons
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
    let ballCollisionForce = 0;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (ballsColliding(balls[i], balls[j])) {
          const force = resolveBallCollision(balls[i], balls[j]);
          if (force > 5) { // Som baseado na força real
            frameCollisionSounds.push('ball');
            ballCollisionForce = Math.max(ballCollisionForce, force);
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
  
  // ===== LÓGICA DE TURNOS BASEADA EM REGRAS DE SINUCA 8-BALL =====
  
  // Determinar próximo jogador baseado no resultado da jogada
  function determineNextPlayer(currentUserId, pocketedBalls, matchData) {
    const creator = matchData.creator_user_id;
    const opponent = matchData.opponent_user_id;
    
    if (!creator || !opponent) return currentUserId; // Fallback
    
    const otherPlayerId = currentUserId === creator ? opponent : creator;
    
    // Se embolsou alguma bola válida, continua jogando
    if (pocketedBalls.length > 0) {
      return currentUserId; // Continua jogando
    }
    
    // Se não embolsou nada, perde a vez
    return otherPlayerId;
  }
  
  // Detectar faltas comuns
  function detectFouls(cueBall, pocketedBalls) {
    const fouls = [];
    
    // Falta: bola branca embolsada
    if (cueBall && cueBall.inPocket) {
      fouls.push('CUE_BALL_POCKETED');
    }
    
    // Adicionar mais regras de falta conforme necessário
    return fouls;
  }
  
  const cueBallFinal = balls.find(b => b.number === 0);
  const detectedFouls = detectFouls(cueBallFinal, pocketedBalls);
  
  // Determinar próximo jogador usando a lógica implementada
  let nextPlayer = determineNextPlayer(userId, pocketedBalls, match);
  
  // Se há faltas, o oponente joga próximo
  if (detectedFouls.length > 0) {
    const otherPlayer = userId === match.creator_user_id ? match.opponent_user_id : match.creator_user_id;
    nextPlayer = otherPlayer;
  }
  
    // CORRIGIDO: usar índice compatível com Deno ao invés de .at(-1)
    const lastFrame = frames.length > 0 ? frames[frames.length - 1] : null;
    if (!lastFrame) {
      console.error('❌ No frames generated in physics simulation');
      return json(req, 500, { error: 'NO_SIMULATION_FRAMES' });
    }

    const finalState = { 
      ...state, 
      balls: lastFrame.balls,
      turnUserId: nextPlayer,
      fouls: detectedFouls
    };

    const response = {
      frames,
      finalState,
      fouls: detectedFouls,
      pockets: pocketedBalls.map(ballNum => ({ ballNumber: ballNum })),
      nextTurnUserId: nextPlayer,
      gamePhase: pocketedBalls.length > 0 ? 'PLAYING' : 'OPEN',
      ballInHand: detectedFouls.includes('CUE_BALL_POCKETED'),
      collisionSounds: collisionSounds
    };

    console.log('✅ Physics simulation complete:', {
      framesGenerated: frames.length,
      pocketedBalls: pocketedBalls.length,
      nextPlayer,
      fouls: detectedFouls.length
    });

    return json(req, 200, response);
    
  } catch (error) {
    console.error('❌ Physics simulation error:', error);
    return json(req, 500, { 
      error: 'PHYSICS_SIMULATION_ERROR', 
      details: error.message || 'Unknown error' 
    });
  }
});