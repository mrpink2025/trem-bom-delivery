import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Active SSE connections
const connections = new Map()

async function getUserFromToken(token: string) {
  try {
    const userSupabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    
    const { data: { user }, error } = await userSupabase.auth.getUser()
    if (error || !user) {
      throw new Error(`Authentication failed: ${error?.message}`)
    }
    
    return user
  } catch (error) {
    console.error('[POOL-SSE] Auth error:', error)
    throw error
  }
}

async function getMatchState(matchId: string) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    const { data: match, error } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single()
    
    if (error || !match) {
      throw new Error(`Match not found: ${error?.message}`)
    }
    
    return {
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
  } catch (error) {
    console.error('[POOL-SSE] Error fetching match:', error)
    throw error
  }
}

async function markPlayerConnected(userId: string, matchId: string, connected: boolean) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    console.log(`[POOL-SSE] markPlayerConnected: ${userId} -> ${connected} in match ${matchId}`)
    
    const { data: match, error: fetchError } = await supabase
      .from('pool_matches')
      .select('players')
      .eq('id', matchId)
      .single()
    
    if (fetchError || !match) {
      console.error('[POOL-SSE] Error fetching match for player update:', fetchError)
      return
    }

    const players = match.players || []
    console.log(`[POOL-SSE] Current players:`, players)
    
    // Normalize field names and update connection status
    const updatedPlayers = players.map((p: any) => {
      const playerId = p.userId || p.user_id
      if (playerId === userId) {
        console.log(`[POOL-SSE] Updating player ${userId}: connected=${connected}, ready=${connected}`)
        return { 
          ...p, 
          userId: playerId, // Standardize to userId
          user_id: playerId, // Keep both for compatibility
          connected, 
          ready: connected // Auto-ready when connected via SSE
        }
      }
      return {
        ...p,
        userId: p.userId || p.user_id,
        user_id: p.userId || p.user_id
      }
    })

    console.log(`[POOL-SSE] Updated players:`, updatedPlayers)

    const { error: updateError } = await supabase
      .from('pool_matches')
      .update({ 
        players: updatedPlayers,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('[POOL-SSE] Error updating player connection:', updateError)
      return
    }

    console.log(`[POOL-SSE] Player ${userId} marked as connected: ${connected} in match ${matchId}`)
    
    // Check if we should auto-start the match
    if (connected && updatedPlayers.length === 2) {
      const allReady = updatedPlayers.every((p: any) => p.connected === true && p.ready === true)
      console.log(`[POOL-SSE] Auto-start check: allReady=${allReady}, players=${updatedPlayers.length}`)
      if (allReady) {
        console.log(`[POOL-SSE] All players ready, triggering auto-start for match ${matchId}`)
        await triggerAutoStart(matchId)
      }
    }
  } catch (error) {
    console.error('[POOL-SSE] Error in markPlayerConnected:', error)
  }
}

async function triggerAutoStart(matchId: string) {
  try {
    console.log(`[POOL-SSE] Triggering auto-start for match ${matchId}`)
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pool-match-auto-start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ matchId }) // Send matchId in body
    })

    if (!response.ok) {
      console.error(`[POOL-SSE] Auto-start HTTP error: ${response.status}`)
      return
    }

    const result = await response.json()
    console.log(`[POOL-SSE] Auto-start result:`, result)
    
    if (result.matchesStarted > 0) {
      console.log(`[POOL-SSE] ✅ Match ${matchId} auto-started successfully`)
    } else {
      console.warn(`[POOL-SSE] ⚠️ Auto-start didn't start any matches for ${matchId}`)
    }
  } catch (error) {
    console.error('[POOL-SSE] Error triggering auto-start:', error)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const matchId = url.searchParams.get('matchId')
  const token = url.searchParams.get('token')
  
  if (!matchId || !token) {
    return new Response('Missing matchId or token', { 
      status: 400,
      headers: corsHeaders 
    })
  }

  try {
    // Authenticate user
    const user = await getUserFromToken(token)
    console.log(`[POOL-SSE] User ${user.id} connecting to match ${matchId}`)
    
    // Verify user can access this match
    const matchState = await getMatchState(matchId)
    const canAccess = matchState.creator_user_id === user.id || 
                     matchState.opponent_user_id === user.id ||
                     matchState.players.some((p: any) => 
                       p.user_id === user.id || p.userId === user.id
                     )
    
    if (!canAccess) {
      return new Response('Unauthorized access to match', { 
        status: 403,
        headers: corsHeaders 
      })
    }

    // Create SSE response
    const stream = new ReadableStream({
      start(controller) {
        const connectionId = crypto.randomUUID()
        console.log(`[POOL-SSE] Connection ${connectionId} started for match ${matchId}`)
        
        // Store connection
        connections.set(connectionId, {
          controller,
          userId: user.id,
          matchId,
          lastActivity: Date.now()
        })

        // Mark player as connected in database
        await markPlayerConnected(user.id, matchId, true)

        // Send initial connection confirmation
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          matchId,
          userId: user.id,
          timestamp: Date.now()
        })}\n\n`))

        // Send initial match state
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'match_state',
          matchData: matchState,
          timestamp: Date.now()
        })}\n\n`))

        // Keep-alive interval
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: Date.now()
            })}\n\n`))
          } catch (error) {
            console.log(`[POOL-SSE] Connection ${connectionId} closed, clearing interval`)
            clearInterval(keepAlive)
            connections.delete(connectionId)
          }
        }, 30000)

        // Cleanup on close
        const cleanup = async () => {
          clearInterval(keepAlive)
          connections.delete(connectionId)
          // Mark player as disconnected
          await markPlayerConnected(user.id, matchId, false)
          console.log(`[POOL-SSE] Connection ${connectionId} cleaned up`)
        }

        // Monitor connection status
        const checkConnection = setInterval(() => {
          const conn = connections.get(connectionId)
          if (!conn || Date.now() - conn.lastActivity > 120000) { // 2 minutes timeout
            console.log(`[POOL-SSE] Connection ${connectionId} timed out`)
            cleanup()
            clearInterval(checkConnection)
            try {
              controller.close()
            } catch (e) {
              // Connection already closed
            }
          }
        }, 30000)
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('[POOL-SSE] Connection error:', error)
    return new Response(`Connection error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    })
  }
})
