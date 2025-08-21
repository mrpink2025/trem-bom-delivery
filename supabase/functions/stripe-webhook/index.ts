import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log('Received webhook event:', event.type, event.id);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(supabase, paymentIntent);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(supabase, paymentIntent);
        break;
      }
      
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(supabase, invoice);
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChanged(supabase, subscription);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function handlePaymentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  // Registrar pagamento
  await supabase.from('payments').upsert({
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: 'succeeded',
    metadata: paymentIntent.metadata,
    created_at: new Date(paymentIntent.created * 1000).toISOString(),
  });

  // Atualizar pedido se existir
  if (paymentIntent.metadata?.order_id) {
    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: paymentIntent.metadata.order_id,
      p_new_status: 'confirmed'
    });

    if (!error) {
      console.log(`Order ${paymentIntent.metadata.order_id} confirmed after payment`);
    }
  }
}

async function handlePaymentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  // Registrar falha do pagamento
  await supabase.from('payments').upsert({
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: 'failed',
    metadata: paymentIntent.metadata,
    failure_reason: paymentIntent.last_payment_error?.message,
    created_at: new Date(paymentIntent.created * 1000).toISOString(),
  });

  // Cancelar pedido se existir
  if (paymentIntent.metadata?.order_id) {
    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: paymentIntent.metadata.order_id,
      p_new_status: 'cancelled'
    });

    if (!error) {
      console.log(`Order ${paymentIntent.metadata.order_id} cancelled after payment failure`);
    }
  }
}

async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);
  
  // Buscar pedido pela session_id
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', session.id)
    .single();

  if (order) {
    // Atualizar status do pedido
    await supabase.rpc('update_order_status', {
      p_order_id: order.id,
      p_new_status: 'confirmed'
    });

    // Criar notificação para o restaurante
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', order.restaurant_id)
      .single();

    if (restaurant?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: restaurant.owner_id,
        title: 'Novo Pedido Confirmado',
        message: `Pedido #${order.id.substring(0, 8)} confirmado - R$ ${order.total_amount.toFixed(2)}`,
        type: 'new_order',
        data: { order_id: order.id }
      });
    }

    // Enviar notificação realtime
    await supabase
      .channel(`restaurant_${order.restaurant_id}`)
      .send({
        type: 'broadcast',
        event: 'new_order',
        payload: { order_id: order.id, status: 'confirmed' }
      });
  }
}

async function handleInvoicePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Atualizar assinatura do usuário
  if (invoice.customer && invoice.subscription) {
    await supabase.from('user_subscriptions').upsert({
      stripe_subscription_id: invoice.subscription,
      stripe_customer_id: invoice.customer,
      status: 'active',
      current_period_start: new Date(invoice.period_start * 1000).toISOString(),
      current_period_end: new Date(invoice.period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}

async function handleSubscriptionChanged(supabase: any, subscription: Stripe.Subscription) {
  console.log('Subscription changed:', subscription.id);
  
  await supabase.from('user_subscriptions').upsert({
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString()
  });
}