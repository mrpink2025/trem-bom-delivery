import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  console.log('[POOL-MATCH-AUTO-START] Function started')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get specific match if provided, otherwise get all LOBBY matches
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const targetMatchId = body.matchId
    
    console.log(`[POOL-MATCH-AUTO-START] Processing${targetMatchId ? ` for specific match: ${targetMatchId}` : ' all LOBBY matches'}`)

    let matchQuery = supabase
      .from('pool_matches')
      .select('*')
      .eq('status', 'LOBBY')
    
    if (targetMatchId) {
      matchQuery = matchQuery.eq('id', targetMatchId)
    }
    
    const { data: matches, error: matchError } = await matchQuery
      
    if (matchError) {
      console.error('[POOL-MATCH-AUTO-START] Error fetching matches:', matchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch matches' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let startedCount = 0

    for (const match of matches || []) {
      const players = match.players || []
      
      console.log(`[POOL-MATCH-AUTO-START] Checking match ${match.id}:`, {
        playersCount: players.length,
        players: players.map((p: any) => ({
          id: p.userId || p.user_id,
          connected: p.connected,
          ready: p.ready
        }))
      })
      
      // Check if match has exactly 2 players, both are ready AND connected
      if (players.length === 2) {
        // Normalize field names for checking
        const normalizedPlayers = players.map((p: any) => ({
          ...p,
          userId: p.userId || p.user_id,
          user_id: p.userId || p.user_id
        }))
        
        const allConnectedAndReady = normalizedPlayers.every((p: any) => 
          p.ready === true && p.connected === true
        )
        
        console.log(`[POOL-MATCH-AUTO-START] Match ${match.id} status:`, {
          allConnectedAndReady,
          playerStatuses: normalizedPlayers.map(p => ({ 
            id: p.userId, 
            connected: p.connected, 
            ready: p.ready 
          }))
        })
        
        if (allConnectedAndReady) {
          console.log(`[POOL-MATCH-AUTO-START] ✅ Starting match ${match.id}`)
          
          // Initialize pool balls in correct positions
          const balls = [
            // Cue ball
            { id: 0, x: 200, y: 200, vx: 0, vy: 0, wx: 0, wy: 0, color: "#FFFFFF", type: "CUE", inPocket: false },
            // 8-ball
            { id: 8, x: 600, y: 200, vx: 0, vy: 0, wx: 0, wy: 0, color: "#000000", number: 8, type: "EIGHT", inPocket: false },
            // ... keep existing code (solid balls 1-7)
            { id: 1, x: 650, y: 175, vx: 0, vy: 0, wx: 0, wy: 0, color: "#FFD700", number: 1, type: "SOLID", inPocket: false },
            { id: 2, x: 650, y: 225, vx: 0, vy: 0, wx: 0, wy: 0, color: "#0066CC", number: 2, type: "SOLID", inPocket: false },
            { id: 3, x: 700, y: 150, vx: 0, vy: 0, wx: 0, wy: 0, color: "#FF0000", number: 3, type: "SOLID", inPocket: false },
            { id: 4, x: 700, y: 200, vx: 0, vy: 0, wx: 0, wy: 0, color: "#9900CC", number: 4, type: "SOLID", inPocket: false },
            { id: 5, x: 700, y: 250, vx: 0, vy: 0, wx: 0, wy: 0, color: "#FF6600", number: 5, type: "SOLID", inPocket: false },
            { id: 6, x: 750, y: 125, vx: 0, vy: 0, wx: 0, wy: 0, color: "#009900", number: 6, type: "SOLID", inPocket: false },
            { id: 7, x: 750, y: 275, vx: 0, vy: 0, wx: 0, wy: 0, color: "#660000", number: 7, type: "SOLID", inPocket: false },
            // Striped balls (9-15)
            { id: 9, x: 750, y: 175, vx: 0, vy: 0, wx: 0, wy: 0, color: "#FFD700", number: 9, type: "STRIPE", inPocket: false },
            { id: 10, x: 750, y: 225, vx: 0, vy: 0, wx: 0, wy: 0, color: "#0066CC", number: 10, type: "STRIPE", inPocket: false },
            { id: 11, x: 800, y: 100, vx: 0, vy: 0, wx: 0, wy: 0, color: "#FF0000", number: 11, type: "STRIPE", inPocket: false },
            { id: 12, x: 800, y: 150, vx: 0, vy: 0, wx: 0, wy: 0, color: "#9900CC", number: 12, type: "STRIPE", inPocket: false },
            { id: 13, x: 800, y: 250, vx: 0, vy: 0, wx: 0, wy: 0, color: "#FF6600", number: 13, type: "STRIPE", inPocket: false },
            { id: 14, x: 800, y: 300, vx: 0, vy: 0, wx: 0, wy: 0, color: "#009900", number: 14, type: "STRIPE", inPocket: false },
            { id: 15, x: 850, y: 200, vx: 0, vy: 0, wx: 0, wy: 0, color: "#660000", number: 15, type: "STRIPE", inPocket: false }
          ]

          // Start the match with proper game_state structure
          const gameState = {
            balls: balls,
            phase: 'BREAK',
            turnUserId: normalizedPlayers[0].userId,
            ballInHand: false,
            gameType: '8BALL',
            players: normalizedPlayers.map((p, index) => ({
              userId: p.userId,
              seat: index,
              ballType: index === 0 ? 'SOLID' : 'STRIPE'
            }))
          }

          const { error: updateError } = await supabase
            .from('pool_matches')
            .update({
              status: 'LIVE',
              game_state: gameState,
              opponent_user_id: normalizedPlayers[1].userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', match.id)

          if (updateError) {
            console.error(`[POOL-MATCH-AUTO-START] Error starting match ${match.id}:`, updateError)
          } else {
            console.log(`[POOL-MATCH-AUTO-START] ✅ Match ${match.id} started successfully`)
            startedCount++
          }
        } else {
          console.log(`[POOL-MATCH-AUTO-START] ❌ Match ${match.id} not ready to start`)
        }
      } else {
        console.log(`[POOL-MATCH-AUTO-START] ❌ Match ${match.id} needs exactly 2 players, has ${players.length}`)
      }
    }

    console.log(`[POOL-MATCH-AUTO-START] Started ${startedCount} matches`)

    return new Response(JSON.stringify({ 
      success: true, 
      matchesStarted: startedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[POOL-MATCH-AUTO-START] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})