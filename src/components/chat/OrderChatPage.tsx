import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { DeliveryTrackingMap } from '../delivery/DeliveryTrackingMap';
import { useAuth } from '@/contexts/AuthContext';

export function OrderChatPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  
  if (!orderId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Pedido não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O ID do pedido não foi fornecido ou é inválido.
          </p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  // Mock data - replace with real order data
  const orderData = {
    deliveryAddress: {
      lat: -16.6869,
      lng: -49.2648,
      address: 'Setor Bueno, Goiânia - GO'
    },
    restaurantAddress: {
      lat: -16.6799,
      lng: -49.2532,
      address: 'Setor Oeste, Goiânia - GO'
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <h1 className="text-3xl font-bold">Chat e Rastreamento</h1>
        <p className="text-muted-foreground">
          Pedido #{orderId.substring(0, 8)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat */}
        <div>
          <ChatInterface orderId={orderId} className="h-[600px]" />
        </div>

        {/* Tracking Map */}
        <div>
          <DeliveryTrackingMap
            orderId={orderId}
            deliveryAddress={orderData.deliveryAddress}
            restaurantAddress={orderData.restaurantAddress}
            className="h-[600px]"
          />
        </div>
      </div>
    </div>
  );
}