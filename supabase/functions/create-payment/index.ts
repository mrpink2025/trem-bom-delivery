import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("=== FUNCTION STARTED ===");

    // Check environment variables first
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    logStep("Environment check", { 
      hasStripeKey: !!stripeKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    if (!stripeKey) {
      logStep("ERROR: No Stripe key");
      return new Response(JSON.stringify({ error: "Stripe key not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      logStep("Raw request body", bodyText);
      requestBody = JSON.parse(bodyText);
    } catch (e) {
      logStep("Error parsing request body", e.message);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { orderData } = requestBody;
    
    if (!orderData) {
      logStep("No order data provided");
      return new Response(JSON.stringify({ error: "Order data is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Order data received", orderData);

    // Create Supabase client for auth
    const supabaseClient = createClient(
      supabaseUrl ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    logStep("Auth header present", !!authHeader);
    
    if (!authHeader) {
      logStep("No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: userData.user.id, email: userData.user.email });

    // Initialize Stripe
    logStep("Initializing Stripe");
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Test Stripe connection with a simple API call
    try {
      const customers = await stripe.customers.list({ limit: 1 });
      logStep("Stripe connection successful", { customersCount: customers.data.length });
    } catch (stripeError) {
      logStep("Stripe connection failed", stripeError.message);
      return new Response(JSON.stringify({ error: "Stripe configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Check if Stripe customer exists for this user
    const customers = await stripe.customers.list({ 
      email: userData.user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      logStep("No existing customer found, will create during checkout");
    }

    // Create line items from order data
    const lineItems = orderData.items.map((item: any) => ({
      price_data: {
        currency: "brl",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add delivery fee as separate line item
    if (orderData.delivery_fee > 0) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: "Taxa de Entrega",
          },
          unit_amount: Math.round(orderData.delivery_fee * 100),
        },
        quantity: 1,
      });
    }

    logStep("Created line items", { lineItemsCount: lineItems.length, total: orderData.total });

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userData.user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        user_id: userData.user.id,
        restaurant_id: orderData.restaurant_id,
        order_total: orderData.total.toString(),
      },
    });

    logStep("Checkout session created successfully", { 
      sessionId: session.id, 
      url: session.url 
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("=== FATAL ERROR ===", { error: errorMessage, stack: error.stack });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});