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

  const body = await req.json().catch(()=> ({}));
  if (body?.type !== 'SHOOT') return json(req, 422, { error:'INVALID_TYPE' });

  const { matchId, userId, dir, power, spin, aimPoint } = body;
  // Carrega estado atual para simular
  const { data:match, error } = await sb.from('pool_matches').select('id, game_state, rules').eq('id', matchId).single();
  if (error || !match) return json(req, 404, { error:'MATCH_NOT_FOUND' });

  const state = match.game_state || {};
  const rules = match.rules || {};
  
  // ======= SIMULAÇÃO (placeholder determinística) =======
  // Aqui você pode plugar seu motor real. Vamos retornar frames de exemplo para validar o pipeline.
  const frames = [];
  const N = 50; // 50 frames (~400ms se enviar a cada 8ms)
  
  // Estado inicial das bolas (se ainda não existe, criar um básico)
  let balls = state?.balls || [
    { id: 0, x: 200, y: 200, vx: 0, vy: 0, type: 'CUE', number: 0, inPocket: false, color: '#ffffff' },
    { id: 1, x: 600, y: 200, vx: 0, vy: 0, type: 'SOLID', number: 1, inPocket: false, color: '#ffff00' },
    { id: 2, x: 620, y: 185, vx: 0, vy: 0, type: 'SOLID', number: 2, inPocket: false, color: '#0000ff' },
    { id: 3, x: 620, y: 215, vx: 0, vy: 0, type: 'SOLID', number: 3, inPocket: false, color: '#ff0000' },
    { id: 4, x: 640, y: 170, vx: 0, vy: 0, type: 'SOLID', number: 4, inPocket: false, color: '#800080' }
  ];

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // Exemplo: desloca a bola branca numa linha reta e desacelera
    const animatedBalls = balls.map(b => {
      if (b.number === 0) { // Cue ball
        const distance = power * 300; // Distância baseada na força
        const easing = t - 0.5 * t * t; // Easing para parar suavemente
        return {
          ...b,
          x: b.x + Math.cos(dir) * distance * easing,
          y: b.y + Math.sin(dir) * distance * easing
        };
      }
      return b;
    });

    frames.push({
      t,
      balls: animatedBalls,
      sounds: (i % 15 === 0 && i > 0 ? ['tick'] : [])
    });
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
    gamePhase: 'PLAY',
    ballInHand: false
  };
  
  return json(req, 200, response);
});