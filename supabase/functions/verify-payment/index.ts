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
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('ID do pedido é obrigatório');
    }

    // Verificar autorização
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização não encontrado');
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se o pedido existe e obter detalhes
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw new Error('Pedido não encontrado');
    }

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    let paymentVerified = false;
    let paymentDetails = null;
    let stripeSession = null;

    // Verificar status do pagamento dependendo do método
    if (order.stripe_session_id) {
      // Verificar no Stripe
      const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
      
      if (STRIPE_SECRET_KEY) {
        try {
          const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${order.stripe_session_id}`, {
            headers: {
              'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            },
          });

          if (stripeResponse.ok) {
            stripeSession = await stripeResponse.json();
            paymentVerified = stripeSession.payment_status === 'paid';
            paymentDetails = {
              method: 'stripe',
              status: stripeSession.payment_status,
              amount: stripeSession.amount_total,
              currency: stripeSession.currency,
            };

            // Atualizar status do pedido baseado no pagamento
            if (order.status === 'pending_payment') {
              if (paymentVerified) {
                // Pagamento aprovado - confirmar pedido
                const { error: updateError } = await supabase
                  .from('orders')
                  .update({ 
                    status: 'confirmed',
                    status_updated_at: new Date().toISOString()
                  })
                  .eq('id', orderId);

                if (updateError) {
                  console.error('Error updating order status to confirmed:', updateError);
                }
              } else if (stripeSession && ['failed', 'canceled', 'expired'].includes(stripeSession.payment_status)) {
                // Pagamento recusado/falhado - cancelar pedido automaticamente
                const { error: cancelError } = await supabase
                  .from('orders')
                  .update({ 
                    status: 'cancelled',
                    status_updated_at: new Date().toISOString()
                  })
                  .eq('id', orderId);

                if (cancelError) {
                  console.error('Error canceling order:', cancelError);
                } else {
                  console.log(`Order ${orderId} automatically canceled due to payment failure`);
                }
              }
            }
          }
        } catch (stripeError) {
          console.error('Error checking Stripe payment:', stripeError);
        }
      }
    } else {
      // Se não há stripe_session_id, pode ser outro método de pagamento
      // Por enquanto, assumimos que precisa de verificação manual
      paymentVerified = false;
      paymentDetails = {
        method: 'manual',
        status: 'pending_manual_verification',
        message: 'Este pagamento requer verificação manual'
      };
    }

    // Log da verificação para auditoria
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'orders',
        operation: 'PAYMENT_VERIFICATION',
        record_id: orderId,
        new_values: {
          verified: paymentVerified,
          payment_details: paymentDetails,
          verified_at: new Date().toISOString()
        },
        user_id: order.user_id
      });

    return new Response(JSON.stringify({
      success: true,
      verified: paymentVerified,
      payment_details: paymentDetails,
      order_status: paymentVerified ? 'confirmed' : order.status,
      message: paymentVerified 
        ? 'Pagamento verificado com sucesso!' 
        : 'Pagamento ainda não foi processado ou requer verificação manual.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-payment function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor',
      verified: false
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});