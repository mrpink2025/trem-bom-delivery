import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Active connections map: connectionId -> { socket, userId, matchId, lastPing }
const activeConnections = new Map<string, {
  socket: WebSocket
  userId: string
  matchId: string | null
  lastPing: number
}>()

// Match rooms: matchId -> Set of connection IDs
const matchRooms = new Map<string, Set<string>>()

// Broadcast to all clients in a match
function broadcastToMatch(matchId: string, message: any, excludeConnectionId?: string) {
  const connectionIds = matchRooms.get(matchId)
  if (!connectionIds) return

  const messageStr = JSON.stringify(message)
  for (const connId of connectionIds) {
    if (connId !== excludeConnectionId) {
      const conn = activeConnections.get(connId)
      if (conn && conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(messageStr)
      }
    }
  }
}

// Clean up connection
function cleanupConnection(connectionId: string) {
  const conn = activeConnections.get(connectionId)
  if (!conn) return

  console.log(`[POOL-WS] Cleaning up connection ${connectionId}`)
  
  // Remove from match room
  if (conn.matchId) {
    const roomConnections = matchRooms.get(conn.matchId)
    if (roomConnections) {
      roomConnections.delete(connectionId)
      if (roomConnections.size === 0) {
        matchRooms.delete(conn.matchId)
      } else {
        // Notify others of disconnection
        broadcastToMatch(conn.matchId, {
          type: 'player_disconnected',
          userId: conn.userId
        }, connectionId)
      }
    }
  }

  activeConnections.delete(connectionId)
}

// Initialize pool game balls
function initializePoolBalls() {
  const balls = []
  
  // Cue ball (white)
  balls.push({
    id: 0,
    x: 200,
    y: 200,
    vx: 0,
    vy: 0,
    wx: 0,
    wy: 0,
    color: '#FFFFFF',
    number: 0,
    inPocket: false,
    type: 'CUE'
  })

  // Solid balls (1-7)
  const solidColors = ['#FFFF00', '#0000FF', '#FF0000', '#800080', '#FFA500', '#008000', '#8B0000']
  for (let i = 1; i <= 7; i++) {
    balls.push({
      id: i,
      x: 500 + (i % 3) * 30,
      y: 150 + Math.floor(i / 3) * 30,
      vx: 0,
      vy: 0,
      wx: 0,
      wy: 0,
      color: solidColors[i-1],
      number: i,
      inPocket: false,
      type: 'SOLID'
    })
  }

  // 8-ball (black)
  balls.push({
    id: 8,
    x: 550,
    y: 200,
    vx: 0,
    vy: 0,
    wx: 0,
    wy: 0,
    color: '#000000',
    number: 8,
    inPocket: false,
    type: 'EIGHT'
  })

  // Stripe balls (9-15)
  const stripeColors = ['#FFFF00', '#0000FF', '#FF0000', '#800080', '#FFA500', '#008000', '#8B0000']
  for (let i = 9; i <= 15; i++) {
    balls.push({
      id: i,
      x: 580 + ((i-9) % 3) * 30,
      y: 150 + Math.floor((i-9) / 3) * 30,
      vx: 0,
      vy: 0,
      wx: 0,
      wy: 0,
      color: stripeColors[i-9],
      number: i,
      inPocket: false,
      type: 'STRIPE'
    })
  }

  return balls
}

console.log('[POOL-WEBSOCKET] Server starting...')

serve(async (req) => {
  console.log('[POOL-WEBSOCKET] Request received:', req.method, req.url)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  const upgradeHeader = req.headers.get("upgrade") || ""
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected websocket", { status: 426, headers: corsHeaders })
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const connectionId = crypto.randomUUID()
    
    console.log(`[POOL-WS] WebSocket upgraded, connection: ${connectionId}`)

    socket.onopen = () => {
      console.log(`[POOL-WS] ✅ Connection ${connectionId} opened`)
      socket.send(JSON.stringify({ type: 'connected' }))
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log(`[POOL-WS] 📥 Message from ${connectionId}:`, message.type)

        switch (message.type) {
          case 'join_match':
            try {
              // Authenticate user
              if (!message.token) {
                socket.send(JSON.stringify({ type: 'error', message: 'No token provided' }))
                return
              }

              const { data: { user }, error: authError } = await supabase.auth.getUser(message.token)
              if (authError || !user) {
                console.error('[POOL-WS] Auth error:', authError)
                socket.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }))
                return
              }

              // Store connection
              activeConnections.set(connectionId, {
                socket,
                userId: user.id,
                matchId: message.matchId,
                lastPing: Date.now()
              })

              // Add to match room
              if (!matchRooms.has(message.matchId)) {
                matchRooms.set(message.matchId, new Set())
              }
              matchRooms.get(message.matchId)!.add(connectionId)

              console.log(`[POOL-WS] User ${user.id} joined match ${message.matchId}`)

              // Get current match state
              const { data: match, error: matchError } = await supabase
                .from('game_matches')
                .select(`
                  *,
                  match_players (
                    user_id,
                    seat,
                    ready,
                    connected,
                    profiles (full_name, mmr)
                  )
                `)
                .eq('id', message.matchId)
                .single()

              if (matchError) {
                console.error('[POOL-WS] Match fetch error:', matchError)
                socket.send(JSON.stringify({ type: 'error', message: 'Match not found' }))
                return
              }

              // Update player as connected
              await supabase
                .from('match_players')
                .update({ connected: true })
                .eq('match_id', message.matchId)
                .eq('user_id', user.id)

              // Send confirmation
              socket.send(JSON.stringify({ 
                type: 'joined', 
                matchId: message.matchId
              }))

              // Get updated match with players
              const { data: updatedMatch } = await supabase
                .from('game_matches')
                .select(`
                  *,
                  match_players (
                    user_id,
                    seat,
                    ready,
                    connected,
                    profiles (full_name, mmr)
                  )
                `)
                .eq('id', message.matchId)
                .single()

              if (updatedMatch) {
                // Send room state to all players
                const roomState = {
                  ...updatedMatch,
                  players: updatedMatch.match_players.map((mp: any) => ({
                    userId: mp.user_id,
                    seat: mp.seat,
                    connected: mp.connected,
                    ready: mp.ready,
                    mmr: mp.profiles?.mmr || 1000
                  }))
                }

                broadcastToMatch(message.matchId, {
                  type: 'room_state',
                  match: roomState
                })

                // Notify others of player joining
                broadcastToMatch(message.matchId, {
                  type: 'player_joined',
                  userId: user.id
                }, connectionId)
              }

            } catch (error) {
              console.error('[POOL-WS] Join match error:', error)
              socket.send(JSON.stringify({ type: 'error', message: 'Failed to join match' }))
            }
            break

          case 'ready':
            try {
              const conn = activeConnections.get(connectionId)
              if (!conn) return

              console.log(`[POOL-WS] Player ${conn.userId} set ready in match ${conn.matchId}`)

              // Update player ready status
              await supabase
                .from('match_players')
                .update({ ready: true })
                .eq('match_id', conn.matchId)
                .eq('user_id', conn.userId)

              // Check if all players are ready
              const { data: players } = await supabase
                .from('match_players')
                .select('user_id, ready, connected')
                .eq('match_id', conn.matchId)

              const allReady = players && players.length >= 2 && 
                             players.every((p: any) => p.ready && p.connected)

              if (allReady) {
                console.log(`[POOL-WS] All players ready in match ${conn.matchId}, starting countdown`)
                
                // Start countdown
                broadcastToMatch(conn.matchId!, {
                  type: 'start_countdown',
                  seconds: 3
                })

                // Wait 3 seconds then start match
                setTimeout(async () => {
                  try {
                    // Initialize game state
                    const balls = initializePoolBalls()
                    const gameState = {
                      balls,
                      turnUserId: players[0].user_id,
                      gamePhase: 'BREAK',
                      ballInHand: false,
                      shotClock: 60,
                      status: 'LIVE'
                    }

                    // Update match status and game state
                    const { error: updateError } = await supabase
                      .from('game_matches')
                      .update({ 
                        status: 'LIVE',
                        game_state: gameState,
                        started_at: new Date().toISOString()
                      })
                      .eq('id', conn.matchId)

                    if (updateError) {
                      console.error('[POOL-WS] Match update error:', updateError)
                      return
                    }

                    console.log(`[POOL-WS] Match ${conn.matchId} started successfully`)

                    // Send match_started event with full game state
                    broadcastToMatch(conn.matchId!, {
                      type: 'match_started',
                      state: gameState
                    })

                  } catch (error) {
                    console.error('[POOL-WS] Match start error:', error)
                  }
                }, 3000)
              } else {
                // Send updated room state
                const { data: match } = await supabase
                  .from('game_matches')
                  .select(`
                    *,
                    match_players (
                      user_id,
                      seat,
                      ready,
                      connected,
                      profiles (full_name, mmr)
                    )
                  `)
                  .eq('id', conn.matchId)
                  .single()

                if (match) {
                  const roomState = {
                    ...match,
                    players: match.match_players.map((mp: any) => ({
                      userId: mp.user_id,
                      seat: mp.seat,
                      connected: mp.connected,
                      ready: mp.ready,
                      mmr: mp.profiles?.mmr || 1000
                    }))
                  }

                  broadcastToMatch(conn.matchId!, {
                    type: 'room_state',
                    match: roomState
                  })
                }
              }

            } catch (error) {
              console.error('[POOL-WS] Ready error:', error)
              socket.send(JSON.stringify({ type: 'error', message: 'Failed to set ready' }))
            }
            break

          case 'shoot':
            // Handle shot logic (placeholder for now)
            console.log('[POOL-WS] Shot received:', message)
            break

          case 'place_cue_ball':
            // Handle cue ball placement (placeholder for now)
            console.log('[POOL-WS] Cue ball placement:', message)
            break

          case 'chat':
            const conn = activeConnections.get(connectionId)
            if (conn) {
              broadcastToMatch(conn.matchId!, {
                type: 'chat_message',
                userId: conn.userId,
                message: message.message,
                timestamp: Date.now()
              })
            }
            break

          case 'ping':
            const connection = activeConnections.get(connectionId)
            if (connection) {
              connection.lastPing = Date.now()
            }
            socket.send(JSON.stringify({ type: 'pong' }))
            break

          default:
            console.log('[POOL-WS] Unknown message type:', message.type)
        }

      } catch (error) {
        console.error(`[POOL-WS] Message handling error:`, error)
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Message processing failed' 
        }))
      }
    }

    socket.onclose = (event) => {
      console.log(`[POOL-WS] Connection ${connectionId} closed: ${event.code}`)
      cleanupConnection(connectionId)
    }

    socket.onerror = (error) => {
      console.error(`[POOL-WS] Connection ${connectionId} error:`, error)
      cleanupConnection(connectionId)
    }

    return response

  } catch (error) {
    console.error('[POOL-WS] WebSocket upgrade failed:', error)
    return new Response("WebSocket upgrade failed", { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})

// Cleanup stale connections every 30 seconds
setInterval(() => {
  const now = Date.now()
  const staleThreshold = 60000 // 1 minute

  for (const [connId, conn] of activeConnections.entries()) {
    if (now - conn.lastPing > staleThreshold) {
      console.log(`[POOL-WS] Cleaning stale connection: ${connId}`)
      cleanupConnection(connId)
    }
  }
}, 30000)