import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const restaurantId = url.searchParams.get('restaurant_id');
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      if (!restaurantId) {
        return new Response(JSON.stringify({ error: 'restaurant_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verificar se o usuário tem acesso ao restaurante
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('owner_id')
        .eq('id', restaurantId)
        .single();

      if (!restaurant || restaurant.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let query = supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          delivery_fee,
          created_at,
          updated_at,
          delivery_address,
          scheduled_delivery_time,
          special_instructions,
          user_id,
          profiles!inner(full_name, phone),
          order_items(
            id,
            quantity,
            unit_price,
            special_instructions,
            menu_items(name, image_url)
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      } else {
        // Status relevantes para o board
        query = query.in('status', [
          'placed', 'confirmed', 'preparing', 'ready', 
          'courier_assigned', 'en_route_to_store', 'picked_up', 
          'out_for_delivery', 'arrived_at_destination'
        ]);
      }

      const { data: orders, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calcular timers SLA para cada pedido
      const ordersWithTimers = orders.map(order => {
        const now = new Date();
        const created = new Date(order.created_at);
        const elapsedMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
        
        // SLA padrão por status
        const slaTargets = {
          placed: 3,      // 3 min para aceitar
          confirmed: 20,  // 20 min para preparar  
          preparing: 25,  // 25 min total preparo
          ready: 10,      // 10 min para courier pegar
          courier_assigned: 15, // 15 min para chegar na loja
        };

        const targetMinutes = slaTargets[order.status as keyof typeof slaTargets] || 30;
        const remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);
        const isOverdue = elapsedMinutes > targetMinutes;
        
        // Status do timer: green (>2min), yellow (0-2min), red (overdue)
        let timerStatus = 'green';
        if (isOverdue) timerStatus = 'red';
        else if (remainingMinutes <= 2) timerStatus = 'yellow';

        return {
          ...order,
          sla: {
            elapsedMinutes,
            remainingMinutes,
            targetMinutes,
            isOverdue,
            timerStatus
          }
        };
      });

      return new Response(JSON.stringify({ 
        orders: ordersWithTimers,
        total: orders.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'PATCH') {
      const { order_id, to_status, notes } = await req.json();
      
      if (!order_id || !to_status) {
        return new Response(JSON.stringify({ error: 'order_id and to_status are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verificar se o usuário tem acesso ao pedido
      const { data: order } = await supabase
        .from('orders')
        .select('restaurant_id, status, restaurants!inner(owner_id)')
        .eq('id', order_id)
        .single();

      if (!order || order.restaurants.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validar transições de status permitidas
      const validTransitions: Record<string, string[]> = {
        placed: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['courier_assigned'],
      };

      const currentStatus = order.status;
      if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(to_status)) {
        return new Response(JSON.stringify({ 
          error: `Invalid transition from ${currentStatus} to ${to_status}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Atualizar status do pedido
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: to_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Criar evento de auditoria
      await supabase
        .from('order_events')
        .insert({
          order_id,
          status: to_status,
          actor_id: user.id,
          actor_role: 'restaurant_owner',
          notes: notes || `Status changed to ${to_status}`,
          metadata: { 
            previous_status: currentStatus,
            changed_via: 'ops_board'
          }
        });

      // Se mudou para "preparing", criar tickets da cozinha
      if (to_status === 'preparing') {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select(`
            quantity,
            menu_items(id, name, preparation_time)
          `)
          .eq('order_id', order_id);

        if (orderItems && orderItems.length > 0) {
          const kitchenTickets = orderItems.map(item => ({
            order_id,
            restaurant_id: order.restaurant_id,
            menu_item_id: item.menu_items.id,
            item_name: item.menu_items.name,
            quantity: item.quantity,
            status: 'QUEUED',
            priority: 0
          }));

          await supabase
            .from('kitchen_tickets')
            .insert(kitchenTickets);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        order_id,
        status: to_status 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});