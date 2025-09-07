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
      console.log(`[POOL-WS] Connection ${connectionId} opened successfully`)
      connections.set(connectionId, { socket, userId: null, matchId: null })
      
      // Send initial connection confirmation
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
            
            // Add to match connections
            if (!matchConnections.has(message.matchId)) {
              matchConnections.set(message.matchId, new Set())
              console.log(`[POOL-WS] ${msgId} Created new match connection set for ${message.matchId}`)
            }
            matchConnections.get(message.matchId)!.add(connectionId)
            console.log(`[POOL-WS] ${msgId} Added connection ${connectionId} to match ${message.matchId}`)
            
            // Send immediate confirmation
            const confirmMsg = {
              type: 'join_confirmed',
              matchId: message.matchId,
              userId: user.id
            }
            console.log(`[POOL-WS] ${msgId} Sending join confirmation:`, confirmMsg)
            socket.send(JSON.stringify(confirmMsg))
            
            // Emit match state
            console.log(`[POOL-WS] ${msgId} Emitting match state...`)
            await emitMatchState(message.matchId)
            console.log(`[POOL-WS] ${msgId} Join process completed successfully`)
            
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
            await emitMatchState(connection.matchId)
          }
          break
          
        case 'ping':
          console.log(`[POOL-WS] ${msgId} Ping received, sending pong`)
          socket.send(JSON.stringify({ type: 'pong' }))
          break
          
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
  
  socket.onerror = (error) => {
    console.error(`[POOL-WS] WebSocket error on connection ${connectionId}:`, error)
  }
  
  socket.onclose = (event) => {
    console.log(`[POOL-WS] Connection ${connectionId} closed - Code: ${event.code}, Reason: ${event.reason}`)
    const connection = connections.get(connectionId)
    
    if (connection?.matchId) {
      const matchConns = matchConnections.get(connection.matchId)
      if (matchConns) {
        matchConns.delete(connectionId)
        if (matchConns.size === 0) {
          matchConnections.delete(connection.matchId)
          console.log(`[POOL-WS] Removed empty match connection set for ${connection.matchId}`)
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