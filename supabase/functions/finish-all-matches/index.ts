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

    console.log('[FINISH-ALL-MATCHES] Starting to finish all live matches');

    // Update all LIVE pool matches to FINISHED
    const { data: poolMatches, error: poolError } = await supabase
      .from('pool_matches')
      .update({ 
        status: 'FINISHED',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'LIVE')
      .select('id');

    if (poolError) {
      console.error('[FINISH-ALL-MATCHES] Error updating pool matches:', poolError);
      return new Response(JSON.stringify({ error: poolError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update all LIVE game matches to FINISHED
    const { data: gameMatches, error: gameError } = await supabase
      .from('game_matches')
      .update({ 
        status: 'FINISHED',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('status', 'LIVE')
      .select('id');

    if (gameError) {
      console.error('[FINISH-ALL-MATCHES] Error updating game matches:', gameError);
    }

    const poolCount = poolMatches?.length || 0;
    const gameCount = gameMatches?.length || 0;
    const totalCount = poolCount + gameCount;

    console.log(`[FINISH-ALL-MATCHES] Successfully finished ${totalCount} matches (${poolCount} pool, ${gameCount} game)`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Finished ${totalCount} matches successfully`,
      finished: {
        poolMatches: poolCount,
        gameMatches: gameCount,
        total: totalCount
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[FINISH-ALL-MATCHES] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});