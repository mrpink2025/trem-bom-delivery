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

    const { order_id, radius_km = 5.0, timeout_seconds = 30 } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar o pedido e verificar se o usuário tem acesso
    const { data: order } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        restaurant_id,
        total_amount,
        delivery_fee,
        restaurants!inner(owner_id, location, name)
      `)
      .eq('id', order_id)
      .single();

    if (!order || order.restaurants.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Order not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se o pedido está pronto para despacho
    if (!['ready', 'courier_assigned'].includes(order.status)) {
      return new Response(JSON.stringify({ error: 'Order not ready for dispatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar couriers próximos usando a função SQL
    const { data: nearbyCouriers, error: couriersError } = await supabase
      .rpc('find_nearby_couriers', {
        p_restaurant_id: order.restaurant_id,
        p_radius_km: radius_km,
        p_limit: 10
      });

    if (couriersError) {
      console.error('Error finding nearby couriers:', couriersError);
      return new Response(JSON.stringify({ error: 'Failed to find couriers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!nearbyCouriers || nearbyCouriers.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No available couriers found in the area',
        message: 'Try increasing the radius or wait for couriers to come online'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cancelar ofertas pendentes anteriores para este pedido
    await supabase
      .from('dispatch_offers')
      .update({ status: 'CANCELLED' })
      .eq('order_id', order_id)
      .eq('status', 'PENDING');

    // Criar ofertas para os couriers próximos
    const expiresAt = new Date(Date.now() + timeout_seconds * 1000).toISOString();
    const estimatedEarnings = Math.round((order.delivery_fee || 500) * 0.8); // 80% da taxa de entrega

    const offerPromises = nearbyCouriers.slice(0, 5).map(async (courier) => {
      const { error } = await supabase
        .from('dispatch_offers')
        .insert({
          order_id,
          courier_id: courier.courier_id,
          distance_km: courier.distance_km,
          eta_minutes: courier.eta_minutes,
          estimated_earnings_cents: estimatedEarnings,
          expires_at: expiresAt
        });

      if (error) {
        console.error('Error creating offer for courier:', courier.courier_id, error);
      }

      // Enviar notificação push para o courier
      try {
        await supabase.functions.invoke('push-notifications', {
          body: {
            user_id: courier.courier_id,
            title: 'Nova Corrida Disponível!',
            body: `${courier.distance_km}km - Ganho estimado: R$${(estimatedEarnings/100).toFixed(2)}`,
            data: {
              type: 'dispatch_offer',
              order_id,
              distance_km: courier.distance_km,
              eta_minutes: courier.eta_minutes,
              estimated_earnings_cents: estimatedEarnings
            }
          }
        });
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }

      return {
        courier_id: courier.courier_id,
        distance_km: courier.distance_km,
        eta_minutes: courier.eta_minutes,
        estimated_earnings_cents: estimatedEarnings
      };
    });

    const offers = await Promise.all(offerPromises);

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'dispatch_offers',
        operation: 'DISPATCH_CREATED',
        record_id: order_id,
        user_id: user.id,
        new_values: {
          order_id,
          couriers_contacted: offers.length,
          radius_km,
          timeout_seconds
        }
      });

    return new Response(JSON.stringify({
      success: true,
      order_id,
      offers_sent: offers.length,
      expires_at: expiresAt,
      couriers: offers
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