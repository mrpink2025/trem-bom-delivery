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

// Basic physics simulation for shots
function simulateShot(balls: any[], shotData: any) {
  // Find cue ball
  const cueBall = balls.find(b => b.type === 'CUE')
  if (!cueBall || cueBall.inPocket) return balls

  // Calculate initial velocity from shot parameters
  const velocity = shotData.power * 10 // Scale power to velocity
  const vx = Math.cos(shotData.dir) * velocity
  const vy = Math.sin(shotData.dir) * velocity

  // Create updated balls array
  const updatedBalls = balls.map(ball => ({ ...ball }))
  const cueBallIndex = updatedBalls.findIndex(b => b.type === 'CUE')
  
  // Set cue ball velocity
  updatedBalls[cueBallIndex].vx = vx
  updatedBalls[cueBallIndex].vy = vy

  // Simple collision detection and ball movement simulation
  const timeSteps = 100
  const dt = 0.02

  for (let step = 0; step < timeSteps; step++) {
    // Move all balls
    for (let i = 0; i < updatedBalls.length; i++) {
      const ball = updatedBalls[i]
      if (ball.inPocket) continue

      // Update position
      ball.x += ball.vx * dt
      ball.y += ball.vy * dt

      // Apply friction
      ball.vx *= 0.98
      ball.vy *= 0.98

      // Bounce off walls (simplified)
      if (ball.x < 20 || ball.x > 780) {
        ball.vx *= -0.8
        ball.x = Math.max(20, Math.min(780, ball.x))
      }
      if (ball.y < 20 || ball.y > 380) {
        ball.vy *= -0.8
        ball.y = Math.max(20, Math.min(380, ball.y))
      }

      // Check pocket collisions
      const pockets = [
        { x: 0, y: 0 }, { x: 400, y: 0 }, { x: 800, y: 0 },
        { x: 0, y: 400 }, { x: 400, y: 400 }, { x: 800, y: 400 }
      ]

      for (const pocket of pockets) {
        const dx = ball.x - pocket.x
        const dy = ball.y - pocket.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 25) { // Pocket radius
          ball.inPocket = true
          ball.vx = 0
          ball.vy = 0
          break
        }
      }

      // Ball-to-ball collisions (simplified)
      for (let j = i + 1; j < updatedBalls.length; j++) {
        const otherBall = updatedBalls[j]
        if (otherBall.inPocket) continue

        const dx = ball.x - otherBall.x
        const dy = ball.y - otherBall.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 24) { // Ball diameter
          // Simple elastic collision
          const angle = Math.atan2(dy, dx)
          const sin = Math.sin(angle)
          const cos = Math.cos(angle)

          // Rotate velocities
          const vx1 = ball.vx * cos + ball.vy * sin
          const vy1 = ball.vy * cos - ball.vx * sin
          const vx2 = otherBall.vx * cos + otherBall.vy * sin
          const vy2 = otherBall.vy * cos - otherBall.vx * sin

          // Collision response
          const finalVx1 = vx2 * 0.8
          const finalVx2 = vx1 * 0.8

          // Rotate back
          ball.vx = finalVx1 * cos - vy1 * sin
          ball.vy = vy1 * cos + finalVx1 * sin
          otherBall.vx = finalVx2 * cos - vy2 * sin
          otherBall.vy = vy2 * cos + finalVx2 * sin

          // Separate balls
          const overlap = 24 - distance
          const separateX = (dx / distance) * overlap * 0.5
          const separateY = (dy / distance) * overlap * 0.5
          
          ball.x += separateX
          ball.y += separateY
          otherBall.x -= separateX
          otherBall.y -= separateY
        }
      }

      // Stop very slow balls
      if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
        ball.vx = 0
        ball.vy = 0
      }
    }

    // Check if all balls have stopped
    const allStopped = updatedBalls.every(ball => 
      ball.inPocket || (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1)
    )
    if (allStopped) break
  }

  return updatedBalls
}

// Analyze shot results for rule enforcement
function analyzeShot(originalBalls: any[], updatedBalls: any[], gamePhase: string) {
  const ballsPocketed = []
  const fouls = []
  const events = []

  // Find pocketed balls
  for (let i = 0; i < originalBalls.length; i++) {
    const original = originalBalls[i]
    const updated = updatedBalls[i]
    
    if (!original.inPocket && updated.inPocket) {
      ballsPocketed.push(updated)
      events.push({
        type: 'ball_pocketed',
        time: Date.now(),
        ballId: updated.id,
        ballType: updated.type,
        ballNumber: updated.number
      })
    }
  }

  // Check for fouls
  const cueBall = updatedBalls.find(b => b.type === 'CUE')
  if (cueBall?.inPocket) {
    fouls.push('CUE_BALL_POCKETED')
    events.push({
      type: 'foul',
      time: Date.now(),
      foulType: 'CUE_BALL_POCKETED'
    })
  }

  // No balls contacted (simplified check)
  if (ballsPocketed.length === 0) {
    // This would need more sophisticated collision detection
    // For now, we'll assume contact was made
  }

  return {
    ballsPocketed,
    fouls,
    events
  }
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

              // Get current match state from pool_matches
              const { data: match, error: matchError } = await supabase
                .from('pool_matches')
                .select('*')
                .eq('id', message.matchId)
                .single()

              if (matchError) {
                console.error('[POOL-WS] Match fetch error:', matchError)
                socket.send(JSON.stringify({ type: 'error', message: 'Match not found' }))
                return
              }

              // Update player as connected in the players JSON array
              const updatedPlayers = match.players.map((p: any) => 
                p.userId === user.id ? { 
                  ...p, 
                  connected: true, 
                  ready: p.ready ?? false  // Ensure ready field exists
                } : {
                  ...p,
                  ready: p.ready ?? false  // Ensure ready field exists for all players
                }
              )
              
              await supabase
                .from('pool_matches')
                .update({ players: updatedPlayers })
                .eq('id', message.matchId)

              // Send confirmation
              socket.send(JSON.stringify({ 
                type: 'joined', 
                matchId: message.matchId
              }))

              // Get updated match
              const { data: updatedMatch } = await supabase
                .from('pool_matches')
                .select('*')
                .eq('id', message.matchId)
                .single()

              if (updatedMatch) {
                // Send room state to all players
                broadcastToMatch(message.matchId, {
                  type: 'room_state',
                  match: updatedMatch
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

              // Get current match
              const { data: currentMatch } = await supabase
                .from('pool_matches')
                .select('*')
                .eq('id', conn.matchId)
                .single()

              if (!currentMatch) return

              // Update player ready status in players array
              const updatedPlayers = currentMatch.players.map((p: any) => 
                p.userId === conn.userId ? { 
                  ...p, 
                  ready: true 
                } : {
                  ...p,
                  ready: p.ready ?? false  // Ensure ready field exists
                }
              )
              
              await supabase
                .from('pool_matches')
                .update({ players: updatedPlayers })
                .eq('id', conn.matchId)

              // Check if all players are ready and match has 2 players
              const allReady = updatedPlayers.length === 2 && 
                             updatedPlayers.every((p: any) => p.ready === true)

              console.log(`[POOL-WS] Ready check for match ${conn.matchId}:`, {
                totalPlayers: updatedPlayers.length,
                playersReady: updatedPlayers.filter((p: any) => p.ready).length,
                playersConnected: updatedPlayers.filter((p: any) => p.connected).length,
                allReady,
                players: updatedPlayers.map((p: any) => ({
                  userId: p.userId,
                  ready: p.ready,
                  connected: p.connected
                }))
              })

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
                    console.log(`[POOL-WS] Starting match initialization for ${conn.matchId}`)
                    
                    // Initialize game state
                    const balls = initializePoolBalls()
                    
                     // Update match with initialized balls and ensure status is LIVE
                     const { error: updateError } = await supabase
                       .from('pool_matches')
                       .update({ 
                         balls,
                         status: 'LIVE',
                         game_phase: 'BREAK',
                         turn_user_id: updatedPlayers[0].userId,
                         ball_in_hand: false,
                         shot_clock: 60
                       })
                       .eq('id', conn.matchId)

                    if (updateError) {
                      console.error('[POOL-WS] Match update error:', updateError)
                      return
                    }

                    console.log(`[POOL-WS] Match ${conn.matchId} started successfully`)

                    // Get updated match data
                    const { data: liveMatch } = await supabase
                      .from('pool_matches')
                      .select('*')
                      .eq('id', conn.matchId)
                      .single()

                    if (liveMatch) {
                      console.log(`[POOL-WS] Broadcasting match_started for ${conn.matchId}`, {
                        status: liveMatch.status,
                        ballsCount: liveMatch.balls?.length,
                        gamePhase: liveMatch.game_phase
                      })
                      
                      // Send match_started event with full game state
                      broadcastToMatch(conn.matchId!, {
                        type: 'match_started',
                        state: liveMatch
                      })
                    }

                  } catch (error) {
                    console.error('[POOL-WS] Match start error:', error)
                  }
                }, 3000)
              } else {
                // Send updated room state
                const { data: updatedMatchState } = await supabase
                  .from('pool_matches')
                  .select('*')
                  .eq('id', conn.matchId)
                  .single()

                if (updatedMatchState) {
                  broadcastToMatch(conn.matchId!, {
                    type: 'room_state',
                    match: updatedMatchState
                  })
                }
              }

            } catch (error) {
              console.error('[POOL-WS] Ready error:', error)
              socket.send(JSON.stringify({ type: 'error', message: 'Failed to set ready' }))
            }
            break

          case 'shoot':
            try {
              const conn = activeConnections.get(connectionId)
              if (!conn) return

              console.log('[POOL-WS] Shot received:', {
                type: message.type,
                dir: message.dir,
                power: message.power,
                spin: message.spin,
                aimPoint: message.aimPoint
              })

              // Get current match
              const { data: currentMatch } = await supabase
                .from('pool_matches')
                .select('*')
                .eq('id', conn.matchId)
                .single()

              if (!currentMatch) {
                socket.send(JSON.stringify({ type: 'shot_rejected', reason: 'Match not found' }))
                return
              }

              // Validate it's player's turn
              if (currentMatch.turn_user_id !== conn.userId) {
                socket.send(JSON.stringify({ type: 'shot_rejected', reason: 'Not your turn' }))
                return
              }

              // Validate match is live
              if (currentMatch.status !== 'LIVE') {
                socket.send(JSON.stringify({ type: 'shot_rejected', reason: 'Match not active' }))
                return
              }

              // Simulate shot physics (basic implementation)
              const updatedBalls = simulateShot(currentMatch.balls, message)
              const shotResult = analyzeShot(currentMatch.balls, updatedBalls, currentMatch.game_phase)

              // Determine next turn
              let nextTurnUserId = currentMatch.turn_user_id
              let gamePhase = currentMatch.game_phase
              let ballInHand = false

              // Change turn if no balls were pocketed or there was a foul
              if (shotResult.ballsPocketed.length === 0 || shotResult.fouls.length > 0) {
                const otherPlayer = currentMatch.players.find((p: any) => p.userId !== conn.userId)
                nextTurnUserId = otherPlayer?.userId || conn.userId
                ballInHand = shotResult.fouls.length > 0
              }

              // Update game phase based on pocketed balls
              if (gamePhase === 'BREAK' && shotResult.ballsPocketed.length > 0) {
                gamePhase = 'OPEN'
              } else if (gamePhase === 'OPEN' && shotResult.ballsPocketed.length > 0) {
                // Assign groups based on first ball pocketed
                const firstBall = shotResult.ballsPocketed[0]
                if (firstBall.type === 'SOLID' || firstBall.type === 'STRIPE') {
                  gamePhase = 'GROUPS_SET'
                  // Update players with their groups
                  const updatedPlayers = currentMatch.players.map((p: any) => 
                    p.userId === conn.userId 
                      ? { ...p, group: firstBall.type }
                      : { ...p, group: firstBall.type === 'SOLID' ? 'STRIPE' : 'SOLID' }
                  )
                  
                  await supabase
                    .from('pool_matches')
                    .update({ players: updatedPlayers })
                    .eq('id', conn.matchId)
                }
              }

              // Check for win condition
              let winnerUserId = null
              if (shotResult.ballsPocketed.some(b => b.type === 'EIGHT')) {
                // Player won if they pocketed 8-ball legally, lost if illegally
                const playerGroup = currentMatch.players.find((p: any) => p.userId === conn.userId)?.group
                const remainingPlayerBalls = updatedBalls.filter(b => 
                  b.type === playerGroup && !b.inPocket
                )
                
                if (remainingPlayerBalls.length === 0) {
                  winnerUserId = conn.userId // Legal 8-ball win
                } else {
                  // Illegal 8-ball, opponent wins
                  winnerUserId = currentMatch.players.find((p: any) => p.userId !== conn.userId)?.userId
                }
              }

              // Update match state
              const matchUpdates: any = {
                balls: updatedBalls,
                turn_user_id: nextTurnUserId,
                game_phase: gamePhase,
                ball_in_hand: ballInHand,
                shot_clock: 60
              }

              if (winnerUserId) {
                matchUpdates.status = 'FINISHED'
                matchUpdates.winner_user_ids = [winnerUserId]
                matchUpdates.finished_at = new Date().toISOString()
              }

              await supabase
                .from('pool_matches')
                .update(matchUpdates)
                .eq('id', conn.matchId)

              // Broadcast simulation result
              broadcastToMatch(conn.matchId!, {
                type: 'simulation_result',
                balls: updatedBalls,
                events: shotResult.events,
                ballsPocketed: shotResult.ballsPocketed,
                fouls: shotResult.fouls,
                turnEnds: nextTurnUserId !== conn.userId,
                winner: winnerUserId
              })

            } catch (error) {
              console.error('[POOL-WS] Shot error:', error)
              socket.send(JSON.stringify({ type: 'shot_rejected', reason: 'Shot processing failed' }))
            }
            break

          case 'place_cue_ball':
            try {
              const conn = activeConnections.get(connectionId)
              if (!conn) return

              console.log('[POOL-WS] Cue ball placement:', message)

              // Get current match
              const { data: currentMatch } = await supabase
                .from('pool_matches')
                .select('*')
                .eq('id', conn.matchId)
                .single()

              if (!currentMatch) return

              // Validate it's player's turn and ball in hand
              if (currentMatch.turn_user_id !== conn.userId || !currentMatch.ball_in_hand) {
                socket.send(JSON.stringify({ type: 'error', message: 'Cannot place cue ball' }))
                return
              }

              // Update cue ball position
              const updatedBalls = currentMatch.balls.map((ball: any) =>
                ball.type === 'CUE' ? { 
                  ...ball, 
                  x: message.x, 
                  y: message.y, 
                  inPocket: false,
                  vx: 0,
                  vy: 0 
                } : ball
              )

              await supabase
                .from('pool_matches')
                .update({ 
                  balls: updatedBalls,
                  ball_in_hand: false
                })
                .eq('id', conn.matchId)

              // Broadcast cue ball placement
              broadcastToMatch(conn.matchId!, {
                type: 'cue_ball_placed',
                x: message.x,
                y: message.y
              })

            } catch (error) {
              console.error('[POOL-WS] Cue ball placement error:', error)
            }
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