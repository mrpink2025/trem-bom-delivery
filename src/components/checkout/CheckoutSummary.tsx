import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, MapPin, Package, Truck, Zap, Gift, Crown, Calculator } from 'lucide-react';
import { useCheckoutCalculation } from '@/hooks/useCheckoutCalculation';

export function CheckoutSummary() {
  const { 
    cart, 
    quote, 
    isLoadingQuote, 
    appliedCoupon,
    userSubscription 
  } = useCheckoutCalculation();

  console.log('🛒 CHECKOUT SUMMARY - cart:', cart);
  console.log('🛒 CHECKOUT SUMMARY - quote:', quote);
  console.log('🛒 CHECKOUT SUMMARY - isLoadingQuote:', isLoadingQuote);

  if (isLoadingQuote) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mostrar itens básicos mesmo sem cotação completa
  if (!quote && cart.length > 0) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const estimatedDeliveryFee = 5.00; // Taxa estimada básica
    const total = subtotal + estimatedDeliveryFee;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resumo do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Itens do Carrinho */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">ITENS</h4>
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Valores básicos */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Entrega (estimada)
              </span>
              <span>R$ {estimatedDeliveryFee.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600">
              💡 Adicione seu endereço de entrega para ver o valor exato do frete
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumo do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Complete os dados para ver o resumo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Resumo do Pedido
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Itens do Carrinho */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">ITENS</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
              <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Valores */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R$ {quote.subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Entrega ({quote.zone_name})
            </span>
            <span>R$ {quote.delivery_fee.toFixed(2)}</span>
          </div>

          {/* Taxas Dinâmicas */}
          {quote.dynamic_fees.map((fee, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span>{fee.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {fee.type}
                </Badge>
              </span>
              <span className="text-orange-600">
                + R$ {fee.amount.toFixed(2)}
              </span>
            </div>
          ))}

          {/* Desconto por Cupom */}
          {quote.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2 text-green-600">
                <Gift className="h-4 w-4" />
                Cupom ({appliedCoupon})
              </span>
              <span className="text-green-600">
                - R$ {quote.discount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Desconto por Assinatura */}
          {quote.subscription_discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2 text-purple-600">
                <Crown className="h-4 w-4" />
                Plano Premium
              </span>
              <span className="text-purple-600">
                - R$ {quote.subscription_discount.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>R$ {quote.total.toFixed(2)}</span>
        </div>

        {/* Informações de Entrega */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Tempo estimado: {quote.estimated_time_minutes} minutos</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Distância: {quote.distance_km.toFixed(1)} km</span>
          </div>
        </div>

        {/* Informações da Assinatura */}
        {userSubscription && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
              <Crown className="h-4 w-4" />
              Plano {userSubscription.subscription_plans?.name}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              {(userSubscription.subscription_plans?.benefits as any)?.free_delivery 
                ? 'Frete grátis incluído!' 
                : `${(userSubscription.subscription_plans?.benefits as any)?.discount_percentage}% de desconto aplicado`
              }
            </p>
          </div>
        )}

        {/* Breakdown de Taxas Dinâmicas */}
        {quote.dynamic_fees.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <h5 className="font-medium text-sm text-orange-700 mb-2">
              Taxas Aplicadas
            </h5>
            <div className="space-y-1">
              {quote.dynamic_fees.map((fee, index) => (
                <div key={index} className="text-xs text-orange-600">
                  • {fee.description}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}