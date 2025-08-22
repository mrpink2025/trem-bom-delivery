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
      const windowMinutes = parseInt(url.searchParams.get('window_min') || '10');
      const station = url.searchParams.get('station');
      
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

      // Buscar tickets da cozinha ativos
      let query = supabase
        .from('kitchen_tickets')
        .select(`
          id,
          order_id,
          menu_item_id,
          item_name,
          quantity,
          status,
          station,
          priority,
          created_at,
          updated_at,
          orders!inner(id, status, created_at)
        `)
        .eq('restaurant_id', restaurantId)
        .in('status', ['QUEUED', 'IN_PROGRESS'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (station) {
        query = query.eq('station', station);
      }

      const { data: tickets, error } = await query;

      if (error) {
        console.error('Error fetching kitchen tickets:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch tickets' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Agrupar itens por janela de tempo e agregá-los
      const now = new Date();
      const windowMs = windowMinutes * 60 * 1000;
      
      const aggregatedItems = new Map();
      
      tickets.forEach(ticket => {
        const createdAt = new Date(ticket.created_at);
        const windowStart = Math.floor(createdAt.getTime() / windowMs) * windowMs;
        const windowKey = `${ticket.menu_item_id}_${windowStart}_${ticket.station || 'default'}`;
        
        if (!aggregatedItems.has(windowKey)) {
          aggregatedItems.set(windowKey, {
            menu_item_id: ticket.menu_item_id,
            item_name: ticket.item_name,
            station: ticket.station,
            total_quantity: 0,
            window_start: new Date(windowStart),
            window_end: new Date(windowStart + windowMs),
            tickets: [],
            status: 'QUEUED',
            oldest_ticket_time: createdAt,
            priority: ticket.priority
          });
        }
        
        const item = aggregatedItems.get(windowKey);
        item.total_quantity += ticket.quantity;
        item.tickets.push(ticket);
        
        // Determinar status do item agregado
        if (ticket.status === 'IN_PROGRESS') {
          item.status = 'IN_PROGRESS';
        }
        
        // Manter o ticket mais antigo
        if (createdAt < item.oldest_ticket_time) {
          item.oldest_ticket_time = createdAt;
        }
      });

      // Converter map para array e adicionar informações de timing
      const itemsArray = Array.from(aggregatedItems.values()).map(item => {
        const ageMinutes = Math.floor((now.getTime() - item.oldest_ticket_time.getTime()) / (1000 * 60));
        
        // Determinar urgência baseada na idade
        let urgency = 'normal';
        if (ageMinutes > 15) urgency = 'high';
        else if (ageMinutes > 10) urgency = 'medium';
        
        return {
          ...item,
          age_minutes: ageMinutes,
          urgency,
          can_bump: item.status === 'QUEUED' // pode ser "bumped" para IN_PROGRESS
        };
      });

      // Agrupar por estação
      const stations = new Map();
      itemsArray.forEach(item => {
        const stationName = item.station || 'Geral';
        if (!stations.has(stationName)) {
          stations.set(stationName, []);
        }
        stations.get(stationName).push(item);
      });

      const stationsArray = Array.from(stations.entries()).map(([name, items]) => ({
        name,
        items: items.sort((a, b) => {
          // Ordenar por urgência, depois por idade
          if (a.urgency !== b.urgency) {
            const urgencyOrder = { high: 3, medium: 2, normal: 1 };
            return urgencyOrder[b.urgency as keyof typeof urgencyOrder] - urgencyOrder[a.urgency as keyof typeof urgencyOrder];
          }
          return b.age_minutes - a.age_minutes;
        }),
        total_items: items.length,
        queued_items: items.filter(i => i.status === 'QUEUED').length,
        in_progress_items: items.filter(i => i.status === 'IN_PROGRESS').length
      }));

      return new Response(JSON.stringify({ 
        stations: stationsArray,
        total_tickets: tickets.length,
        window_minutes: windowMinutes
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'PATCH') {
      const { ticket_ids, status, station } = await req.json();
      
      if (!ticket_ids || !Array.isArray(ticket_ids) || !status) {
        return new Response(JSON.stringify({ error: 'ticket_ids (array) and status are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validar status
      const validStatuses = ['QUEUED', 'IN_PROGRESS', 'READY', 'SERVED'];
      if (!validStatuses.includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verificar acesso aos tickets
      const { data: tickets } = await supabase
        .from('kitchen_tickets')
        .select('id, restaurant_id, restaurants!inner(owner_id)')
        .in('id', ticket_ids);

      if (!tickets || tickets.length === 0) {
        return new Response(JSON.stringify({ error: 'No tickets found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verificar se todos os tickets pertencem ao usuário
      const hasAccess = tickets.every(ticket => ticket.restaurants.owner_id === user.id);
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Atualizar status dos tickets
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (station) {
        updateData.station = station;
      }

      const { error: updateError } = await supabase
        .from('kitchen_tickets')
        .update(updateData)
        .in('id', ticket_ids);

      if (updateError) {
        console.error('Error updating tickets:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update tickets' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Se todos os tickets de um pedido ficaram READY, atualizar o pedido
      if (status === 'READY') {
        const uniqueOrderIds = [...new Set(tickets.map(t => t.id))];
        
        for (const orderId of uniqueOrderIds) {
          // Verificar se todos os tickets do pedido estão READY
          const { data: allTickets } = await supabase
            .from('kitchen_tickets')
            .select('status')
            .eq('order_id', orderId);

          const allReady = allTickets?.every(t => t.status === 'READY' || t.status === 'SERVED');
          
          if (allReady) {
            // Atualizar pedido para "ready"
            await supabase
              .from('orders')
              .update({ status: 'ready' })
              .eq('id', orderId);

            // Criar evento
            await supabase
              .from('order_events')
              .insert({
                order_id: orderId,
                status: 'ready',
                actor_id: user.id,
                actor_role: 'restaurant_staff',
                notes: 'All items ready in kitchen',
                metadata: { updated_via: 'kds' }
              });
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        updated_tickets: ticket_ids.length,
        status 
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