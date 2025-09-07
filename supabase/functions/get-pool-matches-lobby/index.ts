import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  console.log('[GET-POOL-MATCHES-LOBBY] Function started')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get matches in LOBBY status
    const { data: matches, error } = await supabase
      .from('pool_matches')
      .select(`
        id,
        mode,
        buy_in,
        status,
        max_players,
        players,
        rules,
        creator_user_id,
        created_at,
        updated_at
      `)
      .eq('status', 'LOBBY')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[GET-POOL-MATCHES-LOBBY] Database error:', error)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[GET-POOL-MATCHES-LOBBY] Found ${matches?.length || 0} lobby matches`)

    // Transform matches to include player count and other UI-friendly data
    const transformedMatches = matches?.map(match => ({
      ...match,
      players: match.players || [],
      current_players: (match.players || []).length,
      created_by: match.creator_user_id, // Map creator_user_id to created_by for frontend compatibility
      // Extract rules from the rules object or set defaults
      rules: {
        shot_clock: match.rules?.shotClockSec || 60,
        assist_level: match.rules?.assistLevel || 'SHORT'
      }
    })) || []

    return new Response(JSON.stringify(transformedMatches), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[GET-POOL-MATCHES-LOBBY] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})