import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurant_id: string;
}

interface DeliveryQuoteRequest {
  origin: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  cart: CartItem[];
  coupon_code?: string;
  user_id?: string;
}

interface DeliveryQuote {
  subtotal: number;
  delivery_fee: number;
  dynamic_fees: Array<{
    name: string;
    type: string;
    amount: number;
    description: string;
  }>;
  discount: number;
  discount_description?: string;
  subscription_discount: number;
  total: number;
  estimated_time_minutes: number;
  distance_km: number;
  zone_name: string;
}

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

    const { origin, destination, cart, coupon_code, user_id }: DeliveryQuoteRequest = await req.json();

    if (!origin || !destination || !cart || cart.length === 0) {
      throw new Error('Origin, destination, and cart are required');
    }

    // Calcular subtotal do carrinho
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calcular distância aproximada (Haversine formula)
    const distance_km = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);

    // Encontrar zona de entrega
    const { data: zones } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true);

    let delivery_zone = null;
    let zone_name = 'Fora da área de entrega';

    if (zones) {
      for (const zone of zones) {
        if (distance_km <= zone.max_distance_km && isPointInPolygon(destination, zone.polygon)) {
          delivery_zone = zone;
          zone_name = zone.name;
          break;
        }
      }
    }

    if (!delivery_zone) {
      return new Response(JSON.stringify({
        error: 'Endereço fora da área de entrega',
        available_zones: zones?.map(z => z.name) || []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calcular taxa base de entrega
    let delivery_fee = delivery_zone.base_fee + (distance_km * delivery_zone.per_km_rate);

    // Aplicar taxas dinâmicas
    const { data: dynamic_fees } = await supabase
      .from('dynamic_fees')
      .select('*')
      .eq('is_active', true)
      .gte('fee_value', 0)
      .order('priority', { ascending: false });

    const applied_fees: Array<{name: string; type: string; amount: number; description: string}> = [];
    const now = new Date();
    const current_hour = now.getHours();

    if (dynamic_fees) {
      for (const fee of dynamic_fees) {
        if (subtotal < fee.min_order_value) continue;
        if (fee.max_order_value && subtotal > fee.max_order_value) continue;
        if (fee.valid_until && new Date(fee.valid_until) < now) continue;

        let should_apply = false;
        let fee_amount = 0;

        switch (fee.type) {
          case 'time':
            const hours = fee.conditions.hours || [];
            should_apply = hours.includes(current_hour);
            break;

          case 'distance':
            const min_km = fee.conditions.min_km || 0;
            should_apply = distance_km >= min_km;
            break;

          case 'weather':
            // Simular condição de chuva (seria integrado com API real)
            const is_raining = Math.random() < 0.3; // 30% chance de chuva
            should_apply = is_raining && fee.conditions.weather === 'rain';
            break;

          case 'demand':
            // Simular alta demanda
            const is_high_demand = Math.random() < 0.2; // 20% chance de alta demanda
            should_apply = is_high_demand;
            break;
        }

        if (should_apply) {
          switch (fee.fee_type) {
            case 'fixed':
              fee_amount = fee.fee_value;
              break;
            case 'percentage':
              fee_amount = (subtotal * fee.fee_value) / 100;
              break;
            case 'per_km':
              fee_amount = distance_km * fee.fee_value;
              break;
          }

          delivery_fee += fee_amount;
          applied_fees.push({
            name: fee.name,
            type: fee.type,
            amount: fee_amount,
            description: getFeatureDescription(fee)
          });
        }
      }
    }

    // Verificar assinatura do usuário
    let subscription_discount = 0;
    if (user_id) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .gte('current_period_end', now.toISOString())
        .single();

      if (subscription?.subscription_plans?.benefits) {
        const benefits = subscription.subscription_plans.benefits;
        if (benefits.free_delivery && subtotal >= (benefits.min_order_free_delivery || 0)) {
          subscription_discount = delivery_fee;
        } else if (benefits.discount_percentage) {
          subscription_discount = (subtotal * benefits.discount_percentage) / 100;
        }
      }
    }

    // Aplicar cupom de desconto
    let discount = 0;
    let discount_description = '';

    if (coupon_code) {
      const { data: promotion } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('is_active', true)
        .gte('valid_until', now.toISOString())
        .single();

      if (promotion && subtotal >= promotion.min_order_value) {
        // Verificar limite de uso
        if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
          throw new Error('Cupom esgotado');
        }

        // Verificar limite por usuário
        if (user_id && promotion.usage_limit_per_user) {
          const { count } = await supabase
            .from('coupon_usage')
            .select('*', { count: 'exact' })
            .eq('promotion_id', promotion.id)
            .eq('user_id', user_id);

          if (count && count >= promotion.usage_limit_per_user) {
            throw new Error('Limite de uso do cupom atingido');
          }
        }

        switch (promotion.type) {
          case 'percentage':
            discount = Math.min(
              (subtotal * promotion.discount_value) / 100,
              promotion.max_discount_amount || Infinity
            );
            discount_description = `${promotion.discount_value}% de desconto`;
            break;

          case 'fixed_amount':
            discount = Math.min(promotion.discount_value, subtotal);
            discount_description = `R$ ${promotion.discount_value.toFixed(2)} de desconto`;
            break;

          case 'free_delivery':
            discount = Math.min(delivery_fee, promotion.discount_value || delivery_fee);
            discount_description = 'Frete grátis';
            break;
        }
      } else if (promotion) {
        throw new Error(`Valor mínimo do pedido: R$ ${promotion.min_order_value.toFixed(2)}`);
      } else {
        throw new Error('Cupom inválido ou expirado');
      }
    }

    const estimated_time_minutes = delivery_zone.min_time_minutes + 
      Math.ceil(distance_km * 2) + // 2 min por km adicional
      (applied_fees.length * 5); // 5 min por taxa adicional

    const quote: DeliveryQuote = {
      subtotal: parseFloat(subtotal.toFixed(2)),
      delivery_fee: parseFloat(delivery_fee.toFixed(2)),
      dynamic_fees: applied_fees,
      discount: parseFloat(discount.toFixed(2)),
      discount_description,
      subscription_discount: parseFloat(subscription_discount.toFixed(2)),
      total: parseFloat((subtotal + delivery_fee - discount - subscription_discount).toFixed(2)),
      estimated_time_minutes,
      distance_km: parseFloat(distance_km.toFixed(2)),
      zone_name
    };

    return new Response(JSON.stringify(quote), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating quote:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função para calcular distância entre dois pontos (Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Função simples para verificar se um ponto está em um polígono
function isPointInPolygon(point: {lat: number, lng: number}, polygon: any): boolean {
  // Implementação simplificada - em produção usar biblioteca como turf.js
  return true; // Por enquanto sempre retorna true
}

function getFeatureDescription(fee: any): string {
  switch (fee.type) {
    case 'weather':
      return 'Taxa aplicada devido às condições climáticas';
    case 'time':
      return 'Taxa de horário de pico';
    case 'distance':
      return 'Taxa por distância longa';
    case 'demand':
      return 'Taxa por alta demanda';
    default:
      return fee.name;
  }
}