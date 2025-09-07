import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface JoinMatchRequest {
  matchId: string
}

serve(async (req) => {
  console.log('[POOL-MATCH-JOIN] Function started')

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

    console.log(`[POOL-MATCH-JOIN] User authenticated: ${user.id}`)

    const { matchId }: JoinMatchRequest = await req.json()

    // Get match
    const { data: match, error: matchError } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (match.status !== 'LOBBY') {
      return new Response(JSON.stringify({ error: 'Match not joinable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const players = match.players || []
    
    // Check if user already in match
    if (players.some(p => p.userId === user.id)) {
      return new Response(JSON.stringify({ error: 'Already in match' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if match is full
    if (players.length >= 2) {
      return new Response(JSON.stringify({ error: 'Match is full' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check user credits
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletError) {
      console.error('[POOL-MATCH-JOIN] Wallet error:', walletError)
      return new Response(JSON.stringify({ error: 'Wallet error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create wallet if it doesn't exist
    if (!wallet) {
      const { error: createError } = await supabase
        .from('user_wallets')
        .insert({ user_id: user.id, balance: 0, locked_balance: 0 })
      
      if (createError) {
        console.error('[POOL-MATCH-JOIN] Error creating wallet:', createError)
        return new Response(JSON.stringify({ error: 'Failed to create wallet' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const currentBalance = wallet.balance || 0
    const availableBalance = currentBalance - (wallet.locked_balance || 0)
    
    if (availableBalance < match.buy_in) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Add player to match with normalized format
    const updatedPlayers = [
      ...players,
      { 
        userId: user.id, 
        user_id: user.id, // Keep both fields for compatibility
        seat: players.length, 
        connected: false, 
        ready: false, 
        mmr: 1000 
      }
    ]

    const updates: any = {
      players: updatedPlayers,
      updated_at: new Date().toISOString()
    }

    // Don't auto-start match, wait for both players to be ready via WebSocket

    const { error: updateError } = await supabase
      .from('pool_matches')
      .update(updates)
      .eq('id', matchId)

    if (updateError) {
      console.error('[POOL-MATCH-JOIN] Error updating match:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to join match' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[POOL-MATCH-JOIN] User joined match successfully: ${matchId}`)

    return new Response(JSON.stringify({ 
      success: true,
      matchId: matchId,
      status: 'joined'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[POOL-MATCH-JOIN] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})