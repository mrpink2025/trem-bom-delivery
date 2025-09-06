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

const logStep = (requestId: string, step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[POOL-MATCH-CREATE] ${requestId} ${step}${detailsStr}`);
};

const jsonResponse = (status: number, body: any, requestId: string) => {
  return new Response(JSON.stringify({ requestId, ...body }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

const validateInput = (body: any): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (!body.mode || !['CASUAL', 'RANKED'].includes(body.mode)) {
    errors.mode = 'Mode must be CASUAL or RANKED';
  }
  
  if (!body.buyIn || body.buyIn < 1 || body.buyIn > 100000) {
    errors.buyIn = 'Buy-in must be between 1 and 100000 credits';
  }
  
  if (!body.rules?.shotClockSec || body.rules.shotClockSec < 10 || body.rules.shotClockSec > 90) {
    errors.shotClockSec = 'Shot clock must be between 10 and 90 seconds';
  }
  
  if (!body.rules?.assistLevel || !['NONE', 'SHORT'].includes(body.rules.assistLevel)) {
    errors.assistLevel = 'Assist level must be NONE or SHORT';
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    logStep(requestId, 'Function started', { method: req.method, url: req.url });

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      logStep(requestId, 'Invalid method', { method: req.method });
      return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED', message: 'Only POST method allowed' }, requestId);
    }

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logStep(requestId, 'Missing or invalid authorization header');
      return jsonResponse(401, { error: 'UNAUTHENTICATED', message: 'Missing or invalid authorization token' }, requestId);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user?.id) {
      logStep(requestId, 'Authentication failed', { error: authError?.message });
      return jsonResponse(401, { error: 'UNAUTHENTICATED', message: 'Invalid or expired token' }, requestId);
    }

    logStep(requestId, 'User authenticated', { userId: user.id });

    // Parse and validate request body
    let body: CreateMatchRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      logStep(requestId, 'Invalid JSON payload', { error: parseError.message });
      return jsonResponse(400, { error: 'INVALID_JSON', message: 'Request body must be valid JSON' }, requestId);
    }

    const { isValid, errors } = validateInput(body);
    if (!isValid) {
      logStep(requestId, 'Validation failed', { errors });
      return jsonResponse(422, { error: 'VALIDATION_ERROR', fieldErrors: errors }, requestId);
    }

    logStep(requestId, 'Input validated', { 
      mode: body.mode, 
      buyIn: body.buyIn, 
      shotClock: body.rules.shotClockSec,
      assist: body.rules.assistLevel 
    });

    // Call secure RPC function for match creation (without credit debit)
    const { data, error } = await supabase.rpc('create_pool_match_no_debit', {
      p_user_id: user.id,
      p_mode: body.mode,
      p_buy_in: body.buyIn,
      p_shot_clock: body.rules.shotClockSec,
      p_assist: body.rules.assistLevel
    });

    if (error) {
      logStep(requestId, 'RPC error', { error: error.message, code: error.code });
      
      // Map database errors to appropriate HTTP responses
      if (error.message.includes('INSUFFICIENT_FUNDS')) {
        const match = error.message.match(/available=([0-9.]+), required=([0-9.]+)/);
        const available = match ? parseFloat(match[1]) : 0;
        const required = match ? parseFloat(match[2]) : body.buyIn;
        
        return jsonResponse(409, { 
          error: 'INSUFFICIENT_FUNDS', 
          message: `Saldo insuficiente. Disponível: ${available} créditos, necessário: ${required} créditos` 
        }, requestId);
      }
      
      if (error.message.includes('INVALID_MODE')) {
        return jsonResponse(422, { 
          error: 'VALIDATION_ERROR', 
          fieldErrors: { mode: 'Modo de jogo inválido' } 
        }, requestId);
      }
      
      if (error.message.includes('INVALID_BUY_IN')) {
        return jsonResponse(422, { 
          error: 'VALIDATION_ERROR', 
          fieldErrors: { buyIn: 'Valor da aposta inválido' } 
        }, requestId);
      }
      
      if (error.message.includes('INVALID_SHOT_CLOCK')) {
        return jsonResponse(422, { 
          error: 'VALIDATION_ERROR', 
          fieldErrors: { shotClockSec: 'Tempo por tacada inválido' } 
        }, requestId);
      }
      
      if (error.message.includes('INVALID_ASSIST')) {
        return jsonResponse(422, { 
          error: 'VALIDATION_ERROR', 
          fieldErrors: { assistLevel: 'Nível de assistência inválido' } 
        }, requestId);
      }

      // Generic server error
      console.error('[POOL-MATCH-CREATE] Unexpected RPC error:', error);
      return jsonResponse(500, { 
        error: 'INTERNAL_ERROR', 
        message: 'Erro interno do servidor. Tente novamente.' 
      }, requestId);
    }

    logStep(requestId, 'Match created successfully', { 
      matchId: data.matchId, 
      status: data.status,
      players: data.players 
    });

    return jsonResponse(201, {
      matchId: data.matchId,
      match: {
        id: data.matchId,
        status: data.status,
        players: data.players,
        maxPlayers: data.maxPlayers
      }
    }, requestId);

  } catch (error) {
    logStep(requestId, 'Unexpected error', { error: error.message, stack: error.stack });
    return jsonResponse(500, { 
      error: 'INTERNAL_ERROR', 
      message: 'Erro interno do servidor' 
    }, requestId);
  }
});