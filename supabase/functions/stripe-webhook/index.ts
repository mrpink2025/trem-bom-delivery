import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuração de tolerância para assinatura Stripe (5 minutos)
const STRIPE_WEBHOOK_TOLERANCE = 300;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK-V3] ${step}${detailsStr}`);
};

// Verificar idempotência do evento Stripe
const isEventProcessed = async (supabase: any, eventId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('stripe_events')
    .select('stripe_event_id, processed_at')
    .eq('stripe_event_id', eventId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not found is OK
    logStep('Error checking event', { error: error.message });
    return false;
  }
  
  return !!data?.processed_at;
};

// Marcar evento como processado
const markEventProcessed = async (supabase: any, eventId: string, result: string, metadata: any = {}) => {
  const { error } = await supabase
    .from('stripe_events')
    .upsert({
      stripe_event_id: eventId,
      processed_at: new Date().toISOString(),
      data: { ...metadata, processing_result: result }
    });
  
  if (error) {
    logStep('Error marking event processed', { error: error.message });
  }
};

// Validar dados do pagamento contra o pedido
const validatePaymentData = (paymentIntent: Stripe.PaymentIntent, order: any): { valid: boolean, errors: string[] } => {
  const errors: string[] = [];
  
  // Validar valor
  if (paymentIntent.amount !== Math.round(order.total_amount * 100)) {
    errors.push(`Amount mismatch: expected ${order.total_amount * 100}, got ${paymentIntent.amount}`);
  }
  
  // Validar moeda
  if (paymentIntent.currency !== (order.currency || 'brl')) {
    errors.push(`Currency mismatch: expected ${order.currency || 'brl'}, got ${paymentIntent.currency}`);
  }
  
  // Validar metadata do pedido
  if (!paymentIntent.metadata?.order_id || paymentIntent.metadata.order_id !== order.id) {
    errors.push(`Order ID mismatch: expected ${order.id}, got ${paymentIntent.metadata?.order_id}`);
  }
  
  return { valid: errors.length === 0, errors };
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

    // 🔒 CRÍTICO: Usar raw body para verificação de assinatura
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      logStep("Missing signature or webhook secret");
      return new Response("Missing signature or webhook secret", { status: 400 });
    }

    const rawBody = await req.text(); // RAW BODY - essencial para verificação
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret, STRIPE_WEBHOOK_TOLERANCE);
      logStep("Event signature verified", { 
        type: event.type, 
        id: event.id,
        created: new Date(event.created * 1000).toISOString(),
        tolerance_used: STRIPE_WEBHOOK_TOLERANCE 
      });
    } catch (err) {
      logStep("Error verifying webhook signature", { 
        error: err.message,
        signature_header: signature?.substring(0, 20) + '...',
        body_length: rawBody.length,
        tolerance: STRIPE_WEBHOOK_TOLERANCE
      });
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // Usar service role para operações no banco
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 🔒 Verificar idempotência ANTES de qualquer processamento
    if (await isEventProcessed(supabase, event.id)) {
      logStep("Event already processed", { eventId: event.id });
      return new Response("Event already processed", { status: 200 });
    }

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.succeeded", { 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata
        });

        // 🔒 Validar se há order_id no metadata
        const orderId = paymentIntent.metadata?.order_id;
        if (!orderId) {
          await markEventProcessed(supabase, event.id, 'rejected_no_order_id');
          return new Response("No order_id in payment metadata", { status: 400 });
        }

        // Buscar pedido
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (orderError || !order) {
          logStep("Order not found", { orderId, error: orderError });
          await markEventProcessed(supabase, event.id, 'rejected_order_not_found', { orderId });
          return new Response("Order not found", { status: 404 });
        }

        // 🔒 VALIDAÇÃO CRÍTICA: Verificar valores, moeda e metadata
        const validation = validatePaymentData(paymentIntent, order);
        if (!validation.valid) {
          logStep("Payment validation failed", { 
            orderId, 
            errors: validation.errors,
            expected: { amount: order.total_amount * 100, currency: order.currency },
            received: { amount: paymentIntent.amount, currency: paymentIntent.currency }
          });
          
          // Registrar tentativa de fraude/erro
          await supabase.from("audit_logs").insert({
            table_name: 'stripe_webhook',
            record_id: orderId,
            operation: 'PAYMENT_VALIDATION_FAILED',
            old_values: { 
              order_amount: order.total_amount * 100, 
              order_currency: order.currency 
            },
            new_values: { 
              payment_amount: paymentIntent.amount, 
              payment_currency: paymentIntent.currency,
              errors: validation.errors
            },
            user_id: null
          });
          
          await markEventProcessed(supabase, event.id, 'rejected_validation_failed', { 
            errors: validation.errors 
          });
          return new Response("Payment validation failed", { status: 422 });
        }

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

          // 🔒 Usar RPC v3 com validação e lock
          const { data: statusResult, error: statusError } = await supabase.rpc(
            'update_order_status_v3',
            {
              p_order_id: orderId,
              p_new_status: 'confirmed',
              p_actor_id: null, // System actor
              p_validation_data: {
                payment_intent_id: paymentIntent.id,
                amount_validated: paymentIntent.amount,
                currency_validated: paymentIntent.currency,
                webhook_event_id: event.id,
                stripe_charge_id: paymentIntent.charges.data[0]?.id
              }
            }
          );

          if (statusError) {
            logStep("Error updating order status", { error: statusError });
            await markEventProcessed(supabase, event.id, 'error_status_update', { error: statusError });
          } else {
            logStep("Order status updated successfully", { 
              orderId, 
              result: statusResult,
              locked: true 
            });
            
            // Criar notificação adicional de sucesso
            if (payment.user_id) {
              await supabase
                .from("notifications")
                .insert({
                  user_id: payment.user_id,
                  title: "💳 Pagamento Confirmado",
                  message: `Pagamento de R$ ${(paymentIntent.amount / 100).toFixed(2)} processado com sucesso!`,
                  type: "payment_success",
                  data: {
                    order_id: orderId,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    receipt_url: paymentIntent.charges.data[0]?.receipt_url
                  }
                });
            }
            
            await markEventProcessed(supabase, event.id, 'success', { orderId });
          }
        } else {
          logStep("Payment record not found", { paymentIntentId: paymentIntent.id });
          await markEventProcessed(supabase, event.id, 'warning_payment_not_found');
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

          // 🔒 Cancelar pedido com RPC v3 (com lock)
          if (payment.order_id) {
            const { error: orderError } = await supabase.rpc(
              'update_order_status_v3',
              {
                p_order_id: payment.order_id,
                p_new_status: 'cancelled',
                p_actor_id: null, // System actor
                p_validation_data: {
                  payment_intent_id: paymentIntent.id,
                  failure_reason: paymentIntent.last_payment_error?.message,
                  webhook_event_id: event.id,
                  failure_code: paymentIntent.last_payment_error?.code
                }
              }
            );

            if (orderError) {
              logStep("Error updating order status to cancelled", { error: orderError });
            }

            // Notificar usuário sobre falha
            if (payment.user_id) {
              await supabase
                .from("notifications")
                .insert({
                  user_id: payment.user_id,
                  title: "❌ Falha no Pagamento",
                  message: "Houve um problema com seu pagamento. Tente novamente ou use outro método.",
                  type: "payment_failed",
                  data: {
                    order_id: payment.order_id,
                    error: paymentIntent.last_payment_error?.message,
                    payment_intent_id: paymentIntent.id
                  }
                });
            }
          }

          await markEventProcessed(supabase, event.id, 'payment_failed_processed', { 
            paymentId: payment.id 
          });
          logStep("Payment marked as failed", { paymentId: payment.id });
        } else {
          await markEventProcessed(supabase, event.id, 'payment_failed_no_record');
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadata: session.metadata 
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

          await markEventProcessed(supabase, event.id, 'checkout_completed', { 
            orderId: order.id 
          });
          logStep("Payment record created/updated from checkout session");
        } else {
          await markEventProcessed(supabase, event.id, 'checkout_no_action', { 
            orderFound: !!order, 
            paymentStatus: session.payment_status 
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
        await markEventProcessed(supabase, event.id, 'unhandled_event_type', { 
          eventType: event.type 
        });
    }

    logStep("Webhook processed successfully", { eventId: event.id });
    return new Response("Webhook processed successfully", { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR processing webhook", { error: errorMessage, stack: error.stack });
    
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      eventId: "unknown" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});