import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar pedidos com pagamento pendente há mais de 10 minutos
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, stripe_session_id, created_at')
      .eq('status', 'pending_payment')
      .lt('created_at', tenMinutesAgo)
      .limit(20);

    if (ordersError) {
      console.error('Error fetching pending orders:', ordersError);
      throw new Error('Erro ao buscar pedidos pendentes');
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhum pedido pendente para verificar',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    let processedCount = 0;
    let canceledCount = 0;
    let confirmedCount = 0;

    for (const order of pendingOrders) {
      if (!order.stripe_session_id || !STRIPE_SECRET_KEY) {
        continue;
      }

      try {
        // Verificar status no Stripe
        const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${order.stripe_session_id}`, {
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          },
        });

        if (stripeResponse.ok) {
          const stripeSession = await stripeResponse.json();
          processedCount++;

          if (stripeSession.payment_status === 'paid') {
            // Pagamento confirmado - atualizar para confirmed
            const { error: updateError } = await supabase
              .from('orders')
              .update({ 
                status: 'confirmed',
                status_updated_at: new Date().toISOString()
              })
              .eq('id', order.id);

            if (!updateError) {
              confirmedCount++;
              console.log(`Order ${order.id} automatically confirmed`);
            } else {
              console.error(`Error confirming order ${order.id}:`, updateError);
            }

          } else if (['failed', 'canceled', 'expired'].includes(stripeSession.payment_status)) {
            // Pagamento recusado - cancelar pedido
            const { error: cancelError } = await supabase
              .from('orders')
              .update({ 
                status: 'cancelled',
                status_updated_at: new Date().toISOString()
              })
              .eq('id', order.id);

            if (!cancelError) {
              canceledCount++;
              console.log(`Order ${order.id} automatically canceled due to payment failure`);
            } else {
              console.error(`Error canceling order ${order.id}:`, cancelError);
            }
          }

          // Log da verificação automática para auditoria
          await supabase
            .from('audit_logs')
            .insert({
              table_name: 'orders',
              operation: 'AUTO_PAYMENT_VERIFICATION',
              record_id: order.id,
              new_values: {
                stripe_payment_status: stripeSession.payment_status,
                auto_verified_at: new Date().toISOString()
              },
              user_id: null // Sistema automático
            });
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Verificação automática concluída`,
      processed: processedCount,
      confirmed: confirmedCount,
      canceled: canceledCount,
      total_pending: pendingOrders.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-payment-verification function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});