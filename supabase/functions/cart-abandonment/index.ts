import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Starting cart abandonment check...');

    // Find carts abandoned for more than 1 hour that haven't received notifications
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: abandonedCarts, error } = await supabaseClient
      .from('saved_carts')
      .select(`
        *,
        profiles!inner(full_name, user_id)
      `)
      .lt('created_at', oneHourAgo)
      .eq('notification_sent', false)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching abandoned carts:', error);
      throw error;
    }

    console.log(`Found ${abandonedCarts?.length || 0} abandoned carts`);

    // Send notifications for each abandoned cart
    for (const cart of abandonedCarts || []) {
      try {
        // Create in-app notification
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: cart.user_id,
            title: 'Carrinho Abandonado',
            message: 'Você tem itens salvos no seu carrinho. Que tal finalizar o pedido?',
            type: 'cart_abandonment',
            data: { cart_id: cart.id }
          });

        // Mark cart as notification sent
        await supabaseClient
          .from('saved_carts')
          .update({ notification_sent: true })
          .eq('id', cart.id);

        console.log(`Notification sent for cart ${cart.id}`);
      } catch (error) {
        console.error(`Error sending notification for cart ${cart.id}:`, error);
      }
    }

    // Clean up expired carts
    const { error: cleanupError } = await supabaseClient
      .from('saved_carts')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (cleanupError) {
      console.error('Error cleaning up expired carts:', cleanupError);
    } else {
      console.log('Expired carts cleaned up');
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCarts: abandonedCarts?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Cart abandonment function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});