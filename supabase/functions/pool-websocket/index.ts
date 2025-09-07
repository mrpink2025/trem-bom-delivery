import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const activeConnections = new Map();
const matchRooms = new Map();
const pendingAcks = new Map<string, Set<string>>(); // eventId -> userIds faltantes
const socketIdByUserId = new Map<string, string>();

function broadcastToMatch(matchId: string, message: any) {
  const room = matchRooms.get(matchId);
  if (!room) return;

  for (const connectionId of room) {
    const connection = activeConnections.get(connectionId);
    if (connection?.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  }
}

function broadcastToUsers(userIds: string[], message: any) {
  for (const userId of userIds) {
    const socketId = socketIdByUserId.get(userId);
    if (socketId) {
      const connection = activeConnections.get(socketId);
      if (connection?.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify(message));
      }
    }
  }
}

function cleanupConnection(connectionId: string) {
  const connection = activeConnections.get(connectionId);
  if (connection) {
    const room = matchRooms.get(connection.matchId);
    if (room) {
      room.delete(connectionId);
    }
    socketIdByUserId.delete(connection.userId);
    activeConnections.delete(connectionId);
  }
}

async function getMatch(matchId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: match } = await supabase
    .from('pool_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  return match;
}

async function markPlayerConnected(matchId: string, userId: string, connected: boolean) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const match = await getMatch(matchId);
  if (!match) return;

  const players = match.game_state?.players || [];
  const updatedPlayers = players.map((p: any) => ({
    ...p,
    connected: p.user_id === userId ? connected : p.connected
  }));

  await supabase
    .from('pool_matches')
    .update({
      game_state: {
        ...match.game_state,
        players: updatedPlayers
      }
    })
    .eq('id', matchId);
}

async function setPlayerReady(matchId: string, userId: string, ready: boolean) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const match = await getMatch(matchId);
  if (!match) return;

  const players = match.game_state?.players || [];
  const updatedPlayers = players.map((p: any) => ({
    ...p,
    ready: p.user_id === userId ? ready : p.ready
  }));

  await supabase
    .from('pool_matches')
    .update({
      game_state: {
        ...match.game_state,
        players: updatedPlayers
      }
    })
    .eq('id', matchId);
}

async function updateStatus(matchId: string, status: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  await supabase
    .from('pool_matches')
    .update({ status })
    .eq('id', matchId);
}

function canStart(match: any): boolean {
  if (!match || match.status !== 'LOBBY') return false;
  const players = match.game_state?.players || [];
  return players.length === 2 && 
         players.every((p: any) => p.connected && p.ready);
}

async function emitRoomState(matchId: string) {
  const match = await getMatch(matchId);
  if (match) {
    broadcastToMatch(matchId, {
      type: 'room_state',
      match
    });
  }
}

async function buildAndPersistInitialState(match: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const eventId = crypto.randomUUID();
  const seed = crypto.randomUUID();
  
  // Create initial game state with balls positioned
  const gameState = {
    ...match.game_state,
    balls: [
      // Cue ball
      { id: 0, x: 200, y: 300, vx: 0, vy: 0, wx: 0, wy: 0, color: '#ffffff', type: 'CUE', inPocket: false },
      // 8-ball
      { id: 8, x: 600, y: 300, vx: 0, vy: 0, wx: 0, wy: 0, color: '#000000', number: 8, type: 'EIGHT', inPocket: false },
      // Other balls (simplified setup)
      ...Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        x: 580 + (i % 3) * 20,
        y: 280 + Math.floor(i / 3) * 20,
        vx: 0, vy: 0, wx: 0, wy: 0,
        color: `hsl(${i * 40}, 70%, 50%)`,
        number: i + 1,
        type: 'SOLID',
        inPocket: false
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        id: i + 9,
        x: 620 + (i % 3) * 20,
        y: 280 + Math.floor(i / 3) * 20,
        vx: 0, vy: 0, wx: 0, wy: 0,
        color: `hsl(${i * 40 + 20}, 70%, 50%)`,
        number: i + 9,
        type: 'STRIPE',
        inPocket: false
      }))
    ],
    phase: 'BREAK',
    turnUserId: match.creator_user_id,
    seed
  };

  await supabase
    .from('pool_matches')
    .update({
      game_state: gameState
    })
    .eq('id', match.id);

  return { state: gameState, eventId };
}

async function startCountdownAndLive(matchId: string) {
  const requestId = `start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[POOL-WS] ${requestId} Starting countdown for match ${matchId}`);
  
  const match = await getMatch(matchId);
  if (!canStart(match)) {
    console.log(`[POOL-WS] ${requestId} Cannot start - conditions not met`);
    return;
  }
  
  await updateStatus(matchId, 'COUNTDOWN');
  const eventId = crypto.randomUUID();
  
  console.log(`[POOL-WS] ${requestId} Broadcasting countdown with eventId ${eventId}`);
  broadcastToMatch(matchId, {
    type: 'start_countdown',
    seconds: 3,
    eventId
  });

  setTimeout(async () => {
    const currentMatch = await getMatch(matchId);
    if (currentMatch?.status !== 'COUNTDOWN') {
      console.log(`[POOL-WS] ${requestId} Countdown aborted - status changed`);
      return;
    }
    
    const { state, eventId: startEventId } = await buildAndPersistInitialState(currentMatch);
    await updateStatus(matchId, 'LIVE');
    
    const playerIds = currentMatch.game_state?.players?.map((p: any) => p.user_id) || [];
    const needAck = new Set<string>(playerIds);
    pendingAcks.set(startEventId, needAck);
    
    console.log(`[POOL-WS] ${requestId} Broadcasting match_started with eventId ${startEventId} to players ${playerIds.join(', ')}`);
    broadcastToMatch(matchId, {
      type: 'match_started',
      matchId,
      state,
      eventId: startEventId
    });
    
    scheduleReemit(startEventId, matchId, state, 0);
  }, 3000);
}

function scheduleReemit(eventId: string, matchId: string, state: any, attempt: number) {
  setTimeout(async () => {
    const left = pendingAcks.get(eventId);
    if (!left || left.size === 0) {
      console.log(`[POOL-WS] All players ACK'd event ${eventId}`);
      return;
    }
    
    if (attempt >= 2) {
      console.log(`[POOL-WS] Max retries reached for event ${eventId}, sending warning to ${[...left].join(', ')}`);
      broadcastToUsers([...left], {
        type: 'warning',
        code: 'CLIENT_NOT_ACKED',
        eventId
      });
      return;
    }
    
    console.log(`[POOL-WS] Re-emitting match_started (attempt ${attempt + 1}) for event ${eventId} to ${[...left].join(', ')}`);
    broadcastToUsers([...left], {
      type: 'match_started',
      matchId,
      state,
      eventId
    });
    
    scheduleReemit(eventId, matchId, state, attempt + 1);
  }, 2000);
}

// Watchdog to prevent stuck matches
setInterval(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Check for stuck matches
  const { data: stuckMatches } = await supabase
    .from('pool_matches')
    .select('*')
    .in('status', ['LOBBY', 'COUNTDOWN'])
    .lt('created_at', new Date(Date.now() - 300000).toISOString()); // 5 minutes old

  for (const match of stuckMatches || []) {
    if (match.status === 'COUNTDOWN') {
      const countdownStarted = new Date(match.updated_at).getTime();
      if (Date.now() - countdownStarted > 10000) { // 10 seconds
        console.log(`[POOL-WS] Watchdog: Resetting stuck COUNTDOWN match ${match.id}`);
        await updateStatus(match.id, 'LOBBY');
        await emitRoomState(match.id);
      }
    } else if (canStart(match)) {
      console.log(`[POOL-WS] Watchdog: Auto-starting ready match ${match.id}`);
      await startCountdownAndLive(match.id);
    }
  }
}, 2000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const connectionId = crypto.randomUUID();

  socket.onopen = () => {
    console.log(`[POOL-WS] Connection ${connectionId} opened`);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      const requestId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      switch (message.type) {
        case 'join_match':
          console.log(`[POOL-WS] ${requestId} User joining match ${message.matchId}`);
          
          const { data: { user } } = await supabase.auth.getUser(message.token);
          if (!user) {
            console.log(`[POOL-WS] ${requestId} Invalid token`);
            return;
          }

          activeConnections.set(connectionId, {
            socket,
            userId: user.id,
            matchId: message.matchId,
            lastPing: Date.now()
          });

          socketIdByUserId.set(user.id, connectionId);

          if (!matchRooms.has(message.matchId)) {
            matchRooms.set(message.matchId, new Set());
          }
          matchRooms.get(message.matchId).add(connectionId);

          await markPlayerConnected(message.matchId, user.id, true);
          await emitRoomState(message.matchId);
          
          // Check if match is already LIVE
          const currentMatch = await getMatch(message.matchId);
          if (currentMatch?.status === 'LIVE') {
            socket.send(JSON.stringify({
              type: 'match_started',
              state: currentMatch.game_state,
              matchId: message.matchId,
              eventId: crypto.randomUUID()
            }));
          }
          break;

        case 'ready':
          console.log(`[POOL-WS] ${requestId} User ready for match ${message.matchId}`);
          
          const conn = activeConnections.get(connectionId);
          if (conn) {
            await setPlayerReady(message.matchId, conn.userId, true);
            await emitRoomState(message.matchId);
            await startCountdownAndLive(message.matchId);
          }
          break;

        case 'ack':
          console.log(`[POOL-WS] ${requestId} ACK received for event ${message.eventId}`);
          
          const connection = activeConnections.get(connectionId);
          if (connection) {
            const set = pendingAcks.get(message.eventId);
            if (set) {
              set.delete(connection.userId);
              if (set.size === 0) {
                pendingAcks.delete(message.eventId);
                console.log(`[POOL-WS] ${requestId} All players ACK'd event ${message.eventId}`);
              }
            }
          }
          break;

        case 'ping':
          const pingConnection = activeConnections.get(connectionId);
          if (pingConnection) pingConnection.lastPing = Date.now();
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('[POOL-WS] Message handling error:', error);
    }
  };

  socket.onclose = async () => {
    const connection = activeConnections.get(connectionId);
    if (connection) {
      await markPlayerConnected(connection.matchId, connection.userId, false);
      await emitRoomState(connection.matchId);
    }
    cleanupConnection(connectionId);
    console.log(`[POOL-WS] Connection ${connectionId} closed`);
  };

  return response;
});
