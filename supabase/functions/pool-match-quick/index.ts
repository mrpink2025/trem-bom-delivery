import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface QuickMatchRequest {
  mode: 'RANKED' | 'CASUAL'
  buyIn: number
}

serve(async (req) => {
  console.log('[POOL-MATCH-QUICK] Function started')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[POOL-MATCH-QUICK] User authenticated: ${user.id}`)

    const { mode, buyIn }: QuickMatchRequest = await req.json()

    // First, try to find an existing match to join
    const { data: availableMatches } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('status', 'LOBBY')
      .eq('mode', mode)
      .eq('buy_in', buyIn)
      .order('created_at', { ascending: false })
      .limit(10)

    if (availableMatches && availableMatches.length > 0) {
      for (const match of availableMatches) {
        const players = match.players || []
        
        // Check if user is not already in this match and there's space
        if (!players.some(p => p.userId === user.id) && players.length < 2) {
          // Try to join this match
          const joinResponse = await supabase.functions.invoke('pool-match-join', {
            body: { matchId: match.id },
            headers: { Authorization: `Bearer ${token}` }
          })

          if (!joinResponse.error) {
            console.log(`[POOL-MATCH-QUICK] Joined existing match: ${match.id}`)
            return new Response(JSON.stringify({ matchId: match.id }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
      }
    }

    // No suitable match found, create a new one
    const createResponse = await supabase.functions.invoke('pool-match-create', {
      body: {
        mode,
        buyIn,
        rules: {
          shotClockSec: 60,
          assistLevel: 'SHORT'
        }
      },
      headers: { Authorization: `Bearer ${token}` }
    })

    if (createResponse.error) {
      throw new Error(`Failed to create match: ${createResponse.error}`)
    }

    const { matchId } = createResponse.data || {}
    
    console.log(`[POOL-MATCH-QUICK] Created new match: ${matchId}`)

    return new Response(JSON.stringify({ matchId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[POOL-MATCH-QUICK] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})