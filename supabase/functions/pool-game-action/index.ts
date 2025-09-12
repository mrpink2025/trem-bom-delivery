import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

// Ajuste a URL da física (Edge)
const host = new URL(SUPABASE_URL).host; // ighllleypg....supabase.co
const FUNCTIONS_BASE = `https://${host.replace(".supabase.co", ".functions.supabase.co")}/functions/v1`;
const PHYSICS_FN = `${FUNCTIONS_BASE}/pool-game-physics`;

function cors(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": req.headers.get("access-control-request-headers")
      || "authorization, content-type",
    "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  };
}
function j(req:Request, status:number, body:unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json", ...cors(req) }});
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return j(req, 405, { error: "METHOD_NOT_ALLOWED" });

  // Auth JWT (verify_jwt=true no config.toml dessa função)
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return j(req, 401, { error: "UNAUTHENTICATED" });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i,''));
  if (userErr || !userData?.user?.id) return j(req, 401, { error: "UNAUTHENTICATED" });
  const userId = userData.user.id;

  const body = await req.json().catch(()=> ({}));
  if (body?.type !== "SHOOT") return j(req, 422, { error: "INVALID_TYPE" });

  const matchId  = body?.matchId;
  const dir      = Number(body?.dir);
  const power    = Number(body?.power);
  const sx       = Number(body?.spin?.sx || 0);
  const sy       = Number(body?.spin?.sy || 0);
  const aimPoint = body?.aimPoint || null;

  if (!matchId || !Number.isFinite(dir) || !(power>0 && power<=1)) {
    return j(req, 422, { error: "VALIDATION_ERROR" });
  }

  // Gate: checa match e vez do jogador
  const { data: m, error: me } = await sb.from('pool_matches')
     .select('id,status,game_state,creator_user_id,opponent_user_id,players')
     .eq('id', matchId).single();
  if (me || !m) return j(req, 404, { error: "MATCH_NOT_FOUND" });

  console.log('🎱 POOL-GAME-ACTION: Match data:', {
    matchId,
    status: m.status,
    gameState: !!m.game_state,
    turnUserId: m?.game_state?.turnUserId,
    requestUserId: userId
  });

  if ((m.status||'').toUpperCase() !== 'LIVE') return j(req, 409, { error: "NOT_LIVE" });
  const turn = m?.game_state?.turnUserId;
  if (turn && turn !== userId) {
    console.log('🎱 POOL-GAME-ACTION: Not user turn:', { turn, userId });
    return j(req, 409, { error: "NOT_YOUR_TURN" });
  }

  // Chama a física (Edge) com tratamento de erro melhorado
  let sim;
  try {
    console.log('🔄 Calling physics function:', { dir, power, matchId });
    const res = await fetch(PHYSICS_FN, {
      method: 'POST',
      headers: { 'content-type':'application/json', 'x-internal':'1' },
      body: JSON.stringify({ type:'SHOOT', matchId, userId, dir, power, spin:{sx,sy}, aimPoint })
    });
    
    if (!res.ok) {
      const txt = await res.text().catch(() => 'No response text');
      console.error('❌ Physics function failed:', { status: res.status, statusText: res.statusText, body: txt });
      return j(req, 500, { error: "PHYSICS_FAIL", status: res.status, details: txt });
    }
    
    sim = await res.json();
    console.log('✅ Physics simulation result:', { framesCount: sim.frames?.length, nextPlayer: sim.nextTurnUserId });
    
  } catch (fetchError) {
    console.error('❌ Network error calling physics:', fetchError);
    return j(req, 500, { error: "PHYSICS_NETWORK_ERROR", details: fetchError.message });
  }

  // Sequência base (segura e monotônica por created_at)
  const { data: lastSeqData } = await sb
    .from('pool_events').select('seq').eq('match_id', matchId)
    .order('seq', { ascending:false }).limit(1);
  const base = (lastSeqData?.[0]?.seq ?? 0) + 1;

  // Insere eventos (start -> frames (batch) -> end)
  const events = [
    { match_id: matchId, seq: base,   type: 'sim_start',  payload: { shotBy: userId } },
    { match_id: matchId, seq: base+1, type: 'sim_frames', payload: { frames: sim.frames || [] } },
    { match_id: matchId, seq: base+2, type: 'sim_end',    payload: { state: sim.finalState, fouls: sim.fouls||[], pockets: sim.pockets||[], nextTurnUserId: sim.nextTurnUserId || userId } },
  ];
  const { error: insErr } = await sb.from('pool_events').insert(events);
  if (insErr) return j(req, 500, { error: "INSERT_EVENTS_FAIL", details: insErr.message });

  // Persiste estado final na partida, ensuring turnUserId is always set
  // LÓGICA MELHORADA DE ALTERNÂNCIA DE TURNOS
  let nextTurnUserId = sim.nextTurnUserId;
  
  // Se a física não definiu próximo jogador, usar lógica de alternância
  if (!nextTurnUserId) {
    const currentPlayer = userId;
    const isCreator = currentPlayer === m.creator_user_id;
    
    // Se embolsou bolas (continua jogando) ou fez faltas (perde a vez)
    const pocketedBalls = sim.pockets?.length || 0;
    const hasFouls = sim.fouls?.length > 0;
    
    if (pocketedBalls > 0 && !hasFouls) {
      // Embolsou bolas válidas - continua jogando
      nextTurnUserId = currentPlayer;
    } else {
      // Não embolsou ou fez falta - passa a vez
      nextTurnUserId = isCreator ? m.opponent_user_id : m.creator_user_id;
    }
  }
  
  const finalStateWithTurn = {
    ...sim.finalState,
    turnUserId: nextTurnUserId || userId
  };
  
  const patch:any = { 
    game_state: finalStateWithTurn, 
    updated_at: new Date().toISOString() 
  };
  // Only set valid game_phase values that match database constraints
  const validPhases = ['OPEN', 'BREAK', 'PLAYING', 'FINISHED'];
  if (sim.gamePhase && validPhases.includes(sim.gamePhase)) {
    patch.game_phase = sim.gamePhase;
  }
  if (sim.ballInHand !== undefined) patch.ball_in_hand = !!sim.ballInHand;
  const { error: upErr } = await sb.from('pool_matches').update(patch).eq('id', matchId);
  if (upErr) return j(req, 500, { error: "SAVE_STATE_FAIL", details: upErr.message });

  return j(req, 200, { ok:true });
});