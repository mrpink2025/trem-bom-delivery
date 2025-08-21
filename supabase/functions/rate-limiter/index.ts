import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMinutes: number;
  identifier: string; // 'ip', 'user_id', or 'device_hash'
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  'create_order': {
    endpoint: 'create_order',
    maxRequests: 10,
    windowMinutes: 60,
    identifier: 'user_id'
  },
  'send_message': {
    endpoint: 'send_message',
    maxRequests: 30,
    windowMinutes: 5,
    identifier: 'user_id'
  },
  'auth_attempt': {
    endpoint: 'auth_attempt',
    maxRequests: 5,
    windowMinutes: 15,
    identifier: 'ip'
  },
  'payment_attempt': {
    endpoint: 'payment_attempt',
    maxRequests: 3,
    windowMinutes: 30,
    identifier: 'device_hash'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { endpoint, identifier_value, user_agent, additional_data } = await req.json();
    
    // Get rate limit config
    const config = rateLimitConfigs[endpoint];
    if (!config) {
      return new Response(
        JSON.stringify({ allowed: true, reason: 'No rate limit configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RATE-LIMITER] Checking ${endpoint} for ${config.identifier}:${identifier_value}`);

    const result = await checkRateLimit(supabaseClient, config, identifier_value, req, additional_data);
    
    // Log the rate limit check
    await logRateLimitAttempt(supabaseClient, {
      endpoint,
      identifier_type: config.identifier,
      identifier_value,
      allowed: result.allowed,
      current_count: result.currentCount,
      max_requests: config.maxRequests,
      user_agent,
      ip_address: getClientIP(req),
      additional_data
    });

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.allowed ? 200 : 429
      }
    );
  } catch (error) {
    console.error('Rate limiter error:', error);
    return new Response(
      JSON.stringify({ error: error.message, allowed: true }), // Fail open
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function checkRateLimit(
  supabase: any, 
  config: RateLimitConfig, 
  identifierValue: string,
  req: Request,
  additionalData?: any
) {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

  // Get current count in the window
  const { data: existing, error } = await supabase
    .from('rate_limits')
    .select('request_count')
    .eq('identifier', identifierValue)
    .eq('endpoint', config.endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, reason: 'Database error' };
  }

  const currentCount = existing?.request_count || 0;
  
  // Check if limit exceeded
  if (currentCount >= config.maxRequests) {
    // Detect potential fraud patterns
    await detectFraudPatterns(supabase, config, identifierValue, currentCount, additionalData);
    
    return {
      allowed: false,
      currentCount,
      maxRequests: config.maxRequests,
      windowMinutes: config.windowMinutes,
      reason: 'Rate limit exceeded',
      retryAfter: config.windowMinutes * 60
    };
  }

  // Update or insert rate limit record
  const now = new Date();
  const currentWindow = new Date(now.getTime() - (now.getTime() % (5 * 60 * 1000))); // 5-minute windows

  await supabase
    .from('rate_limits')
    .upsert({
      identifier: identifierValue,
      endpoint: config.endpoint,
      request_count: currentCount + 1,
      window_start: currentWindow.toISOString()
    }, {
      onConflict: 'identifier,endpoint,window_start',
      ignoreDuplicates: false
    });

  return {
    allowed: true,
    currentCount: currentCount + 1,
    maxRequests: config.maxRequests,
    windowMinutes: config.windowMinutes
  };
}

async function detectFraudPatterns(
  supabase: any,
  config: RateLimitConfig,
  identifierValue: string,
  currentCount: number,
  additionalData?: any
) {
  try {
    // Pattern 1: Extremely high request rate
    if (currentCount > config.maxRequests * 5) {
      await logSuspiciousActivity(supabase, {
        type: 'EXTREME_RATE_LIMIT_VIOLATION',
        identifier: identifierValue,
        endpoint: config.endpoint,
        details: {
          request_count: currentCount,
          max_allowed: config.maxRequests,
          violation_severity: 'HIGH'
        }
      });
    }

    // Pattern 2: Multiple endpoints being hit rapidly by same identifier
    if (config.identifier === 'user_id' || config.identifier === 'device_hash') {
      const recentActivity = await supabase
        .from('rate_limits')
        .select('endpoint, request_count')
        .eq('identifier', identifierValue)
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Last 10 minutes

      const endpointCounts = recentActivity.data?.reduce((acc: any, item: any) => {
        acc[item.endpoint] = (acc[item.endpoint] || 0) + item.request_count;
        return acc;
      }, {});

      const totalRequests = Object.values(endpointCounts || {}).reduce((sum: number, count: any) => sum + count, 0) as number;
      
      if (totalRequests > 100) {
        await logSuspiciousActivity(supabase, {
          type: 'RAPID_MULTI_ENDPOINT_ACCESS',
          identifier: identifierValue,
          details: {
            total_requests: totalRequests,
            endpoints: endpointCounts,
            time_window: '10_minutes'
          }
        });
      }
    }

    // Pattern 3: Suspicious payment patterns
    if (config.endpoint === 'payment_attempt' && additionalData) {
      const { card_fingerprint, amount } = additionalData;
      
      if (card_fingerprint) {
        const recentPayments = await supabase
          .from('audit_logs')
          .select('*')
          .eq('table_name', 'orders')
          .contains('new_values', { card_fingerprint })
          .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

        if (recentPayments.data?.length > 5) {
          await logSuspiciousActivity(supabase, {
            type: 'SUSPICIOUS_PAYMENT_PATTERN',
            identifier: identifierValue,
            details: {
              card_fingerprint,
              recent_attempts: recentPayments.data.length,
              amounts: recentPayments.data.map(p => p.new_values?.amount)
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Fraud detection error:', error);
  }
}

async function logSuspiciousActivity(supabase: any, activity: any) {
  console.warn(`[FRAUD-DETECTION] ${activity.type}:`, activity);
  
  await supabase
    .from('audit_logs')
    .insert({
      table_name: 'fraud_detection',
      operation: activity.type,
      new_values: activity,
      timestamp: new Date().toISOString(),
      ip_address: activity.ip_address
    });
}

async function logRateLimitAttempt(supabase: any, data: any) {
  await supabase
    .from('audit_logs')
    .insert({
      table_name: 'rate_limits',
      operation: 'RATE_LIMIT_CHECK',
      new_values: data,
      timestamp: new Date().toISOString(),
      ip_address: data.ip_address
    });
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  return cfConnectingIP || realIP || forwardedFor?.split(',')[0] || 'unknown';
}