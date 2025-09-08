import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Pool Match Connect function started")

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { matchId, userId } = await req.json()
    console.log(`[POOL-CONNECT] Match: ${matchId}, User: ${userId}`)

    // Get current match state
    const { data: match, error: matchError } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      console.error('[POOL-CONNECT] Match not found:', matchError)
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update player as connected and ready
    const updatedPlayers = match.players.map(player => {
      if (player.userId === userId || player.user_id === userId) {
        return {
          ...player,
          userId: userId,
          user_id: userId,
          connected: true,
          ready: true,
          last_seen: new Date().toISOString()
        }
      }
      return player
    })

    // Update match with connected players
    const { error: updateError } = await supabase
      .from('pool_matches')
      .update({ 
        players: updatedPlayers,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('[POOL-CONNECT] Failed to update match:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update match' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[POOL-CONNECT] Player ${userId} connected to match ${matchId}`)

    // Check if we should auto-start
    const readyPlayers = updatedPlayers.filter(p => p.connected && p.ready)
    if (readyPlayers.length >= 2 && match.status === 'LOBBY') {
      console.log('[POOL-CONNECT] Triggering auto-start')
      
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/pool-match-auto-start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ matchId })
        })
      } catch (autoStartError) {
        console.error('[POOL-CONNECT] Auto-start failed:', autoStartError)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      match: { ...match, players: updatedPlayers }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[POOL-CONNECT] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})