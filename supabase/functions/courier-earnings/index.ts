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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' }
    });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const courierId = url.searchParams.get('courier_id') || user.id;
      const groupBy = url.searchParams.get('group_by') || 'day'; // day, week, month

      // Verificar acesso
      if (courierId !== user.id) {
        // Apenas admins podem ver ganhos de outros couriers
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

      // Definir período padrão se não especificado
      const today = new Date();
      const fromDate = from ? new Date(from) : new Date(today.getFullYear(), today.getMonth(), 1);
      const toDate = to ? new Date(to) : today;

      // Buscar ganhos no período
      const { data: earnings, error } = await supabase
        .from('courier_earnings')
        .select(`
          id,
          amount_cents,
          type,
          description,
          reference_date,
          created_at,
          order_id,
          orders(id, restaurant_id, restaurants(name))
        `)
        .eq('courier_id', courierId)
        .gte('reference_date', fromDate.toISOString().split('T')[0])
        .lte('reference_date', toDate.toISOString().split('T')[0])
        .order('reference_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching earnings:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch earnings' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calcular resumos
      const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount_cents, 0) || 0;
      const earningsByType = earnings?.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + e.amount_cents;
        return acc;
      }, {} as Record<string, number>) || {};

      // Agrupar por período
      const groupedEarnings = new Map<string, { 
        date: string, 
        total_cents: number, 
        by_type: Record<string, number>,
        delivery_count: number 
      }>();

      earnings?.forEach(earning => {
        let groupKey: string;
        const date = new Date(earning.reference_date);
        
        switch (groupBy) {
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            groupKey = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default: // day
            groupKey = earning.reference_date;
        }

        if (!groupedEarnings.has(groupKey)) {
          groupedEarnings.set(groupKey, {
            date: groupKey,
            total_cents: 0,
            by_type: {},
            delivery_count: 0
          });
        }

        const group = groupedEarnings.get(groupKey)!;
        group.total_cents += earning.amount_cents;
        group.by_type[earning.type] = (group.by_type[earning.type] || 0) + earning.amount_cents;
        
        if (earning.type === 'BASE' && earning.order_id) {
          group.delivery_count += 1;
        }
      });

      const groupedArray = Array.from(groupedEarnings.values())
        .sort((a, b) => b.date.localeCompare(a.date));

      // Estatísticas do período
      const deliveryCount = earnings?.filter(e => e.type === 'BASE' && e.order_id).length || 0;
      const avgPerDelivery = deliveryCount > 0 ? totalEarnings / deliveryCount : 0;
      
      // Calcular ganhos de hoje
      const todayStr = today.toISOString().split('T')[0];
      const todayEarnings = earnings?.filter(e => e.reference_date === todayStr)
        .reduce((sum, e) => sum + e.amount_cents, 0) || 0;

      // Buscar pedidos ativos para earnings estimados
      const { data: activeOrders } = await supabase
        .from('courier_active_orders')
        .select(`
          order_id,
          orders!inner(total_amount, delivery_fee)
        `)
        .eq('courier_id', courierId);

      const pendingEarnings = activeOrders?.reduce((sum, ao) => {
        // 70% da taxa de entrega como estimativa
        return sum + Math.floor(ao.orders.delivery_fee * 100 * 0.7);
      }, 0) || 0;

      return new Response(JSON.stringify({
        summary: {
          total_earnings_cents: totalEarnings,
          total_earnings_reais: totalEarnings / 100,
          today_earnings_cents: todayEarnings,
          today_earnings_reais: todayEarnings / 100,
          pending_earnings_cents: pendingEarnings,
          pending_earnings_reais: pendingEarnings / 100,
          delivery_count: deliveryCount,
          avg_per_delivery_cents: Math.floor(avgPerDelivery),
          avg_per_delivery_reais: avgPerDelivery / 100,
          period: {
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0]
          }
        },
        earnings_by_type: Object.entries(earningsByType).map(([type, amount]) => ({
          type,
          amount_cents: amount,
          amount_reais: amount / 100
        })),
        grouped_earnings: groupedArray.map(group => ({
          ...group,
          total_reais: group.total_cents / 100,
          by_type_reais: Object.entries(group.by_type).reduce((acc, [type, amount]) => {
            acc[type] = amount / 100;
            return acc;
          }, {} as Record<string, number>)
        })),
        recent_earnings: earnings?.slice(0, 20).map(e => ({
          id: e.id,
          amount_cents: e.amount_cents,
          amount_reais: e.amount_cents / 100,
          type: e.type,
          description: e.description,
          date: e.reference_date,
          restaurant_name: e.orders?.restaurants?.name || null,
          created_at: e.created_at
        })) || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'POST') {
      // Adicionar earnings manualmente (admin only)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { 
        courier_id, 
        amount_cents, 
        type, 
        description, 
        order_id,
        reference_date 
      } = await req.json();

      if (!courier_id || !amount_cents || !type) {
        return new Response(JSON.stringify({ 
          error: 'courier_id, amount_cents, and type are required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const validTypes = ['BASE', 'BONUS', 'SURGE', 'REFUND', 'ADJUST'];
      if (!validTypes.includes(type)) {
        return new Response(JSON.stringify({ 
          error: `type must be one of: ${validTypes.join(', ')}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verificar se o courier existe
      const { data: courierProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', courier_id)
        .eq('role', 'courier')
        .single();

      if (!courierProfile) {
        return new Response(JSON.stringify({ error: 'Courier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: earning, error: earningError } = await supabase
        .from('courier_earnings')
        .insert({
          courier_id,
          amount_cents,
          type,
          description: description || `${type} adjustment by admin`,
          order_id: order_id || null,
          reference_date: reference_date || new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (earningError) {
        console.error('Error creating earning:', earningError);
        return new Response(JSON.stringify({ error: 'Failed to create earning' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        earning: {
          id: earning.id,
          courier_id: earning.courier_id,
          amount_cents: earning.amount_cents,
          amount_reais: earning.amount_cents / 100,
          type: earning.type,
          description: earning.description,
          reference_date: earning.reference_date
        }
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