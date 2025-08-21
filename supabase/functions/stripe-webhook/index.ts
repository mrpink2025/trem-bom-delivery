import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Verificar signature do webhook
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      logStep("Missing signature or webhook secret");
      return new Response("Missing signature or webhook secret", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Event verified", { type: event.type, id: event.id });
    } catch (err) {
      logStep("Error verifying webhook signature", { error: err });
      return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
    }

    // Usar service role para operações no banco
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verificar se evento já foi processado (idempotência)
    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed", { eventId: event.id });
      return new Response("Event already processed", { status: 200 });
    }

    // Registrar evento para idempotência
    await supabase
      .from("stripe_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        metadata: event.data
      });

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.succeeded", { 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount 
        });

        // Buscar payment existente
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle();

        if (payment) {
          // Atualizar payment
          await supabase
            .from("payments")
            .update({
              status: "succeeded",
              receipt_url: paymentIntent.charges.data[0]?.receipt_url,
              stripe_event_id: event.id,
              updated_at: new Date().toISOString()
            })
            .eq("id", payment.id);

          // Atualizar status do pedido usando função com actor system
          if (payment.order_id) {
            const { error: orderError } = await supabase.rpc(
              'update_order_status',
              {
                p_order_id: payment.order_id,
                p_new_status: 'confirmed',
                p_actor_id: null // System actor
              }
            );

            if (orderError) {
              logStep("Error updating order status", { error: orderError });
            } else {
              logStep("Order status updated to confirmed", { orderId: payment.order_id });
              
              // Criar notificação para o usuário
              if (payment.user_id) {
                await supabase
                  .from("notifications")
                  .insert({
                    user_id: payment.user_id,
                    title: "Pagamento Confirmado",
                    message: "Seu pagamento foi processado com sucesso! O restaurante foi notificado.",
                    type: "payment_success",
                    data: {
                      order_id: payment.order_id,
                      amount: paymentIntent.amount,
                      currency: paymentIntent.currency
                    }
                  });
              }
            }
          }

          logStep("Payment updated successfully", { paymentId: payment.id });
        } else {
          logStep("Payment not found", { paymentIntentId: paymentIntent.id });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.payment_failed", { 
          paymentIntentId: paymentIntent.id,
          failureReason: paymentIntent.last_payment_error?.message 
        });

        // Buscar payment existente
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle();

        if (payment) {
          // Atualizar payment como falhou
          await supabase
            .from("payments")
            .update({
              status: "failed",
              failure_reason: paymentIntent.last_payment_error?.message || "Payment failed",
              stripe_event_id: event.id,
              updated_at: new Date().toISOString()
            })
            .eq("id", payment.id);

          // Cancelar pedido usando função com actor system
          if (payment.order_id) {
            const { error: orderError } = await supabase.rpc(
              'update_order_status',
              {
                p_order_id: payment.order_id,
                p_new_status: 'cancelled',
                p_actor_id: null // System actor
              }
            );

            if (orderError) {
              logStep("Error updating order status", { error: orderError });
            }

            // Notificar usuário sobre falha
            if (payment.user_id) {
              await supabase
                .from("notifications")
                .insert({
                  user_id: payment.user_id,
                  title: "Falha no Pagamento",
                  message: "Houve um problema com seu pagamento. Tente novamente.",
                  type: "payment_failed",
                  data: {
                    order_id: payment.order_id,
                    error: paymentIntent.last_payment_error?.message
                  }
                });
            }
          }

          logStep("Payment marked as failed", { paymentId: payment.id });
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          paymentStatus: session.payment_status 
        });

        // Buscar order pelo session ID
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (order && session.payment_status === "paid") {
          // Criar ou atualizar payment record
          const paymentData = {
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_session_id: session.id,
            order_id: order.id,
            user_id: order.user_id,
            amount: session.amount_total || 0,
            currency: session.currency || "brl",
            status: "succeeded",
            stripe_event_id: event.id
          };

          await supabase
            .from("payments")
            .upsert(paymentData, { 
              onConflict: "stripe_payment_intent_id",
              ignoreDuplicates: false 
            });

          logStep("Payment record created/updated from checkout session");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    logStep("Webhook processed successfully", { eventId: event.id });
    return new Response("Webhook processed", { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { error: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});