import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  console.log('[POOL-DEBUG-AUTOSTART] Function started')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all LOBBY matches for debugging
    const { data: matches, error: matchError } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('status', 'LOBBY')
      
    if (matchError) {
      console.error('[POOL-DEBUG-AUTOSTART] Error fetching matches:', matchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch matches' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[POOL-DEBUG-AUTOSTART] Found ${matches?.length || 0} LOBBY matches`)

    const debugInfo = matches?.map(match => ({
      id: match.id,
      status: match.status,
      playersCount: match.players?.length || 0,
      players: match.players?.map((p: any) => ({
        userId: p.userId || p.user_id,
        connected: p.connected,
        ready: p.ready,
        seat: p.seat
      })) || [],
      canAutoStart: match.players?.length === 2 && 
                   match.players?.every((p: any) => p.connected === true && p.ready === true)
    })) || []

    // Try to call auto-start manually
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    let autoStartResult = null
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/pool-match-auto-start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      autoStartResult = await response.json()
      console.log('[POOL-DEBUG-AUTOSTART] Auto-start call result:', autoStartResult)
    } catch (error) {
      console.error('[POOL-DEBUG-AUTOSTART] Error calling auto-start:', error)
      autoStartResult = { error: error.message }
    }

    return new Response(JSON.stringify({ 
      success: true,
      matchesFound: matches?.length || 0,
      debugInfo,
      autoStartResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[POOL-DEBUG-AUTOSTART] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})