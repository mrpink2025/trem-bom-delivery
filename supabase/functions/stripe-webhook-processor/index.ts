import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    let event;

    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error('Invalid JSON body:', err);
      return new Response('Invalid JSON', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log('Webhook event type:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabaseClient, event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(supabaseClient, event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(supabaseClient, event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleCheckoutCompleted(supabaseClient: any, session: any) {
  console.log('Processing checkout.session.completed:', session.id);

  try {
    // Update order status
    const { error: orderError } = await supabaseClient
      .from('orders')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_session_id', session.id);

    if (orderError) {
      console.error('Error updating order:', orderError);
      throw orderError;
    }

    // Update payment transaction
    const { error: paymentError } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', session.payment_intent);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
    }

    console.log('Checkout session processed successfully');
  } catch (error) {
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(supabaseClient: any, paymentIntent: any) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);

  try {
    const { error } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }

    console.log('Payment intent processed successfully');
  } catch (error) {
    console.error('Error processing payment intent:', error);
    throw error;
  }
}

async function handlePaymentFailed(supabaseClient: any, paymentIntent: any) {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);

  try {
    const { error } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }

    console.log('Failed payment processed successfully');
  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
}