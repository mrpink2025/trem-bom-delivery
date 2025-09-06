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
  wx: number // angular velocity x
  wy: number // angular velocity y
  color: string
  number?: number
  inPocket: boolean
  type: 'SOLID' | 'STRIPE' | 'CUE' | 'EIGHT'
}

interface Table {
  width: number
  height: number
  pockets: Array<{ x: number; y: number; r: number; funnel: number }>
  cushions: Array<{ p1: { x: number; y: number }; p2: { x: number; y: number } }>
  friction: number
  cushionRestitution: number
}

interface ShotInput {
  dir: number
  power: number
  spin: { sx: number; sy: number }
  aimPoint: { x: number; y: number }
}

interface PoolMatch {
  id: string
  mode: 'RANKED' | 'CASUAL'
  buyIn: number
  rakePct: number
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED'
  players: Array<{
    userId: string
    seat: number
    connected: boolean
    mmr: number
    group?: 'SOLID' | 'STRIPE'
  }>
  table: Table
  balls: Ball[]
  turnUserId: string
  rules: {
    breakFoulBHRegion: 'BEHIND_HEAD' | 'ANY'
    shotClockSec: number
    assistLevel: 'NONE' | 'SHORT'
  }
  history: any[]
  winnerUserIds?: string[]
  createdAt: number
  updatedAt: number
  shotClock?: number
  ballInHand?: boolean
  gamePhase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL'
}

// Physics Engine
class PhysicsEngine {
  private readonly BALL_RADIUS = 12
  private readonly TABLE_WIDTH = 800
  private readonly TABLE_HEIGHT = 400
  private readonly FRICTION = 0.98
  private readonly RESTITUTION = 0.93
  private readonly MIN_VELOCITY = 0.1
  private readonly TIMESTEP = 1/120 // 120Hz physics

  createStandardTable(): Table {
    return {
      width: this.TABLE_WIDTH,
      height: this.TABLE_HEIGHT,
      pockets: [
        { x: 0, y: 0, r: 20, funnel: 1.5 },
        { x: this.TABLE_WIDTH/2, y: 0, r: 18, funnel: 1.3 },
        { x: this.TABLE_WIDTH, y: 0, r: 20, funnel: 1.5 },
        { x: 0, y: this.TABLE_HEIGHT, r: 20, funnel: 1.5 },
        { x: this.TABLE_WIDTH/2, y: this.TABLE_HEIGHT, r: 18, funnel: 1.3 },
        { x: this.TABLE_WIDTH, y: this.TABLE_HEIGHT, r: 20, funnel: 1.5 }
      ],
      cushions: [
        { p1: { x: 20, y: 0 }, p2: { x: this.TABLE_WIDTH/2 - 18, y: 0 } },
        { p1: { x: this.TABLE_WIDTH/2 + 18, y: 0 }, p2: { x: this.TABLE_WIDTH - 20, y: 0 } },
        { p1: { x: this.TABLE_WIDTH, y: 20 }, p2: { x: this.TABLE_WIDTH, y: this.TABLE_HEIGHT - 20 } },
        { p1: { x: this.TABLE_WIDTH - 20, y: this.TABLE_HEIGHT }, p2: { x: this.TABLE_WIDTH/2 + 18, y: this.TABLE_HEIGHT } },
        { p1: { x: this.TABLE_WIDTH/2 - 18, y: this.TABLE_HEIGHT }, p2: { x: 20, y: this.TABLE_HEIGHT } },
        { p1: { x: 0, y: this.TABLE_HEIGHT - 20 }, p2: { x: 0, y: 20 } }
      ],
      friction: this.FRICTION,
      cushionRestitution: this.RESTITUTION
    }
  }

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

    // 8-ball rack positions
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

  simulate(balls: Ball[], table: Table, shotInput?: ShotInput): { 
    events: any[], 
    finalBalls: Ball[], 
    fouls: string[],
    duration: number 
  } {
    const events: any[] = []
    const fouls: string[] = []
    let workingBalls = JSON.parse(JSON.stringify(balls)) // deep copy
    let simulationTime = 0
    const maxSimTime = 10 // 10 seconds max simulation

    // Apply shot if provided
    if (shotInput) {
      const cueBall = workingBalls.find(b => b.type === 'CUE' && !b.inPocket)
      if (cueBall) {
        const power = shotInput.power * 15 // max velocity
        cueBall.vx = Math.cos(shotInput.dir) * power
        cueBall.vy = Math.sin(shotInput.dir) * power
        
        // Apply spin
        cueBall.wx = shotInput.spin.sx * 5
        cueBall.wy = shotInput.spin.sy * 5
        
        events.push({ type: 'SHOT_START', time: simulationTime, ballId: cueBall.id })
      }
    }

    // Main simulation loop
    while (simulationTime < maxSimTime && this.hasMovingBalls(workingBalls)) {
      // Update positions
      workingBalls.forEach(ball => {
        if (ball.inPocket) return

        // Linear motion
        ball.x += ball.vx * this.TIMESTEP
        ball.y += ball.vy * this.TIMESTEP

        // Apply friction
        ball.vx *= this.FRICTION
        ball.vy *= this.FRICTION
        ball.wx *= this.FRICTION
        ball.wy *= this.FRICTION

        // Stop if too slow
        if (Math.abs(ball.vx) < this.MIN_VELOCITY) ball.vx = 0
        if (Math.abs(ball.vy) < this.MIN_VELOCITY) ball.vy = 0
        if (Math.abs(ball.wx) < this.MIN_VELOCITY) ball.wx = 0
        if (Math.abs(ball.wy) < this.MIN_VELOCITY) ball.wy = 0
      })

      // Ball-ball collisions
      for (let i = 0; i < workingBalls.length; i++) {
        for (let j = i + 1; j < workingBalls.length; j++) {
          const ball1 = workingBalls[i]
          const ball2 = workingBalls[j]
          
          if (ball1.inPocket || ball2.inPocket) continue

          const dx = ball2.x - ball1.x
          const dy = ball2.y - ball1.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < this.BALL_RADIUS * 2) {
            this.resolveBallCollision(ball1, ball2, events, simulationTime)
          }
        }
      }

      // Cushion collisions
      workingBalls.forEach(ball => {
        if (ball.inPocket) return
        this.checkCushionCollisions(ball, table, events, simulationTime)
      })

      // Pocket checks
      workingBalls.forEach(ball => {
        if (ball.inPocket) return
        
        table.pockets.forEach(pocket => {
          const dx = ball.x - pocket.x
          const dy = ball.y - pocket.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < pocket.r && Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy) < 3) {
            ball.inPocket = true
            ball.vx = 0
            ball.vy = 0
            events.push({ 
              type: 'BALL_POCKETED', 
              time: simulationTime, 
              ballId: ball.id,
              ballType: ball.type,
              ballNumber: ball.number
            })
          }
        })
      })

      simulationTime += this.TIMESTEP
    }

    return { events, finalBalls: workingBalls, fouls, duration: simulationTime }
  }

  private hasMovingBalls(balls: Ball[]): boolean {
    return balls.some(ball => 
      !ball.inPocket && 
      (Math.abs(ball.vx) > this.MIN_VELOCITY || Math.abs(ball.vy) > this.MIN_VELOCITY)
    )
  }

  private resolveBallCollision(ball1: Ball, ball2: Ball, events: any[], time: number) {
    const dx = ball2.x - ball1.x
    const dy = ball2.y - ball1.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Normalize collision vector
    const nx = dx / distance
    const ny = dy / distance
    
    // Relative velocity
    const dvx = ball2.vx - ball1.vx
    const dvy = ball2.vy - ball1.vy
    
    // Relative velocity along collision normal
    const dvn = dvx * nx + dvy * ny
    
    // Do not resolve if velocities are separating
    if (dvn > 0) return
    
    // Collision impulse
    const impulse = 2 * dvn / 2 // assuming equal mass
    
    // Update velocities
    ball1.vx += impulse * nx
    ball1.vy += impulse * ny
    ball2.vx -= impulse * nx
    ball2.vy -= impulse * ny
    
    // Separate balls to prevent overlap
    const overlap = (this.BALL_RADIUS * 2 - distance) / 2
    ball1.x -= overlap * nx
    ball1.y -= overlap * ny
    ball2.x += overlap * nx
    ball2.y += overlap * ny
    
    events.push({ 
      type: 'BALL_COLLISION', 
      time, 
      ball1Id: ball1.id, 
      ball2Id: ball2.id 
    })
  }

  private checkCushionCollisions(ball: Ball, table: Table, events: any[], time: number) {
    const margin = this.BALL_RADIUS
    
    // Simple boundary collision
    if (ball.x <= margin) {
      ball.x = margin
      ball.vx = -ball.vx * table.cushionRestitution
      events.push({ type: 'CUSHION_HIT', time, ballId: ball.id, side: 'LEFT' })
    }
    if (ball.x >= table.width - margin) {
      ball.x = table.width - margin
      ball.vx = -ball.vx * table.cushionRestitution
      events.push({ type: 'CUSHION_HIT', time, ballId: ball.id, side: 'RIGHT' })
    }
    if (ball.y <= margin) {
      ball.y = margin
      ball.vy = -ball.vy * table.cushionRestitution
      events.push({ type: 'CUSHION_HIT', time, ballId: ball.id, side: 'TOP' })
    }
    if (ball.y >= table.height - margin) {
      ball.y = table.height - margin
      ball.vy = -ball.vy * table.cushionRestitution
      events.push({ type: 'CUSHION_HIT', time, ballId: ball.id, side: 'BOTTOM' })
    }
  }
}

// Game Logic Engine
class GameLogic {
  static validateShot(match: PoolMatch, userId: string, shotInput: ShotInput): { valid: boolean; reason?: string } {
    if (match.status !== 'LIVE') return { valid: false, reason: 'Match not active' }
    if (match.turnUserId !== userId) return { valid: false, reason: 'Not your turn' }
    if (shotInput.power < 0 || shotInput.power > 1) return { valid: false, reason: 'Invalid power' }
    
    return { valid: true }
  }

  static analyzeShot(events: any[], balls: Ball[], match: PoolMatch): {
    fouls: string[]
    turnEnds: boolean
    groupsAssigned: boolean
    winner?: string
  } {
    const fouls: string[] = []
    const player = match.players.find(p => p.userId === match.turnUserId)!
    
    const cueBallPocketed = events.some(e => e.type === 'BALL_POCKETED' && e.ballType === 'CUE')
    const eightBallPocketed = events.some(e => e.type === 'BALL_POCKETED' && e.ballType === 'EIGHT')
    const firstContact = events.find(e => e.type === 'BALL_COLLISION')
    
    const pocketedBalls = events.filter(e => e.type === 'BALL_POCKETED')
    
    // Check fouls
    if (cueBallPocketed) fouls.push('CUE_BALL_POCKETED')
    
    // Check if first contact was legal
    if (match.gamePhase === 'GROUPS_SET' && player.group && firstContact) {
      const firstBall = balls.find(b => b.id === firstContact.ball2Id)
      if (firstBall && firstBall.type !== player.group && firstBall.type !== 'EIGHT') {
        fouls.push('WRONG_GROUP_FIRST')
      }
    }
    
    // Groups assignment logic
    let groupsAssigned = false
    if (match.gamePhase === 'OPEN' && pocketedBalls.length > 0) {
      const solidPocketed = pocketedBalls.some(e => balls.find(b => b.id === e.ballId)?.type === 'SOLID')
      const stripePocketed = pocketedBalls.some(e => balls.find(b => b.id === e.ballId)?.type === 'STRIPE')
      
      if (solidPocketed && !stripePocketed) {
        player.group = 'SOLID'
        const opponent = match.players.find(p => p.userId !== match.turnUserId)!
        opponent.group = 'STRIPE'
        groupsAssigned = true
      } else if (stripePocketed && !solidPocketed) {
        player.group = 'STRIPE'
        const opponent = match.players.find(p => p.userId !== match.turnUserId)!
        opponent.group = 'SOLID'
        groupsAssigned = true
      }
    }
    
    // Turn logic
    const legalPocket = pocketedBalls.some(e => {
      const ball = balls.find(b => b.id === e.ballId)
      return ball && (
        match.gamePhase === 'OPEN' || 
        ball.type === player.group ||
        (ball.type === 'EIGHT' && this.canShootEight(balls, player.group!))
      )
    })
    
    const turnEnds = fouls.length > 0 || !legalPocket
    
    // Win condition
    let winner: string | undefined
    if (eightBallPocketed) {
      const canShootEight = this.canShootEight(balls, player.group!)
      if (canShootEight && fouls.length === 0) {
        winner = match.turnUserId
      } else {
        // 8-ball foul = lose
        winner = match.players.find(p => p.userId !== match.turnUserId)!.userId
      }
    }
    
    return { fouls, turnEnds, groupsAssigned, winner }
  }

  static canShootEight(balls: Ball[], playerGroup: 'SOLID' | 'STRIPE'): boolean {
    return !balls.some(ball => 
      ball.type === playerGroup && !ball.inPocket
    )
  }
}

// Connection Manager
const activeConnections = new Map<string, {
  socket: WebSocket
  userId: string
  matchId?: string
  lastPing: number
}>()

const matchRooms = new Map<string, Set<string>>()

function broadcastToMatch(matchId: string, message: any, excludeConnectionId?: string) {
  const room = matchRooms.get(matchId)
  if (!room) return

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
      if (room.size === 0) {
        matchRooms.delete(connection.matchId)
      }
    }
  }
  activeConnections.delete(connectionId)
}

// Main server
serve(async (req) => {
  console.log('[POOL-WEBSOCKET] Function started')
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { socket, response } = Deno.upgradeWebSocket(req)
  const connectionId = crypto.randomUUID()
  const physics = new PhysicsEngine()

  socket.onopen = () => {
    console.log(`[POOL-WEBSOCKET] Connection opened: ${connectionId}`)
    activeConnections.set(connectionId, {
      socket,
      userId: '',
      lastPing: Date.now()
    })
  }

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      const connection = activeConnections.get(connectionId)!
      
      console.log(`[POOL-WEBSOCKET] Message received: ${message.type}`)

      switch (message.type) {
        case 'join_match': {
          const { matchId, token } = message
          
          try {
            // Authenticate user
            const { data: { user }, error: authError } = await supabase.auth.getUser(token)
            if (authError || !user) {
              socket.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }))
              return
            }

            console.log(`[POOL-WEBSOCKET] User authenticated: ${user.id}`)

            // Get match data
            const { data: match, error: matchError } = await supabase
              .from('game_matches')
              .select('*')
              .eq('id', matchId)
              .single()

            if (matchError || !match) {
              socket.send(JSON.stringify({ type: 'error', message: 'Match not found' }))
              return
            }

            // Debit credits when WebSocket connects successfully
            const { error: deductError } = await supabase.functions.invoke('wallet-operations', {
              body: { 
                operation: 'deduct_credits',
                amount: match.buy_in,
                description: `Pool match entry - ${match.id}`,
                type: 'GAME_ENTRY'
              }
            });

            if (deductError) {
              console.error('[POOL-WEBSOCKET] Failed to debit credits:', deductError);
              socket.send(JSON.stringify({ 
                type: 'error', 
                message: 'Insufficient funds or payment processing failed' 
              }))
              return
            }

            // Update connection info
            connection.userId = user.id
            connection.matchId = matchId

            // Add to match room
            if (!matchRooms.has(matchId)) {
              matchRooms.set(matchId, new Set())
            }
            matchRooms.get(matchId)!.add(connectionId)

            console.log(`[POOL-WEBSOCKET] User ${user.id} joined match ${matchId}`)

            // Update player connected status
            const currentPlayers = (match.game_state as any)?.players || []
            const playerIndex = currentPlayers.findIndex((p: any) => p.userId === user.id)
            
            if (playerIndex >= 0) {
              currentPlayers[playerIndex].connected = true
            }

            // Create match state
            const matchState: PoolMatch = {
              id: match.id,
              mode: match.mode as 'RANKED' | 'CASUAL',
              buyIn: match.buy_in,
              rakePct: match.rake_pct,
              status: match.status as 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED',
              players: currentPlayers,
              table: physics.createStandardTable(),
              balls: (match.game_state as any)?.balls || physics.createStandardRack(),
              turnUserId: (match.game_state as any)?.turnUserId || currentPlayers[0]?.userId,
              rules: {
                breakFoulBHRegion: 'BEHIND_HEAD',
                shotClockSec: 60,
                assistLevel: 'SHORT'
              },
              history: (match.game_state as any)?.history || [],
              winnerUserIds: match.winner_user_ids,
              createdAt: new Date(match.created_at).getTime(),
              updatedAt: new Date(match.updated_at).getTime(),
              gamePhase: (match.game_state as any)?.gamePhase || 'BREAK',
              ballInHand: false
            }

            // Send initial match state
            socket.send(JSON.stringify({
              type: 'match_state',
              match: matchState
            }))

            // Start match if both players connected
            if (currentPlayers.length === 2 && currentPlayers.every((p: any) => p.connected) && match.status === 'LOBBY') {
              // Update match status to LIVE
              await supabase
                .from('game_matches')
                .update({ 
                  status: 'LIVE',
                  started_at: new Date().toISOString(),
                  game_state: {
                    ...match.game_state,
                    players: currentPlayers,
                    gamePhase: 'BREAK',
                    balls: physics.createStandardRack()
                  }
                })
                .eq('id', matchId)

              matchState.status = 'LIVE'
              matchState.balls = physics.createStandardRack()
              
              // Notify all players
              broadcastToMatch(matchId, {
                type: 'match_started',
                match: matchState
              })
            }

            // Notify other players of join
            broadcastToMatch(matchId, {
              type: 'player_joined',
              userId: user.id,
              matchId: matchId
            }, connectionId)

          } catch (error) {
            console.error('[POOL-WEBSOCKET] Error in join_match:', error)
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to join match' }))
          }
          break
        }

        case 'shoot': {
          if (!connection.userId || !connection.matchId) {
            socket.send(JSON.stringify({ type: 'error', message: 'Not authenticated or in match' }))
            return
          }

          try {
            // Get current match state
            const { data: match, error: matchError } = await supabase
              .from('game_matches')
              .select('*')
              .eq('id', connection.matchId)
              .single()

            if (matchError || !match) {
              socket.send(JSON.stringify({ type: 'error', message: 'Match not found' }))
              return
            }

            const gameState = match.game_state as any
            const matchData: PoolMatch = {
              ...gameState,
              id: match.id,
              status: match.status,
              mode: match.mode,
              buyIn: match.buy_in,
              rakePct: match.rake_pct
            }

            // Validate shot
            const shotInput: ShotInput = {
              dir: message.dir,
              power: message.power,
              spin: message.spin || { sx: 0, sy: 0 },
              aimPoint: message.aimPoint || { x: 0, y: 0 }
            }

            const validation = GameLogic.validateShot(matchData, connection.userId, shotInput)
            if (!validation.valid) {
              socket.send(JSON.stringify({ 
                type: 'shot_rejected', 
                reason: validation.reason 
              }))
              return
            }

            // Run physics simulation
            const simulation = physics.simulate(matchData.balls, matchData.table, shotInput)
            
            // Analyze shot results
            const analysis = GameLogic.analyzeShot(simulation.events, simulation.finalBalls, matchData)

            // Update match state
            const newGameState = {
              ...gameState,
              balls: simulation.finalBalls,
              turnUserId: analysis.turnEnds ? 
                matchData.players.find(p => p.userId !== matchData.turnUserId)?.userId 
                : matchData.turnUserId,
              ballInHand: analysis.fouls.length > 0,
              gamePhase: analysis.groupsAssigned ? 'GROUPS_SET' : gameState.gamePhase,
              history: [...gameState.history, {
                userId: connection.userId,
                shot: shotInput,
                events: simulation.events,
                fouls: analysis.fouls,
                timestamp: Date.now()
              }]
            }

            // Check for winner
            let finalStatus = match.status
            let winnerUserIds = match.winner_user_ids

            if (analysis.winner) {
              finalStatus = 'FINISHED'
              winnerUserIds = [analysis.winner]
              
              // Distribute prize pool
              const totalPrize = match.buy_in * 2 * (1 - match.rake_pct)
              await supabase.functions.invoke('wallet-operations', {
                body: { 
                  operation: 'add_credits', 
                  amount: totalPrize,
                  userId: analysis.winner,
                  description: `Pool match win - ${match.id}`,
                  type: 'GAME_WIN'
                }
              })
            }

            // Save updated match state
            await supabase
              .from('game_matches')
              .update({
                game_state: newGameState,
                status: finalStatus,
                winner_user_ids: winnerUserIds,
                finished_at: finalStatus === 'FINISHED' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
              })
              .eq('id', connection.matchId)

            // Broadcast simulation result
            broadcastToMatch(connection.matchId, {
              type: 'simulation_result',
              events: simulation.events,
              balls: simulation.finalBalls,
              fouls: analysis.fouls,
              turnEnds: analysis.turnEnds,
              winner: analysis.winner,
              duration: simulation.duration
            })

            console.log(`[POOL-WEBSOCKET] Shot processed for user ${connection.userId}`)

          } catch (error) {
            console.error('[POOL-WEBSOCKET] Error processing shot:', error)
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to process shot' }))
          }
          break
        }

        case 'place_cue_ball': {
          if (!connection.userId || !connection.matchId) {
            socket.send(JSON.stringify({ type: 'error', message: 'Not authenticated or in match' }))
            return
          }

          const { x, y } = message

          // Validate placement (behind head string for break, etc.)
          // For now, allow any placement
          
          // Broadcast cue ball placement
          broadcastToMatch(connection.matchId, {
            type: 'cue_ball_placed',
            x: x,
            y: y,
            userId: connection.userId
          })

          console.log(`[POOL-WEBSOCKET] Cue ball placed by ${connection.userId} at (${x}, ${y})`)
          break
        }

        case 'chat': {
          if (!connection.userId || !connection.matchId) {
            socket.send(JSON.stringify({ type: 'error', message: 'Not authenticated or in match' }))
            return
          }

          // Broadcast chat message
          broadcastToMatch(connection.matchId, {
            type: 'chat_message',
            userId: connection.userId,
            message: message.message,
            timestamp: Date.now()
          })
          break
        }

        case 'ping': {
          connection.lastPing = Date.now()
          socket.send(JSON.stringify({ type: 'pong' }))
          break
        }

        default:
          console.log(`[POOL-WEBSOCKET] Unknown message type: ${message.type}`)
      }

    } catch (error) {
      console.error('[POOL-WEBSOCKET] Error parsing message:', error)
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  }

  socket.onclose = (event) => {
    console.log(`[POOL-WEBSOCKET] Connection closed: ${connectionId}, code: ${event.code}`)
    const connection = activeConnections.get(connectionId)
    
    if (connection?.matchId && connection?.userId) {
      // If user disconnects before game starts, refund credits
      supabase
        .from('game_matches')
        .select('status, buy_in')
        .eq('id', connection.matchId)
        .single()
        .then(({ data: match }) => {
          if (match && match.status === 'LOBBY') {
            // Refund credits for lobby disconnect
            supabase.functions.invoke('wallet-operations', {
              body: { 
                operation: 'add_credits',
                amount: match.buy_in,
                userId: connection.userId,
                description: `Pool match refund - lobby disconnect - ${connection.matchId}`,
                type: 'GAME_REFUND'
              }
            });
            console.log(`[POOL-WEBSOCKET] Refunded ${match.buy_in} credits to ${connection.userId} for lobby disconnect`)
          }
        })

      // Notify other players of disconnect
      broadcastToMatch(connection.matchId, {
        type: 'player_disconnected',
        userId: connection.userId
      }, connectionId)
    }
    
    cleanupConnection(connectionId)
  }

  socket.onerror = (error) => {
    console.error(`[POOL-WEBSOCKET] WebSocket error for ${connectionId}:`, error)
    cleanupConnection(connectionId)
  }

  return response
})