import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' }
    });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {
      store_id,
      is_busy,
      auto_accept,
      auto_reject_when_queue_gt,
      prep_time_base_minutes,
      prep_time_busy_minutes,
      max_parallel_orders,
      surge_prep_increment
    } = await req.json();

    if (!store_id) {
      return new Response(JSON.stringify({ error: 'store_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se o usuário tem acesso ao restaurante
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', store_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Preparar dados para atualização (apenas campos definidos)
    const updateData: any = {};
    if (is_busy !== undefined) updateData.is_busy = is_busy;
    if (auto_accept !== undefined) updateData.auto_accept = auto_accept;
    if (auto_reject_when_queue_gt !== undefined) updateData.auto_reject_when_queue_gt = auto_reject_when_queue_gt;
    if (prep_time_base_minutes !== undefined) updateData.prep_time_base_minutes = prep_time_base_minutes;
    if (prep_time_busy_minutes !== undefined) updateData.prep_time_busy_minutes = prep_time_busy_minutes;
    if (max_parallel_orders !== undefined) updateData.max_parallel_orders = max_parallel_orders;
    if (surge_prep_increment !== undefined) updateData.surge_prep_increment = surge_prep_increment;

    // Upsert na tabela merchant_capacity
    const { data: capacity, error } = await supabase
      .from('merchant_capacity')
      .upsert({
        store_id,
        ...updateData
      }, {
        onConflict: 'store_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating capacity:', error);
      return new Response(JSON.stringify({ error: 'Failed to update capacity' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Publicar evento realtime para o restaurante
    await supabase
      .channel(`restaurant:${store_id}`)
      .send({
        type: 'broadcast',
        event: 'capacity_updated',
        payload: {
          store_id,
          capacity: capacity
        }
      });

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'merchant_capacity',
        operation: 'CAPACITY_UPDATE',
        record_id: store_id,
        user_id: user.id,
        new_values: updateData
      });

    return new Response(JSON.stringify({
      success: true,
      capacity
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});