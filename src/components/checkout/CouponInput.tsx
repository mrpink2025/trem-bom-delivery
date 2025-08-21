import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, X, Loader2 } from 'lucide-react';
import { useCheckoutCalculation } from '@/hooks/useCheckoutCalculation';

export function CouponInput() {
  const {
    couponCode,
    setCouponCode,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    isApplyingCoupon,
    quote
  } = useCheckoutCalculation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyCoupon(couponCode);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5" />
          Cupom de Desconto
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {appliedCoupon ? (
          /* Cupom Aplicado */
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600" />
              <div>
                <p className="font-medium text-green-700">{appliedCoupon}</p>
                {quote?.discount_description && (
                  <p className="text-sm text-green-600">{quote.discount_description}</p>
                )}
              </div>
              <Badge variant="outline" className="text-green-700 border-green-300">
                - R$ {quote?.discount.toFixed(2)}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeCoupon}
              className="text-green-700 hover:text-green-800 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* Formulário de Cupom */
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o código do cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={isApplyingCoupon}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={!couponCode.trim() || isApplyingCoupon}
                className="px-6"
              >
                {isApplyingCoupon ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  'Aplicar'
                )}
              </Button>
            </div>
            
            {/* Cupons Disponíveis */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Cupons disponíveis:
              </p>
              <div className="grid gap-2">
                <div 
                  className="p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setCouponCode('WELCOME10')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">WELCOME10</p>
                      <p className="text-xs text-muted-foreground">10% de desconto - Mín. R$ 25</p>
                    </div>
                    <Badge variant="secondary">10%</Badge>
                  </div>
                </div>
                
                <div 
                  className="p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setCouponCode('FRETE20')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">FRETE20</p>
                      <p className="text-xs text-muted-foreground">Frete grátis - Mín. R$ 50</p>
                    </div>
                    <Badge variant="secondary">Grátis</Badge>
                  </div>
                </div>
                
                <div 
                  className="p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setCouponCode('SAVE5')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">SAVE5</p>
                      <p className="text-xs text-muted-foreground">R$ 5 de desconto - Mín. R$ 20</p>
                    </div>
                    <Badge variant="secondary">R$ 5</Badge>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}