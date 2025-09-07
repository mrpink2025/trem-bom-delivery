import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface GetStateRequest {
  matchId: string;
}

serve(async (req) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[POOL-MATCH-GET-STATE] ${requestId} Function started - ${JSON.stringify({
    method: req.method,
    url: req.url
  })}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[POOL-MATCH-GET-STATE] ${requestId} CORS preflight request`);
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log(`[POOL-MATCH-GET-STATE] ${requestId} Missing authorization header`);
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        requestId 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log(`[POOL-MATCH-GET-STATE] ${requestId} Authentication failed:`, authError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication',
        requestId 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body: GetStateRequest = await req.json();
    const { matchId } = body;
    
    if (!matchId) {
      console.log(`[POOL-MATCH-GET-STATE] ${requestId} Missing matchId`);
      return new Response(JSON.stringify({ 
        error: 'Missing matchId',
        requestId 
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[POOL-MATCH-GET-STATE] ${requestId} Getting state for match ${matchId}`);

    // Get match data
    const { data: match, error } = await supabase
      .from('pool_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error || !match) {
      console.log(`[POOL-MATCH-GET-STATE] ${requestId} Match not found:`, error);
      return new Response(JSON.stringify({ 
        error: 'Match not found',
        requestId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is participant
    const players = match.game_state?.players || [];
    const isParticipant = players.some((p: any) => p.user_id === user.id) || 
                         match.creator_user_id === user.id ||
                         match.opponent_user_id === user.id;

    if (!isParticipant) {
      console.log(`[POOL-MATCH-GET-STATE] ${requestId} User not authorized for match ${matchId}`);
      return new Response(JSON.stringify({ 
        error: 'Not authorized',
        requestId 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[POOL-MATCH-GET-STATE] ${requestId} Match found - status: ${match.status}`);

    return new Response(JSON.stringify({
      matchId: match.id,
      status: match.status,
      game_state: match.game_state,
      created_at: match.created_at,
      requestId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[POOL-MATCH-GET-STATE] ${requestId} Unexpected error:`, error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      requestId 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});