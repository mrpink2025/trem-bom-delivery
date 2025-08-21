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
    logStep("Function started");

    const { orderId, successUrl, cancelUrl } = await req.json();
    
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Order ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Criar cliente Supabase com anon key para autenticação
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Usar service role para operações privilegiadas
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar pedido com detalhes
    const { data: order, error: orderError } = await supabaseService
      .from("orders")
      .select(`
        *,
        restaurants:restaurant_id (
          name,
          owner_id
        )
      `)
      .eq("id", orderId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (orderError || !order) {
      logStep("Order not found", { orderId, error: orderError });
      return new Response(JSON.stringify({ error: "Order not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Verificar se pedido já tem pagamento processado
    if (order.status !== "placed") {
      return new Response(JSON.stringify({ error: "Order cannot be paid at this status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Order found", { orderId: order.id, amount: order.total_amount });

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Buscar ou criar customer no Stripe
    const customers = await stripe.customers.list({ 
      email: userData.user.email,
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          user_id: userData.user.id
        }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Criar checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Pedido - ${order.restaurants?.name || 'Restaurante'}`,
              description: `Pedido #${order.id.slice(0, 8)}`,
              metadata: {
                order_id: order.id
              }
            },
            unit_amount: Math.round(order.total_amount * 100), // Converter para centavos
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/success?order_id=${order.id}`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/cart`,
      metadata: {
        order_id: order.id,
        user_id: userData.user.id
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          user_id: userData.user.id
        }
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Atualizar pedido com session ID
    await supabaseService
      .from("orders")
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    // Criar registro de pagamento inicial
    await supabaseService
      .from("payments")
      .insert({
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string || "",
        order_id: order.id,
        user_id: userData.user.id,
        amount: Math.round(order.total_amount * 100),
        currency: "brl",
        status: "pending"
      });

    logStep("Payment record created");

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment", { error: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});