import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-JOB] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = performance.now();
    logStep("Starting cleanup job");

    // Use service role para bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let trackingRecordsRemoved = 0;
    let chatMediaCleaned = 0;

    // 1. Limpar tracking points antigos (> 30 dias)
    const { count: trackingCount, error: trackingError } = await supabase
      .from('delivery_tracking')
      .delete({ count: 'exact' })
      .lt('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (trackingError) {
      logStep("Error cleaning tracking data", { error: trackingError });
    } else {
      trackingRecordsRemoved = trackingCount || 0;
      logStep("Cleaned tracking records", { count: trackingRecordsRemoved });
    }

    // 2. Limpar mídia de chat antiga (> 90 dias)
    const { count: mediaCount, error: mediaError } = await supabase
      .from('messages')
      .update({ 
        media_url: null,
        content: 'Mídia removida - retenção expirada'
      }, { count: 'exact' })
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .not('media_url', 'is', null);

    if (mediaError) {
      logStep("Error cleaning chat media", { error: mediaError });
    } else {
      chatMediaCleaned = mediaCount || 0;
      logStep("Cleaned chat media", { count: chatMediaCleaned });
    }

    const executionTime = Math.round(performance.now() - startTime);

    // 3. Registrar métricas de execução
    const { error: metricsError } = await supabase
      .from('cleanup_metrics')
      .insert({
        tracking_records_removed: trackingRecordsRemoved,
        chat_media_cleaned: chatMediaCleaned,
        execution_time_ms: executionTime,
        status: 'completed',
        triggered_by: 'cron_job'
      });

    if (metricsError) {
      logStep("Error saving metrics", { error: metricsError });
    }

    const result = {
      success: true,
      tracking_records_removed: trackingRecordsRemoved,
      chat_media_cleaned: chatMediaCleaned,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    };

    logStep("Cleanup completed successfully", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR in cleanup job", { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      message: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});