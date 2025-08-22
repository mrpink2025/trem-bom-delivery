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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { offer_id, action } = await req.json();
    
    if (!offer_id || !action) {
      return new Response(JSON.stringify({ error: 'offer_id and action are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      return new Response(JSON.stringify({ error: 'action must be ACCEPT or DECLINE' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar a oferta e verificar se o courier tem acesso
    const { data: offer, error: offerError } = await supabase
      .from('dispatch_offers')
      .select(`
        id,
        order_id,
        courier_id,
        status,
        expires_at,
        estimated_earnings_cents,
        distance_km,
        eta_minutes,
        orders!inner(
          id,
          status,
          restaurant_id,
          delivery_address,
          restaurants!inner(name, location)
        )
      `)
      .eq('id', offer_id)
      .single();

    if (offerError || !offer) {
      return new Response(JSON.stringify({ error: 'Offer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (offer.courier_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se a oferta ainda está válida
    if (offer.status !== 'PENDING') {
      return new Response(JSON.stringify({ 
        error: `Offer is no longer available (status: ${offer.status})`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const expiresAt = new Date(offer.expires_at);
    if (now > expiresAt) {
      // Marcar como expirada
      await supabase
        .from('dispatch_offers')
        .update({ 
          status: 'EXPIRED',
          responded_at: now.toISOString()
        })
        .eq('id', offer_id);

      return new Response(JSON.stringify({ error: 'Offer has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'DECLINE') {
      // Marcar oferta como recusada
      const { error: updateError } = await supabase
        .from('dispatch_offers')
        .update({ 
          status: 'DECLINED',
          responded_at: now.toISOString()
        })
        .eq('id', offer_id);

      if (updateError) {
        console.error('Error declining offer:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to decline offer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'DECLINED',
        offer_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACCEPT - lógica mais complexa
    if (action === 'ACCEPT') {
      // Verificar se o courier pode aceitar mais pedidos
      const { data: activeCourierOrders } = await supabase
        .from('courier_active_orders')
        .select('order_id')
        .eq('courier_id', user.id);

      const maxActiveOrders = 3; // Limite configurable
      if (activeCourierOrders && activeCourierOrders.length >= maxActiveOrders) {
        return new Response(JSON.stringify({ 
          error: `Cannot accept more than ${maxActiveOrders} orders simultaneously`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verificar se o pedido ainda está disponível (pode ter sido aceito por outro courier)
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status, courier_id')
        .eq('id', offer.order_id)
        .single();

      if (currentOrder?.courier_id && currentOrder.courier_id !== user.id) {
        // Pedido já foi aceito por outro courier
        await supabase
          .from('dispatch_offers')
          .update({ status: 'CANCELLED' })
          .eq('id', offer_id);

        return new Response(JSON.stringify({ 
          error: 'Order was already accepted by another courier'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Transação para aceitar o pedido
      try {
        // 1. Marcar oferta como aceita
        const { error: offerUpdateError } = await supabase
          .from('dispatch_offers')
          .update({ 
            status: 'ACCEPTED',
            responded_at: now.toISOString()
          })
          .eq('id', offer_id);

        if (offerUpdateError) throw offerUpdateError;

        // 2. Cancelar outras ofertas pendentes para este pedido
        await supabase
          .from('dispatch_offers')
          .update({ status: 'CANCELLED' })
          .eq('order_id', offer.order_id)
          .eq('status', 'PENDING')
          .neq('id', offer_id);

        // 3. Atualizar o pedido com o courier
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ 
            courier_id: user.id,
            status: 'courier_assigned',
            updated_at: now.toISOString()
          })
          .eq('id', offer.order_id);

        if (orderUpdateError) throw orderUpdateError;

        // 4. Adicionar à lista de pedidos ativos do courier
        const nextSequence = (activeCourierOrders?.length || 0) + 1;
        const { error: activeOrderError } = await supabase
          .from('courier_active_orders')
          .insert({
            courier_id: user.id,
            order_id: offer.order_id,
            sequence_order: nextSequence,
            distance_km: offer.distance_km,
            pickup_eta: new Date(now.getTime() + offer.eta_minutes * 60 * 1000).toISOString()
          });

        if (activeOrderError) throw activeOrderError;

        // 5. Registrar ganhos estimados
        const { error: earningsError } = await supabase
          .from('courier_earnings')
          .insert({
            courier_id: user.id,
            order_id: offer.order_id,
            amount_cents: offer.estimated_earnings_cents,
            type: 'BASE',
            description: `Delivery #${offer.order_id.slice(0, 8)}`,
            reference_date: now.toISOString().split('T')[0]
          });

        if (earningsError) {
          console.error('Error recording earnings (non-critical):', earningsError);
        }

        // 6. Criar evento de auditoria
        await supabase
          .from('order_events')
          .insert({
            order_id: offer.order_id,
            status: 'courier_assigned',
            actor_id: user.id,
            actor_role: 'courier',
            notes: `Courier accepted delivery offer`,
            metadata: {
              offer_id,
              distance_km: offer.distance_km,
              eta_minutes: offer.eta_minutes,
              earnings_cents: offer.estimated_earnings_cents
            }
          });

        // 7. Notificar restaurante
        await supabase
          .channel(`restaurant:${offer.orders.restaurant_id}`)
          .send({
            type: 'broadcast',
            event: 'courier_assigned',
            payload: {
              order_id: offer.order_id,
              courier_id: user.id,
              eta_minutes: offer.eta_minutes,
              status: 'courier_assigned'
            }
          });

        return new Response(JSON.stringify({
          success: true,
          action: 'ACCEPTED',
          offer_id,
          order_id: offer.order_id,
          earnings_cents: offer.estimated_earnings_cents,
          pickup_eta_minutes: offer.eta_minutes,
          restaurant: {
            name: offer.orders.restaurants.name,
            location: offer.orders.restaurants.location
          },
          delivery_address: offer.orders.delivery_address,
          sequence_order: nextSequence
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (transactionError) {
        console.error('Error in accept transaction:', transactionError);
        
        // Tentar reverter mudanças
        await supabase
          .from('dispatch_offers')
          .update({ status: 'PENDING' })
          .eq('id', offer_id);

        return new Response(JSON.stringify({ error: 'Failed to accept offer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});