
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-CANCEL-ORDERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting automatic order cancellation process");

    // Initialize Supabase with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Call the database function to cancel orders and handle user blocking
    const { data, error } = await supabaseService.rpc('cancel_unconfirmed_orders');

    if (error) {
      logStep("Error calling cancel_unconfirmed_orders", { error: error.message });
      throw error;
    }

    logStep("Successfully executed order cancellation process", { result: data });

    // Get statistics about what was processed
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    
    const { data: pendingOrders, error: pendingError } = await supabaseService
      .from('orders')
      .select('id, user_id, created_at, status')
      .eq('status', 'pending_payment')
      .lt('created_at', twentyMinutesAgo);

    const { data: recentBlocks, error: blocksError } = await supabaseService
      .from('user_blocks')
      .select('id, user_id, blocked_at, reason, cancelled_orders_count')
      .gte('blocked_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (pendingError) logStep("Warning: Could not fetch pending orders stats", { error: pendingError.message });
    if (blocksError) logStep("Warning: Could not fetch recent blocks stats", { error: blocksError.message });

    const stats = {
      timestamp: new Date().toISOString(),
      processed_successfully: true,
      pending_orders_found: pendingOrders?.length || 0,
      recent_blocks_created: recentBlocks?.length || 0,
      function_executed: true
    };

    logStep("Process completed", stats);

    return new Response(JSON.stringify({
      success: true,
      message: "Order cancellation process completed successfully",
      stats
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR in auto-cancel process", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
