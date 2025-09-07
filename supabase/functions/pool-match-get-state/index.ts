import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { matchId } = await req.json();
    
    if (!matchId) {
      return new Response(JSON.stringify({ error: 'matchId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[POOL-MATCH-GET-STATE] Getting state for match: ${matchId}`);

    const { data: match, error } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('[POOL-MATCH-GET-STATE] Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!match) {
      console.log(`[POOL-MATCH-GET-STATE] Match not found: ${matchId}`);
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[POOL-MATCH-GET-STATE] Found match with status: ${match.status}`);

    return new Response(JSON.stringify({
      id: match.id,
      status: match.status,
      game_state: match.game_state,
      creator_user_id: match.creator_user_id,
      players: match.players,
      mode: match.mode,
      buy_in: match.buy_in,
      created_at: match.created_at,
      updated_at: match.updated_at
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[POOL-MATCH-GET-STATE] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});