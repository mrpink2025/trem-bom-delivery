import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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

    const { courier_id, max_orders = 3, max_distance_km = 2.0 } = await req.json();

    if (!courier_id) {
      return new Response(JSON.stringify({ error: 'courier_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se é o próprio courier ou admin
    if (courier_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Buscar localização atual do courier
    const { data: courierPresence } = await supabase
      .from('courier_presence')
      .select('last_location, is_online')
      .eq('courier_id', courier_id)
      .single();

    if (!courierPresence || !courierPresence.is_online || !courierPresence.last_location) {
      return new Response(JSON.stringify({ 
        error: 'Courier is not online or location not available' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar pedidos ativos do courier
    const { data: activeOrders } = await supabase
      .from('courier_active_orders')
      .select(`
        order_id,
        sequence_order,
        orders!inner(
          id,
          status,
          delivery_address,
          restaurant_id,
          restaurants!inner(name, location)
        )
      `)
      .eq('courier_id', courier_id)
      .order('sequence_order');

    // Se já tem o máximo de pedidos, retornar apenas otimização da rota atual
    if (activeOrders && activeOrders.length >= max_orders) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Courier already at maximum capacity',
        current_orders: activeOrders,
        suggestions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar pedidos próximos disponíveis para stacking
    const { data: availableOrders } = await supabase
      .from('orders')
      .select(`
        id,
        restaurant_id,
        delivery_address,
        total_amount,
        created_at,
        restaurants!inner(name, location)
      `)
      .eq('status', 'ready')
      .is('courier_id', null)
      .limit(20);

    if (!availableOrders || availableOrders.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        current_orders: activeOrders || [],
        suggestions: [],
        message: 'No additional orders available for stacking'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calcular distâncias e filtrar pedidos próximos
    const courierLoc = courierPresence.last_location;
    const nearbyOrders = [];

    for (const order of availableOrders) {
      if (!order.restaurants.location) continue;

      // Calcular distância do courier até o restaurante
      const { data: distance } = await supabase
        .rpc('st_distance', {
          geom1: courierLoc,
          geom2: order.restaurants.location
        });

      const distanceKm = distance ? distance / 1000 : 999;

      if (distanceKm <= max_distance_km) {
        nearbyOrders.push({
          ...order,
          distance_to_restaurant_km: Math.round(distanceKm * 100) / 100,
          estimated_pickup_time: Math.round(distanceKm / 25 * 60), // 25km/h média
          priority_score: calculatePriorityScore(order, distanceKm)
        });
      }
    }

    // Ordenar por score de prioridade
    nearbyOrders.sort((a, b) => b.priority_score - a.priority_score);

    // Sugerir até (max_orders - pedidos_atuais) pedidos
    const currentCount = activeOrders ? activeOrders.length : 0;
    const maxSuggestions = max_orders - currentCount;
    const suggestions = nearbyOrders.slice(0, maxSuggestions);

    // Calcular sequência otimizada se há sugestões
    let optimizedRoute = null;
    if (suggestions.length > 0 && activeOrders) {
      optimizedRoute = calculateOptimizedRoute(activeOrders, suggestions);
    }

    return new Response(JSON.stringify({
      success: true,
      courier_id,
      current_orders: activeOrders || [],
      available_suggestions: suggestions.length,
      suggestions: suggestions.map(order => ({
        order_id: order.id,
        restaurant_name: order.restaurants.name,
        distance_to_restaurant_km: order.distance_to_restaurant_km,
        estimated_pickup_time: order.estimated_pickup_time,
        estimated_earnings_cents: Math.round((order.total_amount || 0) * 0.1), // 10% do valor
        priority_score: order.priority_score
      })),
      optimized_route: optimizedRoute,
      max_capacity: max_orders
    }), {
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

// Função para calcular score de prioridade do pedido
function calculatePriorityScore(order: any, distanceKm: number): number {
  const timeWaiting = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60); // minutos
  const valueScore = (order.total_amount || 0) / 100; // R$ para score
  const proximityScore = Math.max(0, 10 - distanceKm * 2); // mais próximo = maior score
  const urgencyScore = Math.min(timeWaiting / 10, 10); // mais tempo esperando = maior score

  return proximityScore + urgencyScore + (valueScore * 0.1);
}

// Função para calcular rota otimizada (versão simplificada)
function calculateOptimizedRoute(activeOrders: any[], suggestions: any[]) {
  // Algoritmo simplificado - ordenar por proximidade geográfica
  // Em produção, usaria um algoritmo TSP mais sofisticado
  const allOrders = [...activeOrders, ...suggestions];
  
  return {
    sequence: allOrders.map((order, index) => ({
      order_id: order.order_id || order.id,
      sequence: index + 1,
      type: activeOrders.includes(order) ? 'current' : 'suggested'
    })),
    estimated_total_time_minutes: allOrders.length * 15, // 15min por parada
    estimated_total_distance_km: allOrders.length * 2.5 // 2.5km por parada
  };
}