import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[GET-POOL-MATCHES-LIVE] Function started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[GET-POOL-MATCHES-LIVE] Querying pool_matches...')
    
    // Get all LIVE matches
    const { data: matches, error } = await supabaseClient
      .from('pool_matches')
      .select(`
        id,
        status,
        mode,
        buy_in,
        rules,
        created_at,
        players
      `)
      .eq('status', 'LIVE')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET-POOL-MATCHES-LIVE] Database error:', error)
      return Response.json({ error: error.message }, { 
        status: 500,
        headers: corsHeaders 
      })
    }

    console.log(`[GET-POOL-MATCHES-LIVE] Found ${matches?.length || 0} live matches`)

    // Transform matches to frontend format
    const transformedMatches = (matches || []).map(match => ({
      id: match.id,
      mode: match.mode,
      buy_in: match.buy_in,
      status: match.status,
      players: match.players || [],
      rules: match.rules || { shot_clock: 60, assist_level: 'SHORT' },
      created_at: match.created_at
    }))

    console.log(`[GET-POOL-MATCHES-LIVE] Returning transformed matches: ${transformedMatches.length}`)

    return Response.json(transformedMatches, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('[GET-POOL-MATCHES-LIVE] Function error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
})