import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const activeConnections = new Map();
const matchRooms = new Map();
const pendingAcks = new Map();

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

function cleanupConnection(connectionId: string) {
  const connection = activeConnections.get(connectionId);
  if (connection) {
    const room = matchRooms.get(connection.matchId);
    if (room) {
      room.delete(connectionId);
    }
    activeConnections.delete(connectionId);
  }
}

async function maybeStartMatch(matchId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: match } = await supabase
    .from('pool_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match || match.status !== 'LOBBY') return;

  const players = match.game_state?.players || [];
  const allReady = players.length >= 2 && players.every((p: any) => p.ready && p.connected);

  if (allReady) {
    await supabase
      .from('pool_matches')
      .update({ status: 'COUNTDOWN' })
      .eq('id', matchId);

    broadcastToMatch(matchId, {
      type: 'start_countdown',
      seconds: 3
    });

    setTimeout(async () => {
      const gameState = {
        ...match.game_state,
        balls: [],
        phase: 'BREAK'
      };

      await supabase
        .from('pool_matches')
        .update({
          status: 'LIVE',
          game_state: gameState
        })
        .eq('id', matchId);

      broadcastToMatch(matchId, {
        type: 'match_started',
        state: gameState,
        matchId
      });
    }, 3000);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const connectionId = crypto.randomUUID();

  socket.onopen = () => {
    console.log(`Connection ${connectionId} opened`);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      switch (message.type) {
        case 'join_match':
          const { data: { user } } = await supabase.auth.getUser(message.token);
          if (!user) return;

          activeConnections.set(connectionId, {
            socket,
            userId: user.id,
            matchId: message.matchId,
            lastPing: Date.now()
          });

          if (!matchRooms.has(message.matchId)) {
            matchRooms.set(message.matchId, new Set());
          }
          matchRooms.get(message.matchId).add(connectionId);

          const { data: match } = await supabase
            .from('pool_matches')
            .select('*')
            .eq('id', message.matchId)
            .single();

          if (match) {
            const players = match.game_state?.players || [];
            const updatedPlayers = players.map((p: any) => ({
              ...p,
              connected: p.user_id === user.id ? true : p.connected
            }));

            await supabase
              .from('pool_matches')
              .update({
                game_state: {
                  ...match.game_state,
                  players: updatedPlayers
                }
              })
              .eq('id', message.matchId);

            broadcastToMatch(message.matchId, {
              type: 'room_state',
              match: { ...match, game_state: { ...match.game_state, players: updatedPlayers } }
            });

            if (match.status === 'LIVE') {
              socket.send(JSON.stringify({
                type: 'match_started',
                state: match.game_state,
                matchId: message.matchId
              }));
            }
          }
          break;

        case 'ready':
          const conn = activeConnections.get(connectionId);
          if (conn) {
            const { data: currentMatch } = await supabase
              .from('pool_matches')
              .select('*')
              .eq('id', conn.matchId)
              .single();

            if (currentMatch) {
              const players = currentMatch.game_state?.players || [];
              const updatedPlayers = players.map((p: any) => ({
                ...p,
                ready: p.user_id === conn.userId ? true : p.ready
              }));

              await supabase
                .from('pool_matches')
                .update({
                  game_state: {
                    ...currentMatch.game_state,
                    players: updatedPlayers
                  }
                })
                .eq('id', conn.matchId);

              broadcastToMatch(conn.matchId, {
                type: 'room_state',
                match: { ...currentMatch, game_state: { ...currentMatch.game_state, players: updatedPlayers } }
              });

              await maybeStartMatch(conn.matchId);
            }
          }
          break;

        case 'ping':
          const connection = activeConnections.get(connectionId);
          if (connection) connection.lastPing = Date.now();
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  };

  socket.onclose = () => {
    cleanupConnection(connectionId);
  };

  return response;
});