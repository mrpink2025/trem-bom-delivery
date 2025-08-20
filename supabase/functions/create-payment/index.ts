import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  orderData: {
    items: Array<{
      menu_item_id: string;
      name: string;
      price: number;
      quantity: number;
      special_instructions?: string;
    }>;
    restaurant_id: string;
    delivery_address: any;
    special_instructions?: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment function started");

    // Initialize Supabase with service role for order creation
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Initialize Supabase with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, userEmail: user.email });

    // Get request data
    const { orderData }: PaymentRequest = await req.json();
    logStep("Order data received", { 
      total: orderData.total, 
      itemCount: orderData.items.length,
      restaurantId: orderData.restaurant_id 
    });

    // Get restaurant data
    const { data: restaurant, error: restaurantError } = await supabaseService
      .from('restaurants')
      .select('*')
      .eq('id', orderData.restaurant_id)
      .single();

    if (restaurantError) throw new Error(`Restaurant not found: ${restaurantError.message}`);
    logStep("Restaurant found", { name: restaurant.name });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe initialized");

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create order in database first
    const newOrder = {
      user_id: user.id,
      restaurant_id: orderData.restaurant_id,
      status: 'pending_payment',
      total_amount: orderData.total,
      delivery_address: orderData.delivery_address,
      restaurant_address: restaurant.address,
      pickup_location: restaurant.address,
      delivery_location: {
        ...orderData.delivery_address,
        lat: -23.5505, // Default coordinates
        lng: -46.6333,
      },
      estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      items: orderData.items,
      special_instructions: orderData.special_instructions,
    };

    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert(newOrder)
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Order created in database", { orderId: order.id });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        ...orderData.items.map(item => ({
          price_data: {
            currency: "brl",
            product_data: { 
              name: `${item.name} (x${item.quantity})`,
              description: item.special_instructions || undefined,
            },
            unit_amount: Math.round(item.price * 100), // Convert to cents
          },
          quantity: item.quantity,
        })),
        // Add delivery fee as separate line item
        {
          price_data: {
            currency: "brl",
            product_data: { 
              name: `Taxa de Entrega - ${restaurant.name}`,
            },
            unit_amount: Math.round(orderData.delivery_fee * 100),
          },
          quantity: 1,
        }
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/tracking/${order.id}?payment=success`,
      cancel_url: `${req.headers.get("origin")}/checkout?payment=cancelled`,
      metadata: {
        order_id: order.id,
        user_id: user.id,
        restaurant_id: orderData.restaurant_id,
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          user_id: user.id,
          restaurant_id: orderData.restaurant_id,
        },
      },
    });

    logStep("Stripe session created", { sessionId: session.id, sessionUrl: session.url });

    // Update order with stripe session info
    await supabaseService
      .from('orders')
      .update({ 
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    logStep("Order updated with Stripe session ID");

    return new Response(JSON.stringify({ 
      url: session.url,
      orderId: order.id,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});