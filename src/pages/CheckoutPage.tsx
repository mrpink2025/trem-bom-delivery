import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CheckoutPage = () => {
  const { items, getCartTotal, getDeliveryFee, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { latitude, longitude, loading: locationLoading, getCurrentLocation } = useGeolocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
  });
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = getCartTotal();
  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (items.length === 0) {
      navigate('/');
    }
  }, [items, navigate]);

  useEffect(() => {
    if (latitude && longitude) {
      // Here you could reverse geocode the location to get address
      // For now, just set some defaults
      setDeliveryAddress(prev => ({
        ...prev,
        city: 'São Paulo',
        state: 'SP',
      }));
    }
  }, [latitude, longitude]);

  const handleGetCurrentLocation = () => {
    getCurrentLocation();
  };

  const validateForm = () => {
    const requiredFields = ['street', 'number', 'neighborhood', 'city', 'state', 'zipcode'];
    const missingFields = requiredFields.filter(field => !deliveryAddress[field as keyof typeof deliveryAddress]);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos do endereço',
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const handleSubmitOrder = async () => {
    if (!user || !profile) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para finalizar o pedido',
        variant: 'destructive',
      });
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const restaurantId = items[0]?.restaurant_id;
      if (!restaurantId) throw new Error('Restaurant ID not found');

      // Get restaurant data for pickup location
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('address')
        .eq('id', restaurantId)
        .single();

      if (restaurantError) throw restaurantError;

      // Create order
      const orderData = {
        user_id: user.id,
        restaurant_id: restaurantId,
        status: 'pending',
        total_amount: total,
        delivery_address: deliveryAddress,
        restaurant_address: restaurant.address,
        pickup_location: restaurant.address,
        delivery_location: {
          ...deliveryAddress,
          lat: latitude || -23.5505,
          lng: longitude || -46.6333,
        },
        estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 minutes from now
        items: items.map(item => ({
          menu_item_id: item.menu_item_id,
          name: item.menu_item.name,
          price: item.menu_item.price,
          quantity: item.quantity,
          special_instructions: item.special_instructions,
        })),
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Clear cart after successful order
      await clearCart();

      toast({
        title: 'Pedido realizado!',
        description: 'Seu pedido foi criado com sucesso',
      });

      // Redirect to tracking page
      navigate(`/tracking/${order.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar pedido. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
          <h1 className="text-3xl font-bold">Finalizar Pedido</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGetCurrentLocation}
                    disabled={locationLoading}
                    className="flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    {locationLoading ? 'Localizando...' : 'Usar Localização Atual'}
                  </Button>
                  {latitude && longitude && (
                    <Badge variant="secondary">
                      Localização detectada
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <Label htmlFor="street">Rua/Avenida</Label>
                      <Input
                        id="street"
                        value={deliveryAddress.street}
                        onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                        placeholder="Nome da rua"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={deliveryAddress.number}
                        onChange={(e) => setDeliveryAddress(prev => ({ ...prev, number: e.target.value }))}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={deliveryAddress.complement}
                        onChange={(e) => setDeliveryAddress(prev => ({ ...prev, complement: e.target.value }))}
                        placeholder="Apto, casa, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={deliveryAddress.neighborhood}
                        onChange={(e) => setDeliveryAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                        placeholder="Nome do bairro"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={deliveryAddress.city}
                        onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="São Paulo"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={deliveryAddress.state}
                        onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="SP"
                        maxLength={2}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipcode">CEP</Label>
                      <Input
                        id="zipcode"
                        value={deliveryAddress.zipcode}
                        onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zipcode: e.target.value }))}
                        placeholder="00000-000"
                        required
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Instruções especiais para o entregador..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">
                  Pagamento na entrega (Dinheiro ou PIX)
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  No momento, aceitamos apenas pagamento na entrega. Em breve teremos pagamento online.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Restaurant Info */}
                {items.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold">{items[0].menu_item.restaurant.name}</h4>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <span>{item.quantity}x {item.menu_item.name}</span>
                        {item.special_instructions && (
                          <p className="text-xs text-muted-foreground">
                            {item.special_instructions}
                          </p>
                        )}
                      </div>
                      <span>R$ {(item.menu_item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxa de entrega</span>
                    <span>R$ {deliveryFee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Processando...' : 'Confirmar Pedido'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;