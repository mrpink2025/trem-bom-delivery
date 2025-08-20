import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment verification started");

    // Initialize Supabase with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get session ID from request
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    
    logStep("Session ID received", { sessionId });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Stripe session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      status: session.status 
    });

    // Find the order
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (orderError) {
      logStep("Order not found", { error: orderError.message });
      throw new Error(`Order not found: ${orderError.message}`);
    }

    logStep("Order found", { orderId: order.id, currentStatus: order.status });

    // Update order status based on payment status
    let newStatus = order.status;
    let shouldNotify = false;

    if (session.payment_status === 'paid' && order.status === 'pending_payment') {
      newStatus = 'confirmed';
      shouldNotify = true;
      logStep("Payment confirmed, updating order status");
    } else if (session.status === 'expired' || session.payment_status === 'unpaid') {
      newStatus = 'cancelled';
      logStep("Payment failed/expired, cancelling order");
    }

    // Update order in database
    if (newStatus !== order.status) {
      const { error: updateError } = await supabaseService
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) throw new Error(`Failed to update order: ${updateError.message}`);
      logStep("Order status updated", { orderId: order.id, newStatus });

      // If payment confirmed, send real-time notification
      if (shouldNotify) {
        logStep("Sending real-time notifications");
        
        // Notify restaurant about new order
        await supabaseService
          .channel(`restaurant_${order.restaurant_id}`)
          .send({
            type: 'broadcast',
            event: 'new_order',
            payload: {
              order_id: order.id,
              status: newStatus,
              total_amount: order.total_amount,
              items: order.items,
              delivery_address: order.delivery_address,
              created_at: order.created_at,
            }
          });

        // Notify user about order confirmation
        await supabaseService
          .channel(`user_${order.user_id}`)
          .send({
            type: 'broadcast',
            event: 'order_confirmed',
            payload: {
              order_id: order.id,
              status: newStatus,
              estimated_delivery_time: order.estimated_delivery_time,
            }
          });

        logStep("Notifications sent");
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      orderId: order.id,
      paymentStatus: session.payment_status,
      orderStatus: newStatus,
      paid: session.payment_status === 'paid'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});