import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { type, payload } = await req.json();
    console.log(`[PUSH-NOTIFICATIONS] Processing ${type} notification`);

    switch (type) {
      case 'subscribe':
        return await handleSubscription(supabaseClient, payload);
      case 'send_order_update':
        return await sendOrderUpdateNotification(supabaseClient, payload);
      case 'send_message_notification':
        return await sendMessageNotification(supabaseClient, payload);
      case 'send_bulk_notification':
        return await sendBulkNotification(supabaseClient, payload);
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function handleSubscription(supabase: any, payload: any) {
  const { user_id, subscription, device_type } = payload;
  
  // Upsert subscription
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      device_type: device_type || 'web',
      is_active: true
    }, {
      onConflict: 'user_id,endpoint'
    });

  if (error) throw error;

  console.log(`[PUSH-NOTIFICATIONS] Subscription saved for user ${user_id}`);
  
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendOrderUpdateNotification(supabase: any, payload: any) {
  const { order_id, status, user_id } = payload;
  
  // Get user subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true);

  if (!subscriptions?.length) {
    console.log(`[PUSH-NOTIFICATIONS] No subscriptions found for user ${user_id}`);
    return new Response(
      JSON.stringify({ success: true, sent: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const notification = getOrderStatusNotification(status, order_id);
  let sentCount = 0;

  for (const subscription of subscriptions) {
    try {
      await sendWebPushNotification(subscription, notification);
      sentCount++;
    } catch (error) {
      console.error(`Failed to send notification to ${subscription.endpoint}:`, error);
      
      // Deactivate failed subscriptions
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('id', subscription.id);
    }
  }

  console.log(`[PUSH-NOTIFICATIONS] Sent ${sentCount} order update notifications`);
  
  return new Response(
    JSON.stringify({ success: true, sent: sentCount }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendMessageNotification(supabase: any, payload: any) {
  const { order_id, sender_name, message_preview } = payload;
  
  // Get order participants
  const { data: order } = await supabase
    .from('orders')
    .select('user_id, courier_id, restaurants!inner(owner_id)')
    .eq('id', order_id)
    .single();

  if (!order) throw new Error('Order not found');

  const participants = [
    order.user_id,
    order.courier_id,
    order.restaurants.owner_id
  ].filter(Boolean);

  // Get all subscriptions for participants
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', participants)
    .eq('is_active', true);

  const notification: NotificationPayload = {
    title: `Nova mensagem de ${sender_name}`,
    body: message_preview,
    icon: '/icon-192x192.png',
    data: { 
      type: 'message',
      order_id,
      url: `/order-chat/${order_id}`
    },
    actions: [
      { action: 'view', title: 'Ver conversa' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  let sentCount = 0;
  for (const subscription of subscriptions || []) {
    try {
      await sendWebPushNotification(subscription, notification);
      sentCount++;
    } catch (error) {
      console.error(`Failed to send message notification:`, error);
    }
  }

  console.log(`[PUSH-NOTIFICATIONS] Sent ${sentCount} message notifications`);
  
  return new Response(
    JSON.stringify({ success: true, sent: sentCount }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendBulkNotification(supabase: any, payload: any) {
  const { user_ids, notification } = payload;
  
  // Get subscriptions for specified users
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', user_ids)
    .eq('is_active', true);

  let sentCount = 0;
  for (const subscription of subscriptions || []) {
    try {
      await sendWebPushNotification(subscription, notification);
      sentCount++;
    } catch (error) {
      console.error(`Failed to send bulk notification:`, error);
    }
  }

  console.log(`[PUSH-NOTIFICATIONS] Sent ${sentCount} bulk notifications`);
  
  return new Response(
    JSON.stringify({ success: true, sent: sentCount }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getOrderStatusNotification(status: string, orderId: string): NotificationPayload {
  const statusMessages = {
    confirmed: {
      title: 'Pedido Confirmado! 🎉',
      body: 'Seu pedido foi confirmado e está sendo preparado.'
    },
    preparing: {
      title: 'Preparando seu Pedido 👨‍🍳',
      body: 'O restaurante está preparando seu pedido.'
    },
    ready: {
      title: 'Pedido Pronto! 📦',
      body: 'Seu pedido está pronto e aguardando o entregador.'
    },
    out_for_delivery: {
      title: 'Saiu para Entrega! 🛵',
      body: 'Seu pedido está a caminho!'
    },
    delivered: {
      title: 'Pedido Entregue! ✅',
      body: 'Seu pedido foi entregue com sucesso. Bom apetite!'
    },
    cancelled: {
      title: 'Pedido Cancelado ❌',
      body: 'Seu pedido foi cancelado.'
    }
  };

  const message = statusMessages[status as keyof typeof statusMessages] || {
    title: 'Atualização do Pedido',
    body: 'Houve uma atualização no seu pedido.'
  };

  return {
    ...message,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { 
      type: 'order_update',
      order_id: orderId,
      status,
      url: `/tracking/${orderId}`
    },
    actions: [
      { action: 'view', title: 'Ver pedido' },
      { action: 'close', title: 'Fechar' }
    ]
  };
}

async function sendWebPushNotification(subscription: any, notification: NotificationPayload) {
  const vapidKeys = {
    publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY'),
  };

  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn('VAPID keys not configured, skipping web push');
    return;
  }

  // For production, you would use web-push library
  // This is a simplified version for demonstration
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  // In a real implementation, use web-push library to send the notification
  console.log(`[PUSH-NOTIFICATIONS] Would send to ${subscription.endpoint}:`, notification);
}