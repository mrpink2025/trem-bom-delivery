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

    console.log('[CLEANUP-LOBBY] Starting cleanup of old LOBBY matches (>30 minutes)');

    // Only delete LOBBY matches older than 30 minutes AND with no active players
    const { data, error } = await supabase
      .from('pool_matches')
      .delete()
      .eq('status', 'LOBBY')
      .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (error) {
      console.error('[CLEANUP-LOBBY] Error deleting matches:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const deletedCount = data?.length || 0;
    console.log(`[CLEANUP-LOBBY] Successfully cleaned up ${deletedCount} old LOBBY matches`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'All LOBBY matches cleaned up successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CLEANUP-LOBBY] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});