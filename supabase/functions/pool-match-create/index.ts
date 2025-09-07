import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function jsonResponse(status: number, body: unknown, requestId: string) {
  return new Response(JSON.stringify({ requestId, ...body }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  console.log(`[pool-match-create] ${requestId} - Request started`, {
    method: req.method,
    url: req.url,
    hasAuth: !!req.headers.get('Authorization')
  });

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      console.log(`[pool-match-create] ${requestId} - Invalid method: ${req.method}`);
      return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' }, requestId);
    }

    // Validate environment variables
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[pool-match-create] ${requestId} - Missing environment variables`, {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey
      });
      return jsonResponse(500, { error: 'MISSING_ENV' }, requestId);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extract and validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log(`[pool-match-create] ${requestId} - Missing or invalid auth header`);
      return jsonResponse(401, { error: 'UNAUTHENTICATED' }, requestId);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log(`[pool-match-create] ${requestId} - Auth validation failed`, {
        error: authError?.message,
        hasUser: !!user
      });
      return jsonResponse(401, { error: 'UNAUTHENTICATED' }, requestId);
    }

    console.log(`[pool-match-create] ${requestId} - User authenticated`, { userId: user.id });

    // Parse and validate payload
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;
    const buyIn = Number.parseInt(body?.buyIn);
    const shotClock = Number.parseInt(body?.shotClockSec || body?.shotClock);
    const assist = body?.assistLevel;

    console.log(`[pool-match-create] ${requestId} - Payload received`, {
      mode, buyIn, shotClock, assist, rawBody: body
    });

    // Strict validation
    const fieldErrors: Record<string, string> = {};
    if (!['CASUAL', 'RANKED'].includes(mode)) {
      fieldErrors.mode = 'Must be CASUAL or RANKED';
    }
    if (!Number.isInteger(buyIn) || buyIn <= 0) {
      fieldErrors.buyIn = 'Must be a positive integer';
    }
    if (!Number.isInteger(shotClock) || shotClock < 10 || shotClock > 90) {
      fieldErrors.shotClockSec = 'Must be between 10 and 90 seconds';
    }
    if (!['NONE', 'SHORT'].includes(assist)) {
      fieldErrors.assistLevel = 'Must be NONE or SHORT';
    }

    if (Object.keys(fieldErrors).length > 0) {
      console.log(`[pool-match-create] ${requestId} - Validation failed`, { fieldErrors });
      return jsonResponse(422, { error: 'VALIDATION_ERROR', fieldErrors }, requestId);
    }

    // Call RPC with validated parameters
    console.log(`[pool-match-create] ${requestId} - Calling RPC`, {
      userId: user.id, mode, buyIn, shotClock, assist
    });

    const { data, error } = await supabase.rpc('create_pool_match_tx', {
      p_user_id: user.id,
      p_mode: mode,
      p_buy_in: buyIn,
      p_shot_clock: shotClock,
      p_assist: assist
    });

    if (error) {
      const errorMsg = error.message || '';
      const errorCode = (error as any).code || '';
      
      console.error(`[pool-match-create] ${requestId} - RPC error`, {
        code: errorCode,
        message: errorMsg,
        details: error.details,
        hint: error.hint
      });

      // Map specific errors
      if (errorMsg.includes('INSUFFICIENT_FUNDS')) {
        return jsonResponse(409, { error: 'INSUFFICIENT_FUNDS', message: 'Saldo insuficiente' }, requestId);
      }
      if (errorMsg.includes('WALLET_NOT_FOUND')) {
        return jsonResponse(404, { error: 'WALLET_NOT_FOUND', message: 'Carteira não encontrada' }, requestId);
      }
      if (errorMsg.includes('INVALID_MODE')) {
        return jsonResponse(422, { error: 'INVALID_MODE', message: 'Modo de jogo inválido' }, requestId);
      }
      if (errorMsg.includes('INVALID_BUY_IN')) {
        return jsonResponse(422, { error: 'INVALID_BUY_IN', message: 'Valor de entrada inválido' }, requestId);
      }
      if (errorCode === '23505') {
        return jsonResponse(503, { error: 'RETRY_JOIN_CODE', message: 'Erro temporário, tente novamente' }, requestId);
      }
      
      return jsonResponse(500, { error: 'INTERNAL', message: 'Erro interno do servidor' }, requestId);
    }

    console.log(`[pool-match-create] ${requestId} - Success`, { data });
    
    return jsonResponse(201, data, requestId);

  } catch (error) {
    console.error(`[pool-match-create] ${requestId} - Unexpected error`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return jsonResponse(500, { error: 'INTERNAL', message: 'Erro interno do servidor' }, requestId);
  }
});