
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutBlockCheck } from '@/components/checkout/CheckoutBlockCheck';
import { OrderCreationGuard } from '@/components/orders/OrderCreationGuard';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, getTotalAmount, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (items.length === 0) {
      navigate('/');
      return;
    }
  }, [user, items, navigate]);

  const handleContactSupport = () => {
    toast({
      title: 'Suporte',
      description: 'Entre em contato conosco através do email: suporte@foodapp.com',
    });
  };

  const handleCreateOrder = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate order creation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: '✅ Pedido criado com sucesso!',
        description: 'Você será redirecionado para o pagamento.',
      });
      
      clearCart();
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o pedido. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user || items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userType="client" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finalizar Pedido</h1>
          
          <CheckoutBlockCheck onContactSupport={handleContactSupport}>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckoutSummary />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <OrderCreationGuard 
                    onProceed={handleCreateOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processando...' : `Confirmar Pedido - R$ ${getTotalAmount().toFixed(2)}`}
                  </OrderCreationGuard>
                </CardContent>
              </Card>
            </div>
          </CheckoutBlockCheck>
        </div>
      </div>
    </div>
  );
}
