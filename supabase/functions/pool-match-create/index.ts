import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CreateMatchRequest {
  mode: 'RANKED' | 'CASUAL'
  buyIn: number
  rules: {
    shotClockSec: number
    assistLevel: 'NONE' | 'SHORT'
  }
}

// Physics Engine for creating standard 8-ball rack
class PoolPhysics {
  static createStandardRack() {
    const balls = []
    
    // Cue ball
    balls.push({
      id: 0,
      x: 200,
      y: 200,
      vx: 0, vy: 0, wx: 0, wy: 0,
      color: '#FFFFFF',
      inPocket: false,
      type: 'CUE'
    })

    // 8-ball rack
    const rackX = 600
    const rackY = 200
    const ballSpacing = 25
    
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
        color: ballNum === 8 ? '#000000' : (ballNum <= 7 ? '#FF4444' : '#4444FF'),
        number: ballNum,
        inPocket: false,
        type: ballNum === 8 ? 'EIGHT' : (ballNum <= 7 ? 'SOLID' : 'STRIPE')
      })
    })

    return balls
  }

  static createStandardTable() {
    return {
      width: 800,
      height: 400,
      pockets: [
        { x: 0, y: 0, r: 20 },
        { x: 400, y: 0, r: 18 },
        { x: 800, y: 0, r: 20 },
        { x: 0, y: 400, r: 20 },
        { x: 400, y: 400, r: 18 },
        { x: 800, y: 400, r: 20 }
      ],
      cushions: [],
      friction: 0.98,
      cushionRestitution: 0.93
    }
  }
}

serve(async (req) => {
  console.log('[POOL-MATCH-CREATE] Function started')

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

    console.log(`[POOL-MATCH-CREATE] User authenticated: ${user.id}`)

    const { mode, buyIn, rules }: CreateMatchRequest = await req.json()

    // Validate input
    if (!mode || !buyIn || !rules) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check user balance directly instead of calling wallet-operations
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('balance, locked_balance')
      .eq('user_id', user.id)
      .single();

    let currentBalance = 0;
    
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('[POOL-MATCH-CREATE] Error fetching wallet:', walletError);
      return new Response(JSON.stringify({ error: 'Failed to check balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (wallet) {
      currentBalance = parseFloat(wallet.balance) - parseFloat(wallet.locked_balance);
    } else {
      // Create wallet if it doesn't exist
      const { error: createError } = await supabase
        .from('user_wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          locked_balance: 0
        });
        
      if (createError) {
        console.error('[POOL-MATCH-CREATE] Error creating wallet:', createError);
        return new Response(JSON.stringify({ error: 'Failed to initialize wallet' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      currentBalance = 0;
    }
    if (currentBalance < buyIn) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create match
    const { data: match, error: matchError } = await supabase
      .from('pool_matches')
      .insert({
        mode,
        buy_in: buyIn,
        rake_pct: 0.05,
        status: 'LOBBY',
        max_players: 2,
        current_players: 1,
        created_by: user.id,
        players: [{ userId: user.id, seat: 0, connected: false, mmr: 1000 }],
        table_config: PoolPhysics.createStandardTable(),
        balls: PoolPhysics.createStandardRack(),
        turn_user_id: user.id,
        rules,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (matchError) {
      console.error('[POOL-MATCH-CREATE] Error creating match:', matchError)
      return new Response(JSON.stringify({ error: 'Failed to create match' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Reserve credits directly in database
    const { data: walletAfterMatch, error: walletAfterError } = await supabase
      .from('user_wallets')
      .select('balance, locked_balance')
      .eq('user_id', user.id)
      .single();

    if (walletAfterError) {
      console.error('[POOL-MATCH-CREATE] Error fetching wallet after match creation:', walletAfterError);
      // Delete the match since we couldn't reserve credits
      await supabase.from('pool_matches').delete().eq('id', match.id);
      
      return new Response(JSON.stringify({ error: 'Failed to reserve credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newLockedBalance = parseFloat(walletAfterMatch.locked_balance) + buyIn;
    const { error: updateError } = await supabase
      .from('user_wallets')
      .update({ locked_balance: newLockedBalance })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[POOL-MATCH-CREATE] Error reserving credits:', updateError);
      // Delete the match since we couldn't reserve credits
      await supabase.from('pool_matches').delete().eq('id', match.id);
      
      return new Response(JSON.stringify({ error: 'Failed to reserve credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Record the transaction in wallet ledger
    const { error: ledgerError } = await supabase
      .from('wallet_ledger')
      .insert({
        user_id: user.id,
        type: 'DEBIT',
        amount: buyIn,
        reason: 'BUY_IN',
        match_id: match.id,
        description: `Pool match buy-in: ${mode}`
      });

    if (ledgerError) {
      console.error('[POOL-MATCH-CREATE] Error recording transaction:', ledgerError);
      // Note: We don't fail here since the credits are already reserved
    }

    console.log(`[POOL-MATCH-CREATE] Match created successfully: ${match.id}`)

    return new Response(JSON.stringify({ matchId: match.id, match }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[POOL-MATCH-CREATE] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})