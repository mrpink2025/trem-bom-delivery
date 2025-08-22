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

    if (req.method === 'POST') {
      // Atualizar presença do courier
      const { 
        is_online, 
        latitude, 
        longitude, 
        battery_level, 
        status = 'available',
        device_info 
      } = await req.json();

      const updateData: any = {
        is_online: is_online !== undefined ? is_online : true,
        last_seen: new Date().toISOString(),
        status,
        updated_at: new Date().toISOString()
      };

      if (latitude !== undefined && longitude !== undefined) {
        // Validar coordenadas
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        updateData.last_location = `POINT(${longitude} ${latitude})`;
      }

      if (battery_level !== undefined) {
        if (battery_level < 0 || battery_level > 100) {
          return new Response(JSON.stringify({ error: 'Invalid battery level' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        updateData.battery_level = battery_level;
      }

      if (device_info) {
        updateData.device_info = device_info;
      }

      // Verificar se é um courier válido
      const { data: courierProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!courierProfile || courierProfile.role !== 'courier') {
        return new Response(JSON.stringify({ error: 'Access denied - courier role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verificar requisitos para ficar online
      if (is_online === true) {
        // Verificar se documentos estão ok
        const { data: courier } = await supabase
          .from('couriers')
          .select('status')
          .eq('id', user.id)
          .single();

        if (!courier || courier.status !== 'APPROVED') {
          return new Response(JSON.stringify({ 
            error: 'Cannot go online - courier not approved',
            courier_status: courier?.status || 'not_found'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Verificar bateria mínima
        if (battery_level && battery_level < 20) {
          return new Response(JSON.stringify({ 
            error: 'Cannot go online - battery level too low (minimum 20%)',
            battery_level 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Verificar se tem localização
        if (!latitude || !longitude) {
          return new Response(JSON.stringify({ 
            error: 'Cannot go online - location required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Upsert na tabela de presença
      const { data: presence, error: presenceError } = await supabase
        .from('courier_presence')
        .upsert({
          courier_id: user.id,
          ...updateData
        }, {
          onConflict: 'courier_id'
        })
        .select()
        .single();

      if (presenceError) {
        console.error('Error updating presence:', presenceError);
        return new Response(JSON.stringify({ error: 'Failed to update presence' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Se ficou offline, marcar status de pedidos ativos como "paused"
      if (is_online === false) {
        const { data: activeOrders } = await supabase
          .from('courier_active_orders')
          .select('order_id')
          .eq('courier_id', user.id);

        if (activeOrders && activeOrders.length > 0) {
          // Log para tracking
          console.log(`Courier ${user.id} went offline with ${activeOrders.length} active orders`);
          
          // Notificar restaurantes sobre courier offline
          for (const activeOrder of activeOrders) {
            await supabase
              .channel(`order:${activeOrder.order_id}`)
              .send({
                type: 'broadcast',
                event: 'courier_offline',
                payload: {
                  courier_id: user.id,
                  order_id: activeOrder.order_id,
                  timestamp: new Date().toISOString()
                }
              });
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        presence: {
          courier_id: presence.courier_id,
          is_online: presence.is_online,
          status: presence.status,
          battery_level: presence.battery_level,
          last_seen: presence.last_seen
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const courierId = url.searchParams.get('courier_id');
      
      // Se especificou courier_id, buscar apenas esse courier
      if (courierId) {
        const { data: presence, error } = await supabase
          .from('courier_presence')
          .select(`
            courier_id,
            is_online,
            last_location,
            last_seen,
            battery_level,
            status,
            profiles!inner(full_name, phone)
          `)
          .eq('courier_id', courierId)
          .single();

        if (error || !presence) {
          return new Response(JSON.stringify({ error: 'Courier not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ presence }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Buscar todos os couriers online (para dispatch)
      const { data: onlineCouriers, error } = await supabase
        .from('courier_presence')
        .select(`
          courier_id,
          is_online,
          last_location,
          last_seen,
          battery_level,
          status,
          profiles!inner(full_name)
        `)
        .eq('is_online', true)
        .eq('status', 'available')
        .order('last_seen', { ascending: false });

      if (error) {
        console.error('Error fetching online couriers:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch couriers' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Adicionar informação de pedidos ativos
      const couriersWithActiveOrders = await Promise.all(
        (onlineCouriers || []).map(async (courier) => {
          const { data: activeOrders } = await supabase
            .from('courier_active_orders')
            .select('order_id')
            .eq('courier_id', courier.courier_id);

          return {
            ...courier,
            active_orders_count: activeOrders?.length || 0,
            last_seen_minutes: Math.floor(
              (Date.now() - new Date(courier.last_seen).getTime()) / (1000 * 60)
            )
          };
        })
      );

      return new Response(JSON.stringify({
        couriers: couriersWithActiveOrders,
        total_online: couriersWithActiveOrders.length
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