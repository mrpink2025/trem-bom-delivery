import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Active connections
const connections = new Map()
const matchConnections = new Map()

// Get user from token
async function getUserFromToken(token: string) {
  try {
    // Create client with the user token to verify authentication
    const userSupabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    
    // Verify the token by getting the user
    const { data: { user }, error } = await userSupabase.auth.getUser()
    if (error || !user) {
      console.error('[POOL-WS] Auth error:', error)
      throw new Error(`Invalid token: ${error?.message || 'No user found'}`)
    }
    
    return user
  } catch (error) {
    console.error('[POOL-WS] Exception getting user:', error)
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  const upgrade = req.headers.get('upgrade') || ''
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { status: 400 })
  }
  
  const { socket, response } = Deno.upgradeWebSocket(req)
  const connectionId = crypto.randomUUID()
  
  socket.onopen = () => {
    console.log(`[POOL-WS] Connection ${connectionId} opened`)
    connections.set(connectionId, { socket, userId: null, matchId: null })
  }
  
  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log(`[POOL-WS] ${msgId} Received:`, message.type)
      
      const connection = connections.get(connectionId)
      if (!connection) return
      
      switch (message.type) {
        case 'join_match':
          try {
            console.log(`[POOL-WS] ${msgId} User joining match ${message.matchId}`)
            console.log(`[POOL-WS] ${msgId} Token received: ${message.token ? 'Present' : 'Missing'}`)
            
            const user = await getUserFromToken(message.token)
            console.log(`[POOL-WS] ${msgId} User authenticated: ${user.id}`)
            
            connection.userId = user.id
            connection.matchId = message.matchId
            
            if (!matchConnections.has(message.matchId)) {
              matchConnections.set(message.matchId, new Set())
            }
            matchConnections.get(message.matchId)!.add(connectionId)
            
            console.log(`[POOL-WS] ${msgId} About to emit match state for: ${message.matchId}`)
            await emitMatchState(message.matchId)
            console.log(`[POOL-WS] ${msgId} User ${user.id} joined match ${message.matchId}`)
            
            // Send confirmation
            socket.send(JSON.stringify({
              type: 'join_confirmed',
              matchId: message.matchId,
              userId: user.id
            }))
          } catch (error) {
            console.error(`[POOL-WS] ${msgId} Error joining match:`, error)
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to join match',
              details: error.message 
            }))
          }
          break
          
        case 'ready':
          console.log(`[POOL-WS] ${msgId} User marking ready`)
          if (connection.userId && connection.matchId) {
            await emitMatchState(connection.matchId)
          }
          break
          
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }))
          break
      }
    } catch (error) {
      console.error('[POOL-WS] Error handling message:', error)
    }
  }
  
  socket.onclose = () => {
    console.log(`[POOL-WS] Connection ${connectionId} closed`)
    const connection = connections.get(connectionId)
    
    if (connection?.matchId) {
      const matchConns = matchConnections.get(connection.matchId)
      if (matchConns) {
        matchConns.delete(connectionId)
        if (matchConns.size === 0) {
          matchConnections.delete(connection.matchId)
        }
      }
    }
    
    connections.delete(connectionId)
  }
  
  return response
})