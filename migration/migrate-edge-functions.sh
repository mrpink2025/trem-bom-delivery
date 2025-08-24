#!/bin/bash

# Edge Functions Migration Script for Delivery Trem Bão
# This script migrates all Edge Functions from cloud to self-hosted

set -e

echo "⚡ Starting Edge Functions Migration..."

# Function to create edge function with TypeScript content
create_function() {
    local name=$1
    local content=$2
    
    echo "📦 Creating function: $name"
    mkdir -p "volumes/functions/$name"
    echo "$content" > "volumes/functions/$name/index.ts"
}

cd ~/supabase-delivery/supabase/docker

# Admin Approve Function
create_function "admin-approve" '
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { user_id, user_type } = await req.json()
    
    let tableName: string
    let statusColumn: string
    
    switch (user_type) {
      case "courier":
        tableName = "couriers"
        statusColumn = "status"
        break
      case "merchant":
        tableName = "merchants" 
        statusColumn = "status"
        break
      default:
        throw new Error("Invalid user type")
    }

    const { error } = await supabaseClient
      .from(tableName)
      .update({ 
        [statusColumn]: "APPROVED",
        approved_at: new Date().toISOString()
      })
      .eq("id", user_id)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
'

# Dispatch Accept Function
create_function "dispatch-accept" '
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")!
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error("Unauthorized")
    }

    const { offer_id } = await req.json()
    
    if (!offer_id) {
      throw new Error("offer_id is required")
    }

    console.log(`Courier ${user.id} accepting offer: ${offer_id}`)

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Accept the dispatch offer
    const { data: result, error: acceptError } = await supabaseService
      .rpc("accept_dispatch_offer", {
        p_offer_id: offer_id,
        p_courier_id: user.id,
        p_order_id: null
      })

    if (acceptError || result?.error) {
      throw new Error(result?.error || acceptError.message)
    }

    console.log(`Offer ${offer_id} successfully accepted by courier ${user.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        order_id: result.order_id,
        courier_id: user.id,
        message: "Offer successfully accepted"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Dispatch accept error:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})
'

# Create Payment Function
create_function "create-payment" '
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.21.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    })

    const authHeader = req.headers.get("Authorization")!
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error("Unauthorized")
    }

    const { orderData } = await req.json()

    // Create order in database
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        restaurant_id: orderData.restaurant_id,
        total_amount: orderData.total_amount,
        delivery_fee: orderData.delivery_fee,
        items: orderData.items,
        delivery_address: orderData.delivery_address,
        delivery_location: orderData.delivery_location,
        notes: orderData.notes,
        status: "pending_payment"
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: orderData.items.map((item: any) => ({
        price_data: {
          currency: "brl",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout?cancelled=true`,
      metadata: {
        order_id: order.id,
        user_id: user.id,
      },
    })

    // Update order with stripe session id
    await supabaseClient
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id)

    return new Response(
      JSON.stringify({
        sessionUrl: session.url,
        orderId: order.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Create payment error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
'

# Stripe Webhook Function
create_function "stripe-webhook" '
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.21.0"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature")
  const body = await req.text()
  
  let receivedEvent
  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message)
    return new Response(err.message, { status: 400 })
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  console.log(`🔔 Event received: ${receivedEvent.type}`)

  try {
    switch (receivedEvent.type) {
      case "checkout.session.completed":
        const session = receivedEvent.data.object
        const orderId = session.metadata.order_id

        // Update order status to confirmed
        await supabaseClient
          .from("orders")
          .update({ 
            status: "confirmed",
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId)

        console.log(`✅ Order ${orderId} confirmed`)
        break

      default:
        console.log(`🤷‍♀️ Unhandled event type: ${receivedEvent.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})
'

# Location Ping Function
create_function "location-ping" '
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")!
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error("Unauthorized")
    }

    const { latitude, longitude, speed, heading, accuracy, battery_level } = await req.json()

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Update courier presence
    await supabaseService
      .from("courier_presence")
      .upsert({
        courier_id: user.id,
        last_location: `POINT(${longitude} ${latitude})`,
        last_seen: new Date().toISOString(),
        battery_level: battery_level,
        is_online: true
      })

    // Insert location tracking
    await supabaseService
      .from("courier_locations")
      .insert({
        courier_id: user.id,
        location: `POINT(${longitude} ${latitude})`,
        speed_mps: speed,
        heading_deg: heading,
        accuracy_m: accuracy
      })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Location ping error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
'

# Push Notifications Function  
create_function "push-notifications" '
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, data } = await req.json()

    console.log(`📱 Sending push notification to user: ${user_id}`)
    console.log(`Title: ${title}`)
    console.log(`Body: ${body}`)

    // Here you would integrate with your push notification service
    // For now, just log the notification
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Notification sent successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Push notification error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
'

# Custom Auth Email Function
create_function "custom-auth-email" '
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "https://esm.sh/resend@3.2.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface AuthEmailRequest {
  type: string
  email: string
  token?: string
  redirect_to?: string
  site_url?: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, email, token, redirect_to, site_url }: AuthEmailRequest = await req.json()

    let subject: string
    let html: string

    switch (type) {
      case "signup":
        subject = "Confirme seu cadastro - Delivery Trem Bão"
        html = `
          <h1>Bem-vindo ao Delivery Trem Bão!</h1>
          <p>Clique no link abaixo para confirmar seu cadastro:</p>
          <a href="${site_url}/auth/confirm?token=${token}&type=signup&redirect_to=${redirect_to}">
            Confirmar Cadastro
          </a>
        `
        break
      case "recovery":
        subject = "Redefinir senha - Delivery Trem Bão"
        html = `
          <h1>Redefinir sua senha</h1>
          <p>Clique no link abaixo para redefinir sua senha:</p>
          <a href="${site_url}/auth/confirm?token=${token}&type=recovery&redirect_to=${redirect_to}">
            Redefinir Senha
          </a>
        `
        break
      case "magic_link":
        subject = "Seu link de acesso - Delivery Trem Bão"
        html = `
          <h1>Acesso sem senha</h1>
          <p>Clique no link abaixo para fazer login:</p>
          <a href="${site_url}/auth/confirm?token=${token}&type=magic_link&redirect_to=${redirect_to}">
            Fazer Login
          </a>
        `
        break
      default:
        throw new Error(`Tipo de email não suportado: ${type}`)
    }

    const { data, error } = await resend.emails.send({
      from: "Delivery Trem Bão <noreply@deliverytrembao.com.br>",
      to: [email],
      subject,
      html,
    })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Email sending error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
}

serve(handler)
'

echo "✅ All Edge Functions created successfully!"
echo ""
echo "📋 Created functions:"
echo "  - admin-approve"
echo "  - dispatch-accept"  
echo "  - create-payment"
echo "  - stripe-webhook"
echo "  - location-ping"
echo "  - push-notifications"
echo "  - custom-auth-email"
echo ""
echo "🔧 Next: Update function secrets in .env file"
'

chmod +x migrate-edge-functions.sh