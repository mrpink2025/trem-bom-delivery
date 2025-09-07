import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  console.log('[POOL-MATCH-PERIODIC-START] Function started')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('[POOL-MATCH-PERIODIC-START] Missing environment variables')
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call the auto-start function
    console.log('[POOL-MATCH-PERIODIC-START] Calling pool-match-auto-start...')
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pool-match-auto-start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    console.log('[POOL-MATCH-PERIODIC-START] Auto-start result:', result)

    return new Response(JSON.stringify({ 
      success: true, 
      autoStartResult: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[POOL-MATCH-PERIODIC-START] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})