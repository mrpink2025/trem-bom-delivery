import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types
interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  wx: number
  wy: number
  color: string
  number?: number
  inPocket: boolean
  type: 'SOLID' | 'STRIPE' | 'CUE' | 'EIGHT'
}

interface PoolPlayer {
  userId: string
  seat: number
  connected: boolean
  ready: boolean
  mmr?: number
  group?: 'SOLID' | 'STRIPE'
}

interface PoolMatch {
  id: string
  status: 'LOBBY' | 'COUNTDOWN' | 'LIVE' | 'FINISHED' | 'CANCELLED'
  mode: 'RANKED' | 'CASUAL'
  buyIn: number
  players: PoolPlayer[]
  createdBy: string
  rules: {
    shotClockSec: number
    assistLevel: 'NONE' | 'SHORT'
  }
  gameState?: {
    balls: Ball[]
    turnUserId: string
    gamePhase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL'
    ballInHand: boolean
    shotClock: number
  }
  createdAt: string
}

// Connection Manager
const activeConnections = new Map<string, {
  socket: WebSocket
  userId: string
  matchId?: string
  lastPing: number
}>()

const matchRooms = new Map<string, Set<string>>()

// Physics Engine
class PhysicsEngine {
  private readonly BALL_RADIUS = 12
  private readonly TABLE_WIDTH = 800
  private readonly TABLE_HEIGHT = 400

  createStandardRack(): Ball[] {
    const balls: Ball[] = []
    
    // Cue ball
    balls.push({
      id: 0,
      x: this.TABLE_WIDTH * 0.25,
      y: this.TABLE_HEIGHT * 0.5,
      vx: 0, vy: 0, wx: 0, wy: 0,
      color: '#FFFFFF',
      inPocket: false,
      type: 'CUE'
    })

    // 8-ball rack
    const rackX = this.TABLE_WIDTH * 0.75
    const rackY = this.TABLE_HEIGHT * 0.5
    const ballSpacing = this.BALL_RADIUS * 2.1

    const rackPositions = [
      [0, 0], // 1-ball (tip)
      [-ballSpacing/2, ballSpacing], [ballSpacing/2, ballSpacing], // row 2
      [-ballSpacing, ballSpacing*2], [0, ballSpacing*2], [ballSpacing, ballSpacing*2], // row 3
      [-ballSpacing*1.5, ballSpacing*3], [-ballSpacing/2, ballSpacing*3], 
      [ballSpacing/2, ballSpacing*3], [ballSpacing*1.5, ballSpacing*3], // row 4
      [-ballSpacing*2, ballSpacing*4], [-ballSpacing, ballSpacing*4], 
      [0, ballSpacing*4], [ballSpacing, ballSpacing*4], [ballSpacing*2, ballSpacing*4] // row 5
    ]

    const ballNumbers = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]
    
    rackPositions.forEach((pos, i) => {
      const ballNum = ballNumbers[i]
      balls.push({
        id: ballNum,
        x: rackX + pos[0],
        y: rackY + pos[1],
        vx: 0, vy: 0, wx: 0, wy: 0,
        color: ballNum === 8 ? '#000000' : (ballNum <= 7 ? '#FF6B6B' : '#4ECDC4'),
        number: ballNum,
        inPocket: false,
        type: ballNum === 8 ? 'EIGHT' : (ballNum <= 7 ? 'SOLID' : 'STRIPE')
      })
    })

    return balls
  }
}

// Utility functions
function broadcastToMatch(matchId: string, message: any, excludeConnectionId?: string) {
  const room = matchRooms.get(matchId)
  if (!room) return

  console.log(`[POOL-WEBSOCKET] Broadcasting to match ${matchId}:`, message.type, `(${room.size} connections)`)
  
  room.forEach(connectionId => {
    if (connectionId === excludeConnectionId) return
    const connection = activeConnections.get(connectionId)
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message))
      } catch (error) {
        console.error(`[POOL-WEBSOCKET] Error sending message to ${connectionId}:`, error)
        cleanupConnection(connectionId)
      }
    }
  })
}

function cleanupConnection(connectionId: string) {
  const connection = activeConnections.get(connectionId)
  if (connection && connection.matchId) {
    const room = matchRooms.get(connection.matchId)
    if (room) {
      room.delete(connectionId)
      
      // Mark player as disconnected and emit room state
      markPlayerConnected(connection.matchId, connection.userId, false)
      
      if (room.size === 0) {
        matchRooms.delete(connection.matchId)
      }
    }
  }
  activeConnections.delete(connectionId)
}

async function markPlayerConnected(matchId: string, userId: string, connected: boolean) {
  try {
    console.log(`[POOL-WEBSOCKET] Marking player ${userId} as ${connected ? 'connected' : 'disconnected'} in match ${matchId}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use the new RPC function instead of direct update
    const { error } = await supabase.rpc('update_player_connection', {
      match_id_param: matchId,
      user_id_param: userId,
      connected_param: connected
    })

    if (error) {
      console.error('[POOL-WEBSOCKET] Error updating player connection:', error)
      return
    }

    console.log(`[POOL-WEBSOCKET] Player ${userId} connection updated successfully`)

    // Emit room state
    await emitRoomState(matchId)

  } catch (error) {
    console.error('[POOL-WEBSOCKET] Exception updating player connection:', error)
  }
}

async function emitRoomState(matchId: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: match, error } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (error || !match) {
      console.error('[POOL-WEBSOCKET] Error fetching match for room state:', error)
      return
    }

    console.log(`[POOL-WEBSOCKET] Emitting room_state for match ${matchId}, status: ${match.status}`)
    
    const sanitizedMatch: PoolMatch = {
      id: match.id,
      status: match.status,
      players: match.players || [],
      mode: match.mode,
      buyIn: match.buy_in,
      createdBy: match.created_by,
      rules: match.rules || { shotClockSec: 60, assistLevel: 'SHORT' },
      gameState: match.game_state,
      createdAt: match.created_at
    }

    broadcastToMatch(matchId, {
      type: 'room_state',
      match: sanitizedMatch
    })

    // Check if we should start the match
    await maybeStartMatch(matchId, match)
  } catch (error) {
    console.error('[POOL-WEBSOCKET] Exception emitting room state:', error)
  }
}

async function maybeStartMatch(matchId: string, match: any) {
  try {
    // Gate conditions for starting
    if (match.status !== 'LOBBY') {
      console.log(`[POOL-WEBSOCKET] Match ${matchId} not in LOBBY (${match.status}), skipping start check`)
      return
    }

    const players = match.players || []
    if (players.length !== 2) {
      console.log(`[POOL-WEBSOCKET] Match ${matchId} needs exactly 2 players, has ${players.length}`)
      return
    }

    const allConnected = players.every((p: any) => p.connected === true)
    const allReady = players.every((p: any) => p.ready === true)

    console.log(`[POOL-WEBSOCKET] Match ${matchId} readiness check:`, {
      playersCount: players.length,
      allConnected,
      allReady,
      players: players.map((p: any) => ({
        userId: p.userId,
        connected: p.connected,
        ready: p.ready
      }))
    })

    if (!allConnected || !allReady) {
      return
    }

    console.log(`[POOL-WEBSOCKET] 🚀 Starting countdown for match ${matchId}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update to COUNTDOWN status
    const { error: updateError } = await supabase
      .from('pool_matches')
      .update({ status: 'COUNTDOWN' })
      .eq('id', matchId)

    if (updateError) {
      console.error('[POOL-WEBSOCKET] Error updating match to COUNTDOWN:', updateError)
      return
    }

    console.log(`[POOL-WEBSOCKET] ⏰ Broadcasting countdown to match ${matchId}`)

    // Broadcast countdown start
    broadcastToMatch(matchId, {
      type: 'start_countdown',
      seconds: 3
    })

    // Start match after countdown
    setTimeout(async () => {
      await startMatch(matchId)
    }, 3000)

  } catch (error) {
    console.error('[POOL-WEBSOCKET] Exception in maybeStartMatch:', error)
  }
}

async function startMatch(matchId: string) {
  try {
    console.log(`[POOL-WEBSOCKET] 🎮 Starting match ${matchId}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch current match to verify it's still in COUNTDOWN
    const { data: match, error: fetchError } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (fetchError || !match) {
      console.error('[POOL-WEBSOCKET] Error fetching match for start:', fetchError)
      return
    }

    if (match.status !== 'COUNTDOWN') {
      console.log(`[POOL-WEBSOCKET] Match ${matchId} no longer in COUNTDOWN (${match.status}), aborting start`)
      return
    }

    // Generate initial game state
    const physics = new PhysicsEngine()
    const balls = physics.createStandardRack()
    
    // Set first player as the one who breaks
    const players = match.players || []
    const breakPlayer = players[0] // First player breaks

    const initialGameState = {
      balls,
      turnUserId: breakPlayer.userId,
      gamePhase: 'BREAK' as const,
      ballInHand: false,
      shotClock: match.rules?.shotClockSec || 60
    }

    console.log(`[POOL-WEBSOCKET] 🎱 Initial game state created:`, {
      ballsCount: balls.length,
      turnUserId: breakPlayer.userId,
      gamePhase: initialGameState.gamePhase
    })

    // Update match to LIVE with initial state
    const { error: updateError } = await supabase
      .from('pool_matches')
      .update({
        status: 'LIVE',
        game_state: initialGameState,
        started_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('[POOL-WEBSOCKET] Error updating match to LIVE:', updateError)
      return
    }

    console.log(`[POOL-WEBSOCKET] ✅ Match ${matchId} started successfully, broadcasting match_started`)

    // Broadcast match started with initial state
    const gameStartMessage = {
      type: 'match_started',
      matchId,
      state: {
        ...initialGameState,
        players: players.map((p: any) => ({
          ...p,
          group: undefined // Groups not assigned yet
        })),
        status: 'LIVE'
      }
    }

    console.log(`[POOL-WEBSOCKET] 📤 Broadcasting match_started:`, gameStartMessage)
    
    broadcastToMatch(matchId, gameStartMessage)

    // Also emit updated room state
    await emitRoomState(matchId)

  } catch (error) {
    console.error('[POOL-WEBSOCKET] Exception starting match:', error)
  }
}

// Main server
console.log('[POOL-WEBSOCKET] Starting server...')

serve(async (req) => {
  console.log('[POOL-WEBSOCKET] Request received:', req.method, req.url)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[POOL-WEBSOCKET] Handling CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }
  
  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""
  
  console.log('[POOL-WEBSOCKET] Upgrade header:', upgradeHeader)

  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.log('[POOL-WEBSOCKET] Not a websocket request, returning 426')
    return new Response("Expected websocket", { status: 426, headers: corsHeaders })
  }

  console.log('[POOL-WEBSOCKET] Upgrading to WebSocket...')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const connectionId = crypto.randomUUID()

    console.log(`[POOL-WEBSOCKET] WebSocket upgraded successfully, connection ID: ${connectionId}`)

    socket.onopen = () => {
      console.log(`[POOL-WEBSOCKET] ✅ Connection opened: ${connectionId}`)
      activeConnections.set(connectionId, {
        socket,
        userId: '',
        lastPing: Date.now()
      })
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log(`[POOL-WEBSOCKET] 📥 Message from ${connectionId}:`, message.type)

        switch (message.type) {
          case 'join_match': {
            const { matchId, token } = message
            console.log(`[POOL-WEBSOCKET] Processing join_match:`, {
              connectionId,
              matchId,
              hasToken: !!token
            })
            
            if (!matchId || !token) {
              console.error('[POOL-WEBSOCKET] Missing matchId or token')
              socket.send(JSON.stringify({ type: 'error', error: 'Missing matchId or token' }))
              return
            }

            try {
              // Verify JWT token
              const { data: { user }, error: authError } = await supabase.auth.getUser(token)
              if (authError || !user) {
                console.error('[POOL-WEBSOCKET] Auth error:', authError)
                socket.send(JSON.stringify({ type: 'error', error: 'UNAUTHENTICATED' }))
                socket.close()
                return
              }

              console.log(`[POOL-WEBSOCKET] ✅ User ${user.id} joining match ${matchId}`)

              // Update connection with user and match info
              const connection = activeConnections.get(connectionId)
              if (connection) {
                connection.userId = user.id
                connection.matchId = matchId
              }

              // Add to match room
              if (!matchRooms.has(matchId)) {
                matchRooms.set(matchId, new Set())
              }
              matchRooms.get(matchId)!.add(connectionId)

              // Mark player as connected
              await markPlayerConnected(matchId, user.id, true)

              // Send joined confirmation
              socket.send(JSON.stringify({ 
                type: 'joined', 
                matchId,
                userId: user.id
              }))

              // If match is already LIVE, send current state
              const { data: match } = await supabase
                .from('pool_matches')
                .select('*')
                .eq('id', matchId)
                .single()

              if (match?.status === 'LIVE' && match.game_state) {
                console.log(`[POOL-WEBSOCKET] 🎮 Sending existing LIVE game state to ${user.id}`)
                socket.send(JSON.stringify({
                  type: 'match_started',
                  matchId,
                  state: match.game_state
                }))
              }

            } catch (error) {
              console.error('[POOL-WEBSOCKET] Error in join_match:', error)
              socket.send(JSON.stringify({ type: 'error', error: 'JOIN_FAILED' }))
            }
            break
          }

          case 'ready': {
            const connection = activeConnections.get(connectionId)
            console.log(`[POOL-WEBSOCKET] 🎯 Received ready from ${connectionId}:`, {
              hasConnection: !!connection,
              userId: connection?.userId,
              matchId: connection?.matchId
            })
            
            if (!connection?.matchId || !connection?.userId) {
              console.error('[POOL-WEBSOCKET] Ready failed - connection not in match')
              socket.send(JSON.stringify({ type: 'error', error: 'Not in match' }))
              return
            }

            try {
              console.log(`[POOL-WEBSOCKET] Setting user ${connection.userId} ready in match ${connection.matchId}`)
              
              // Use RPC function to set ready status
              const { error } = await supabase.rpc('set_player_ready', {
                match_id_param: connection.matchId,
                user_id_param: connection.userId,
                ready_param: true
              })

              if (error) {
                console.error('[POOL-WEBSOCKET] Error setting player ready:', error)
                socket.send(JSON.stringify({ type: 'error', error: 'Failed to set ready' }))
                return
              }

              console.log(`[POOL-WEBSOCKET] ✅ Player ${connection.userId} marked as ready, emitting room state`)
              
              // Emit updated room state which will trigger maybeStartMatch
              await emitRoomState(connection.matchId)

            } catch (error) {
              console.error('[POOL-WEBSOCKET] Error in ready handler:', error)
              socket.send(JSON.stringify({ type: 'error', error: 'READY_FAILED' }))
            }
            break
          }

          case 'ping': {
            const connection = activeConnections.get(connectionId)
            if (connection) {
              connection.lastPing = Date.now()
              socket.send(JSON.stringify({ type: 'pong' }))
            }
            break
          }

          default:
            console.log(`[POOL-WEBSOCKET] ⚠️ Unknown message type: ${message.type}`)
        }
      } catch (error) {
        console.error(`[POOL-WEBSOCKET] Error parsing message:`, error)
      }
    }

    socket.onclose = (event) => {
      console.log(`[POOL-WEBSOCKET] 🔌 Connection closed: ${connectionId}, code: ${event.code}, reason: ${event.reason}`)
      cleanupConnection(connectionId)
    }

    socket.onerror = (error) => {
      console.error(`[POOL-WEBSOCKET] ❌ Socket error for ${connectionId}:`, error)
    }

    return response
  } catch (error) {
    console.error('[POOL-WEBSOCKET] ❌ Error upgrading to WebSocket:', error)
    return new Response("WebSocket upgrade failed", { status: 500, headers: corsHeaders })
  }
})