import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

//////////////////////////
// Utils de logs/ids
//////////////////////////
function rid() { return crypto.randomUUID(); }
function log(...args:any[]) { console.log('[pool-ws]', ...args); }
function warn(...args:any[]) { console.warn('[pool-ws]', ...args); }
function err(...args:any[]) { console.error('[pool-ws]', ...args); }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

//////////////////////////
// Integração física (Edge)
//////////////////////////
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PHYSICS_FN = `${SUPABASE_URL}/functions/v1/pool-game-physics`; // Edge física

async function simulateShotOnEdge(params: {
  matchId: string,
  userId: string,
  dir: number,
  power: number,     // 0..1
  spin: { sx:number, sy:number },
  aimPoint: { x:number, y:number }
}) {
  const requestId = rid();
  const res = await fetch(PHYSICS_FN, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${SERVICE_ROLE}`,
      'x-internal': '1',
      'x-request-id': requestId
    },
    body: JSON.stringify({ type: 'SHOOT', ...params })
  });
  if (!res.ok) {
    const msg = await res.text().catch(()=>'');
    throw new Error(`physics_500:${res.status}:${msg}`);
  }
  return await res.json(); // { frames: [...], finalState: {...}, fouls:[], pockets:[], nextTurnUserId, gamePhase }
}

//////////////////////////
// Helpers do Match/DB 
//////////////////////////
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getMatchById(matchId:string) {
  const { data, error } = await sb
    .from('pool_matches')
    .select('id, status, game_phase, creator_user_id, opponent_user_id, players, ball_in_hand, shot_clock, game_state, rules, join_code')
    .eq('id', matchId).single();
  if (error) throw new Error('db_get_match:'+error.message);
  return data;
}
async function saveFinalState(matchId:string, finalState:any, updates?:Partial<{game_phase:string, nextTurnUserId:string, ball_in_hand:boolean}>) {
  const patch:any = { game_state: finalState, updated_at: new Date().toISOString() };
  if (updates?.game_phase) patch.game_phase = updates.game_phase;
  if (typeof updates?.ball_in_hand === 'boolean') patch.ball_in_hand = updates.ball_in_hand;
  // Atualize turnUserId dentro do game_state
  if (updates?.nextTurnUserId) {
    patch.game_state = { ...(finalState||{}), turnUserId: updates.nextTurnUserId };
  }
  const { error } = await sb.from('pool_matches').update(patch).eq('id', matchId);
  if (error) throw new Error('db_save_state:'+error.message);
}

function canShoot(match:any, userId:string) {
  if (!match) return { ok:false, reason:'MATCH_NOT_FOUND' };
  if (match.status !== 'LIVE') return { ok:false, reason:'NOT_LIVE' };
  // permitir BREAK e PLAY
  const phaseOk = ['BREAK','PLAY','TURN'].includes((match.game_phase||'').toUpperCase());
  if (!phaseOk) return { ok:false, reason:`BAD_PHASE:${match.game_phase}` };
  const turnId = match?.game_state?.turnUserId;
  if (!turnId || turnId !== userId) return { ok:false, reason:'NOT_YOUR_TURN' };
  return { ok:true };
}

//////////////////////////
// Mapa: userId -> sockets 
//////////////////////////
const socketsByUser = new Map<string, Set<WebSocket>>();

function trackSocket(userId:string, ws:WebSocket) {
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  socketsByUser.get(userId)!.add(ws);
}
function untrackSocket(userId:string, ws:WebSocket) {
  socketsByUser.get(userId)?.delete(ws);
}

//////////////////////////
// Emissão de eventos
//////////////////////////
function emitToMatch(roomSockets:Set<WebSocket>, payload:any) {
  const msg = JSON.stringify(payload);
  for (const s of roomSockets) try { s.send(msg); } catch {}
}

//////////////////////////
// Rooms (matchId -> sockets)
//////////////////////////
const roomSockets = new Map<string, Set<WebSocket>>();

function joinRoom(matchId:string, ws:WebSocket) {
  if (!roomSockets.has(matchId)) roomSockets.set(matchId, new Set());
  roomSockets.get(matchId)!.add(ws);
}
function leaveAll(ws:WebSocket) {
  for (const set of roomSockets.values()) set.delete(ws);
}

// Active connections
const connections = new Map()
const matchConnections = new Map()

// Get user from token
async function getUserFromToken(token: string) {
  const logPrefix = `[POOL-WS] getUserFromToken(${token.substring(0, 20)}...)`
  
  try {
    console.log(`${logPrefix} Creating supabase client`)
    const userSupabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    
    console.log(`${logPrefix} Calling getUser()`)
    const { data: { user }, error } = await userSupabase.auth.getUser()
    
    if (error) {
      console.error(`${logPrefix} Auth error:`, error)
      throw new Error(`Invalid token: ${error.message}`)
    }
    
    if (!user) {
      console.error(`${logPrefix} No user found in token`)
      throw new Error('No user found in token')
    }
    
    console.log(`${logPrefix} Successfully authenticated user:`, user.id)
    return user
  } catch (error) {
    console.error(`${logPrefix} Exception:`, error)
    throw error
  }
}

// Broadcast to match
function broadcastToMatch(matchId: string, message: any) {
  const connectionIds = matchConnections.get(matchId)
  if (!connectionIds) return
  
  for (const connId of connectionIds) {
    const conn = connections.get(connId)
    if (conn?.socket?.readyState === WebSocket.OPEN) {
      try {
        conn.socket.send(JSON.stringify(message))
      } catch (error) {
        console.error(`[POOL-WS] Error sending to ${connId}:`, error)
      }
    }
  }
}

// Emit match state
async function emitMatchState(matchId: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  try {
    const { data: match, error } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single()
      
    if (error || !match) {
      console.error('[POOL-WS] Error fetching match:', error)
      return
    }
    
    // Send match data and game state
    broadcastToMatch(matchId, {
      type: 'match_data',
      match: {
        id: match.id,
        status: match.status,
        mode: match.mode,
        buy_in: match.buy_in,
        creator_user_id: match.creator_user_id,
        opponent_user_id: match.opponent_user_id,
        players: match.players || [],
        balls: match.balls || [],
        turn_user_id: match.turn_user_id,
        game_phase: match.game_phase,
        ball_in_hand: match.ball_in_hand,
        shot_clock: match.shot_clock,
        rules: match.rules,
        table_config: match.table_config,
        history: match.history,
        winner_user_ids: match.winner_user_ids,
        created_at: match.created_at,
        updated_at: match.updated_at
      }
    })
    
    console.log('[POOL-WS] Emitted match state for:', matchId)
  } catch (error) {
    console.error('[POOL-WS] Exception emitting match state:', error)
  }
}

serve(async (req) => {
  console.log(`[POOL-WS] Request received - Method: ${req.method}, URL: ${req.url}`)
  
  if (req.method === 'OPTIONS') {
    console.log(`[POOL-WS] CORS preflight request`)
    return new Response(null, { headers: corsHeaders })
  }
  
  const upgrade = req.headers.get('upgrade') || ''
  console.log(`[POOL-WS] Upgrade header: ${upgrade}`)
  
  if (upgrade.toLowerCase() !== 'websocket') {
    console.log(`[POOL-WS] Invalid upgrade header, expected websocket but got: ${upgrade}`)
    return new Response('Expected WebSocket connection', { status: 400 })
  }
  
  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const connectionId = crypto.randomUUID()
    console.log(`[POOL-WS] WebSocket upgrade successful, connection ID: ${connectionId}`)
    
    socket.onopen = () => {
      connections.set(connectionId, { socket, userId: null, matchId: null })
      console.log(`[POOL-WS] Connection ${connectionId} opened successfully`)
      
      // Send connection ready signal with a small delay to ensure stability
      setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({
              type: 'connection_ready',
              connectionId: connectionId,
              timestamp: Date.now()
            }))
            console.log(`[POOL-WS] Sent connection_ready to ${connectionId}`)
          } catch (error) {
            console.error(`[POOL-WS] Failed to send connection_ready:`, error)
          }
        }
      }, 50)
    }
  
  socket.onmessage = async (event) => {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      console.log(`[POOL-WS] ${msgId} Raw message received:`, event.data)
      const message = JSON.parse(event.data)
      console.log(`[POOL-WS] ${msgId} Parsed message:`, { type: message.type, matchId: message.matchId })
      
      const connection = connections.get(connectionId)
      if (!connection) {
        console.error(`[POOL-WS] ${msgId} No connection found for ${connectionId}`)
        return
      }
      
      switch (message.type) {
        case 'join_match':
          try {
            console.log(`[POOL-WS] ${msgId} Processing join_match for ${message.matchId}`)
            
            if (!message.token) {
              throw new Error('No token provided')
            }
            
            if (!message.matchId) {
              throw new Error('No matchId provided')
            }
            
            console.log(`[POOL-WS] ${msgId} Authenticating token...`)
            const user = await getUserFromToken(message.token)
            console.log(`[POOL-WS] ${msgId} User authenticated successfully: ${user.id}`)
            
            // Update connection
            connection.userId = user.id
            connection.matchId = message.matchId
            
            // Mark player as connected in database
            await markPlayerConnected(user.id, message.matchId, true)
            
            // Add to match connections
            if (!matchConnections.has(message.matchId)) {
              matchConnections.set(message.matchId, new Set())
              console.log(`[POOL-WS] ${msgId} Created new match connection set for ${message.matchId}`)
            }
            matchConnections.get(message.matchId)!.add(connectionId)
            console.log(`[POOL-WS] ${msgId} Added connection ${connectionId} to match ${message.matchId}`)
            
            // Send join confirmation with retry mechanism
            const joinConfirmation = {
              type: "join_confirmed",
              matchId: message.matchId,
              userId: user.id,
              timestamp: Date.now()
            }
            
            console.log(`[POOL-WS] ${msgId} Sending join confirmation:`, joinConfirmation)
            
            // Ensure message is sent before proceeding
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(joinConfirmation))
              
              // Give a small delay to ensure message delivery
              setTimeout(async () => {
                console.log(`[POOL-WS] ${msgId} Emitting match state after confirmation...`)
                await emitMatchState(message.matchId)
                console.log(`[POOL-WS] ${msgId} Join process completed successfully`)
              }, 100)
            } else {
              console.error(`[POOL-WS] ${msgId} Socket not ready for sending confirmation`)
              socket.send(JSON.stringify({
                type: "error",
                message: "Connection not ready"
              }))
            }
            
          } catch (error) {
            console.error(`[POOL-WS] ${msgId} Error in join_match:`, {
              error: error.message,
              stack: error.stack,
              matchId: message.matchId,
              hasToken: !!message.token
            })
            
            const errorMsg = {
              type: 'error', 
              message: 'Failed to join match',
              details: error.message
            }
            console.log(`[POOL-WS] ${msgId} Sending error response:`, errorMsg)
            socket.send(JSON.stringify(errorMsg))
          }
          break
          
        case 'ready':
          console.log(`[POOL-WS] ${msgId} Processing ready message from ${connection.userId}`)
          if (connection.userId && connection.matchId) {
            await markPlayerReady(connection.userId, connection.matchId)
            await emitMatchState(connection.matchId)
          }
          break
          
        case 'heartbeat':
          // Respond to heartbeat to confirm connection is alive
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'heartbeat_response',
              timestamp: Date.now()
            }));
          }
          break
          
        case 'shoot': {
          const shotId = rid();
          if (!userId || !matchId) {
            socket.send(JSON.stringify({ type:'shot_ack', shotId, accepted:false, reason:'NO_SESSION' }));
            return;
          }
          const match = await getMatchById(matchId);
          const gate = canShoot(match, userId);
          if (!gate.ok) {
            socket.send(JSON.stringify({ type:'shot_ack', shotId, accepted:false, reason:gate.reason }));
            return;
          }
          // validação básica do input
          const dir = Number(msg.dir); const power = Number(msg.power);
          const sx = Number(msg?.spin?.sx||0), sy = Number(msg?.spin?.sy||0);
          const aimPoint = msg?.aimPoint ?? null;
          if (!(power>0 && power<=1)) {
            socket.send(JSON.stringify({ type:'shot_ack', shotId, accepted:false, reason:'BAD_POWER' }));
            return;
          }
          // ACK e início da simulação (broadcast)
          const sockets = roomSockets.get(matchId) || new Set<WebSocket>();
          emitToMatch(sockets, { type:'shot_ack', shotId, accepted:true, by:userId });
          emitToMatch(sockets, { type:'sim_start', shotId });

          try {
            const result = await simulateShotOnEdge({
              matchId, userId, dir, power, spin:{sx,sy}, aimPoint
            });
            // result: { frames:[], finalState:{...}, fouls:[], pockets:[], nextTurnUserId, gamePhase }
            // emite frames incrementalmente para animação
            const frames:any[] = result?.frames || [];
            for (const f of frames) {
              emitToMatch(sockets, { type:'sim_frame', shotId, t: f.t, balls: f.balls, sounds: f.sounds ?? [] });
              // throttling leve
              await new Promise(r => setTimeout(r, 8));
            }
            // salva estado final
            await saveFinalState(matchId, result.finalState, {
              nextTurnUserId: result.nextTurnUserId,
              game_phase: result.gamePhase || 'PLAY',
              ball_in_hand: !!result.ballInHand
            });
            // finaliza
            emitToMatch(sockets, { type:'sim_end', shotId, state: result.finalState, fouls: result.fouls||[], pockets: result.pockets||[], nextTurnUserId: result.nextTurnUserId });
          } catch (e) {
            err('simulateShotOnEdge failed', String(e));
            emitToMatch(sockets, { type:'warning', code:'PHYSICS_FAIL', message: String(e) });
            emitToMatch(sockets, { type:'sim_end', shotId, error:true });
          }
          break;
        }
          
        default:
          console.log(`[POOL-WS] ${msgId} Unknown message type: ${message.type}`)
          break
      }
    } catch (parseError) {
      console.error(`[POOL-WS] ${msgId} Error parsing/handling message:`, {
        error: parseError.message,
        rawData: event.data
      })
      
      try {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          details: parseError.message
        }))
      } catch (sendError) {
        console.error(`[POOL-WS] ${msgId} Failed to send error response:`, sendError)
      }
    }
  }
  
  // Add heartbeat mechanism to keep connection alive
  const heartbeatInterval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
        console.log(`[POOL-WS] Sent heartbeat to ${connectionId}`);
      } catch (error) {
        console.error(`[POOL-WS] Failed to send heartbeat to ${connectionId}:`, error);
        clearInterval(heartbeatInterval);
      }
    } else {
      console.log(`[POOL-WS] Socket not open, clearing heartbeat for ${connectionId}`);
      clearInterval(heartbeatInterval);
    }
  }, 15000); // Every 15 seconds

  socket.onerror = (error) => {
    console.error(`[POOL-WS] WebSocket error on connection ${connectionId}:`, error)
    clearInterval(heartbeatInterval);
  }
  
  socket.onclose = async (event) => {
    console.log(`[POOL-WS] Connection ${connectionId} closed - Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`)
    clearInterval(heartbeatInterval);
    
    const connection = connections.get(connectionId)
    if (connection && connection.matchId && connection.userId) {
      // Mark player as disconnected
      await markPlayerConnected(connection.userId, connection.matchId, false)
      
      const matchConnectionsSet = matchConnections.get(connection.matchId)
      if (matchConnectionsSet) {
        matchConnectionsSet.delete(connectionId)
        if (matchConnectionsSet.size === 0) {
          matchConnections.delete(connection.matchId)
        }
      }
    }
    
    connections.delete(connectionId)
    console.log(`[POOL-WS] Cleaned up connection ${connectionId}`)
  }
  
  return response
  
  } catch (wsError) {
    console.error(`[POOL-WS] WebSocket upgrade failed:`, wsError)
    return new Response('WebSocket upgrade failed', { status: 500 })
  }
})

async function markPlayerConnected(userId: string, matchId: string, connected: boolean) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    const { data: match, error: fetchError } = await supabase
      .from('pool_matches')
      .select('players')
      .eq('id', matchId)
      .single()
    
    if (fetchError || !match) {
      console.error('[POOL-WS] Error fetching match for player update:', fetchError)
      return
    }

    const players = match.players || []
    const updatedPlayers = players.map((p: any) => 
      (p.userId === userId || p.user_id === userId) 
        ? { ...p, connected } // Don't auto-ready on connect for WebSocket, let user click button
        : p
    )

    const { error: updateError } = await supabase
      .from('pool_matches')
      .update({ 
        players: updatedPlayers,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('[POOL-WS] Error updating player connection:', updateError)
      return
    }

    console.log(`[POOL-WS] Player ${userId} marked as connected: ${connected} in match ${matchId}`)
  } catch (error) {
    console.error('[POOL-WS] Error in markPlayerConnected:', error)
  }
}

async function markPlayerReady(userId: string, matchId: string) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    const { data: match, error: fetchError } = await supabase
      .from('pool_matches')
      .select('players')
      .eq('id', matchId)
      .single()
    
    if (fetchError || !match) {
      console.error('[POOL-WS] Error fetching match for ready update:', fetchError)
      return
    }

    const players = match.players || []
    const updatedPlayers = players.map((p: any) => 
      (p.userId === userId || p.user_id === userId) 
        ? { ...p, ready: true }
        : p
    )

    const { error: updateError } = await supabase
      .from('pool_matches')
      .update({ 
        players: updatedPlayers,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('[POOL-WS] Error updating player ready status:', updateError)
      return
    }

    console.log(`[POOL-WS] Player ${userId} marked as ready in match ${matchId}`)
    
    // Check if we should auto-start the match
    if (updatedPlayers.length === 2) {
      const allReady = updatedPlayers.every((p: any) => p.connected === true && p.ready === true)
      if (allReady) {
        console.log(`[POOL-WS] All players ready, triggering auto-start for match ${matchId}`)
        await triggerAutoStart(matchId)
      }
    }
  } catch (error) {
    console.error('[POOL-WS] Error in markPlayerReady:', error)
  }
}

async function triggerAutoStart(matchId: string) {
  try {
    console.log(`[POOL-WS] Triggering auto-start for match ${matchId}`)
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pool-match-auto-start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    console.log(`[POOL-WS] Auto-start result:`, result)
  } catch (error) {
    console.error('[POOL-WS] Error triggering auto-start:', error)
  }
}