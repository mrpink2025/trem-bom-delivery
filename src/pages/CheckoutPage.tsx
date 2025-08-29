
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutBlockCheck } from '@/components/checkout/CheckoutBlockCheck';
import { OrderCreationGuard } from '@/components/orders/OrderCreationGuard';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import { AddressSelector } from '@/components/checkout/AddressSelector';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SelectedAddress {
  id: string;
  name: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, getCartTotal, getDeliveryFee, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);

  console.log('🛒 CHECKOUT PAGE - items:', items);
  console.log('🛒 CHECKOUT PAGE - selectedAddress:', selectedAddress);

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
    if (!selectedAddress) {
      toast({
        title: 'Endereço necessário',
        description: 'Selecione um endereço de entrega para continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🚀 Iniciando criação do pedido...');
      
      // Redirecionar para página de pagamento sem limpar o carrinho ainda
      // O carrinho será limpo apenas após confirmação do pagamento
      toast({
        title: '📝 Processando pedido...',
        description: 'Redirecionando para o pagamento.',
      });
      
      // Por enquanto, vamos apenas navegar para a página de pedidos
      // sem limpar o carrinho até implementarmos a integração real
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o pedido. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUserTypeChange = () => {
    // For checkout page, we don't allow user type changes
    // User should go to home to change type
    navigate('/');
  };

  const handleAddressSelect = (address: SelectedAddress) => {
    console.log('🏠 CHECKOUT - Endereço selecionado:', address);
    setSelectedAddress(address);
  };

  if (!user || items.length === 0) {
    return null;
  }

  const totalAmount = getCartTotal() + getDeliveryFee();

  return (
    <div className="min-h-screen bg-background">
      <Header userType="client" onUserTypeChange={handleUserTypeChange} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finalizar Pedido</h1>
          
          <CheckoutBlockCheck onContactSupport={handleContactSupport}>
            <div className="space-y-6">
              {/* Seleção de Endereço */}
              <AddressSelector 
                onAddressSelect={handleAddressSelect}
                selectedAddressId={selectedAddress?.id}
              />

              {/* Resumo do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckoutSummary />
                </CardContent>
              </Card>

              {/* Botão de Confirmação */}
              <Card>
                <CardContent className="pt-6">
                  <OrderCreationGuard 
                    onProceed={handleCreateOrder}
                    disabled={isProcessing || !selectedAddress}
                  >
                    {isProcessing ? 'Processando...' : `Confirmar Pedido - R$ ${totalAmount.toFixed(2)}`}
                  </OrderCreationGuard>
                  
                  {!selectedAddress && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Selecione um endereço de entrega para continuar
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </CheckoutBlockCheck>
        </div>
      </div>
    </div>
  );
}
