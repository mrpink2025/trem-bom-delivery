import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Calculate pricing function started")

interface PricingRequest {
  restaurant_id: string
  items: Array<{
    menu_item_id: string
    quantity: number
    base_price: number
    category_id?: string
  }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing pricing calculation request')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { restaurant_id, items }: PricingRequest = await req.json()
    
    if (!restaurant_id || !items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request: restaurant_id and items array are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Calculating pricing for restaurant ${restaurant_id} with ${items.length} items`)

    // Call the database function
    const { data: pricingResult, error: pricingError } = await supabase
      .rpc('calculate_dynamic_pricing', {
        p_restaurant_id: restaurant_id,
        p_items: items
      })

    if (pricingError) {
      console.error('Pricing calculation error:', pricingError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: pricingError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Save snapshot for audit
    const { error: snapshotError } = await supabase
      .from('pricing_snapshots')
      .insert({
        restaurant_id,
        input_data: { items },
        rules_applied: pricingResult?.config_used || {},
        calculation_steps: pricingResult?.calculation_steps || [],
        final_result: pricingResult || {}
      })

    if (snapshotError) {
      console.warn('Failed to save pricing snapshot:', snapshotError)
    }

    console.log('Pricing calculation completed successfully')
    
    return new Response(
      JSON.stringify({
        success: true,
        data: pricingResult
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Calculate pricing function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})