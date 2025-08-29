import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Clear the cart since payment was successful
    if (sessionId) {
      clearCart();
      
      // Show success notification
      toast({
        title: '🎉 Pagamento realizado com sucesso!',
        description: 'Seu pedido foi confirmado e está sendo processado.',
        duration: 5000,
      });
    }
  }, [sessionId, clearCart, toast]);

  const handleViewOrders = () => {
    navigate('/orders');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Erro</CardTitle>
            <CardDescription>
              Sessão de pagamento não encontrada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackToHome} className="w-full">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Pagamento Confirmado!
            </h1>
            <p className="text-lg text-muted-foreground">
              Obrigado pela sua compra. Seu pedido está sendo preparado.
            </p>
          </div>

          {/* Order Status Timeline */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Status do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Pagamento Aprovado</p>
                    <p className="text-sm text-muted-foreground">
                      Seu pagamento foi processado com sucesso
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Pedido Confirmado</p>
                    <p className="text-sm text-muted-foreground">
                      Enviamos os detalhes para o restaurante
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium">Preparando Pedido</p>
                    <p className="text-sm text-muted-foreground">
                      O restaurante está preparando seus itens
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <div>
                    <p className="font-medium text-muted-foreground">Saiu para Entrega</p>
                    <p className="text-sm text-muted-foreground">
                      Você receberá uma notificação quando sair
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Acompanhe seu pedido</p>
                    <p className="text-sm text-muted-foreground">
                      Você pode acompanhar o status em tempo real na página de pedidos
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Prepare-se para receber</p>
                    <p className="text-sm text-muted-foreground">
                      Tempo estimado de entrega: 30-45 minutos
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Avalie sua experiência</p>
                    <p className="text-sm text-muted-foreground">
                      Após a entrega, nos ajude avaliando o restaurante e entregador
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleViewOrders} className="flex-1">
              <Package className="w-4 h-4 mr-2" />
              Ver Meus Pedidos
            </Button>
            <Button onClick={handleBackToHome} variant="outline" className="flex-1">
              Fazer Novo Pedido
            </Button>
          </div>

          {/* Order Info */}
          {sessionId && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                ID da Sessão: <code className="font-mono text-xs">{sessionId}</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}