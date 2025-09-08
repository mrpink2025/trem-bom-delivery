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

    console.log('[CLEANUP-ALL-GAMES] Starting cleanup of all games');

    // Delete all pool matches
    const { data: poolMatches, error: poolError } = await supabase
      .from('pool_matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (poolError) {
      console.error('[CLEANUP-ALL-GAMES] Error deleting pool matches:', poolError);
      return new Response(JSON.stringify({ error: poolError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Delete all game matches
    const { data: gameMatches, error: gameError } = await supabase
      .from('game_matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (gameError) {
      console.error('[CLEANUP-ALL-GAMES] Error deleting game matches:', gameError);
    }

    // Delete all match players
    const { data: matchPlayers, error: playersError } = await supabase
      .from('match_players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (playersError) {
      console.error('[CLEANUP-ALL-GAMES] Error deleting match players:', playersError);
    }

    const poolCount = poolMatches?.length || 0;
    const gameCount = gameMatches?.length || 0;
    const playersCount = matchPlayers?.length || 0;

    console.log(`[CLEANUP-ALL-GAMES] Successfully cleaned up:
    - ${poolCount} pool matches
    - ${gameCount} game matches  
    - ${playersCount} match players`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'All games cleaned up successfully',
      cleaned: {
        poolMatches: poolCount,
        gameMatches: gameCount,
        matchPlayers: playersCount
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CLEANUP-ALL-GAMES] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});