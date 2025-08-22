import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCourierRegistration } from "@/hooks/useCourierRegistration";
import { CourierRegistrationWizard } from "@/components/courier/CourierRegistrationWizard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  DollarSign, 
  Package, 
  CheckCircle2,
  Phone,
  Route,
  FileText
} from "lucide-react";
import { CourierGoOnline } from "@/components/courier/CourierGoOnline";
import type { Database } from "@/integrations/supabase/types";

type Order = Database['public']['Tables']['orders']['Row'];

export default function CourierDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { latitude, longitude, error: locationError } = useGeolocation(isOnline);
  const { courier, loading: courierLoading } = useCourierRegistration();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['confirmed', 'ready', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptDelivery = async (orderId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('orders')
        .update({ 
          courier_id: user.user.id,
          status: 'out_for_delivery'
        })
        .eq('id', orderId);

      if (error) throw error;

      // Add initial tracking point
      if (latitude && longitude) {
        await supabase
          .from('delivery_tracking')
          .insert({
            order_id: orderId,
            courier_id: user.user.id,
            latitude,
            longitude
          });
      }

      fetchOrders();
      toast({
        title: "Pedido aceito!",
        description: "Você agora é responsável por esta entrega"
      });
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar o pedido",
        variant: "destructive"
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'out_for_delivery' | 'delivered') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Add tracking point if location is available
      if (latitude && longitude && newStatus === 'delivered') {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase
            .from('delivery_tracking')
            .insert({
              order_id: orderId,
              courier_id: user.user.id,
              latitude,
              longitude
            });
        }
      }

      fetchOrders();
      toast({
        title: "Status atualizado!",
        description: `Pedido marcado como ${newStatus === 'delivered' ? 'entregue' : newStatus}`
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive"
      });
    }
  };

  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.user.id)
        .maybeSingle();

      setUserProfile({ ...user.user, profile });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Send location updates when online (only if location is available)
  useEffect(() => {
    if (!isOnline || !latitude || !longitude || !userProfile?.id) return;

    const updateLocation = async () => {
      try {
        // Find active deliveries for this courier
        const activeOrders = orders.filter(order => 
          order.courier_id === userProfile.id && 
          order.status === 'out_for_delivery'
        );

        // Only update if there are active orders
        if (activeOrders.length === 0) return;

        // Update tracking for each active order
        for (const order of activeOrders) {
          await supabase
            .from('delivery_tracking')
            .insert({
              order_id: order.id,
              courier_id: userProfile.id,
              latitude,
              longitude
            });
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    // Update location every 30 seconds when online and has active deliveries
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, [isOnline, latitude, longitude, orders, userProfile?.id]);
  const availableOrders = orders.filter(order => !order.courier_id && ['confirmed', 'ready'].includes(order.status));
  const myOrders = orders.filter(order => 
    order.courier_id === userProfile?.id && order.status === 'out_for_delivery'
  );

  const todayDeliveries = orders.filter(order => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.created_at).toDateString();
    return today === orderDate && order.status === 'delivered' && order.courier_id === userProfile?.id;
  });

  const todayStats = {
    deliveries: todayDeliveries.length,
    earnings: todayDeliveries.reduce((sum, order) => sum + Number(order.total_amount) * 0.1, 0), // 10% commission
    distance: Math.round(todayDeliveries.length * 3.5 * 100) / 100, // Average 3.5km per delivery
    rating: 4.9
  };


  // Check if user needs to complete courier registration
  const needsCourierRegistration = !courierLoading && (!courier || courier.status === 'DRAFT' || courier.status === 'REJECTED');

  if (courierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados do entregador...</p>
        </div>
      </div>
    );
  }

  if (needsCourierRegistration) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-6 h-6" />
                <span>Cadastro de Entregador</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {courier?.status === 'REJECTED' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-medium text-destructive mb-2">Cadastro Rejeitado</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {courier.rejection_reason || 'Seu cadastro foi rejeitado. Por favor, revise os dados e envie novamente.'}
                    </p>
                  </div>
                  <CourierRegistrationWizard />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="font-medium text-blue-700 mb-2">Bem-vindo ao Painel de Entregador!</p>
                    <p className="text-sm text-blue-600">
                      Para acessar o painel de entregador, você precisa completar seu cadastro como entregador.
                    </p>
                  </div>
                  <CourierRegistrationWizard />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show different content based on courier status
  if (courier?.status === 'UNDER_REVIEW') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Cadastro em Análise</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Clock className="w-16 h-16 mx-auto text-warning" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aguardando Aprovação</h3>
              <p className="text-muted-foreground mb-4">
                Seu cadastro está sendo analisado pela nossa equipe. Você receberá uma notificação quando for aprovado.
              </p>
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                Em Análise
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (courier?.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Conta Suspensa</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Package className="w-16 h-16 mx-auto text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Acesso Suspenso</h3>
              <p className="text-muted-foreground mb-4">
                {courier.suspended_reason || 'Sua conta foi temporariamente suspensa. Entre em contato com o suporte.'}
              </p>
              <Badge variant="destructive">
                Suspenso
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-8">
        
        {/* Status Header with Enhanced Online Controls */}
        <CourierGoOnline 
          isOnline={isOnline}
          onToggleOnline={setIsOnline}
          courierName={userProfile?.profile?.full_name || 'Entregador'}
          locationError={locationError}
        />

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entregas</p>
                  <p className="text-2xl font-bold">{todayStats.deliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ganhos</p>
                  <p className="text-2xl font-bold">R$ {todayStats.earnings.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-sky/10 rounded-lg">
                  <Route className="w-5 h-5 text-sky" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Distância</p>
                  <p className="text-2xl font-bold">{todayStats.distance} km</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avaliação</p>
                  <p className="text-2xl font-bold">{todayStats.rating} ⭐</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Deliveries */}
        {isOnline && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-success" />
                <span>Entregas Disponíveis</span>
                <Badge variant="secondary">
                  {availableOrders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableOrders.map((order) => {
                const deliveryAddress = order.delivery_address as any;
                const restaurantAddress = order.restaurant_address as any;
                
                return (
                <div key={order.id} className="p-4 border rounded-lg space-y-4 animate-bounce-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">Pedido</p>
                    </div>
                    <Badge className="bg-success text-success-foreground">Disponível</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">Retirada:</span>
                      </div>
                      <p className="text-sm pl-6">{restaurantAddress?.street || 'Endereço não disponível'}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span className="font-medium">Entrega:</span>
                      </div>
                      <p className="text-sm pl-6">{deliveryAddress?.street || 'Endereço não disponível'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1 font-bold text-success">
                        <DollarSign className="w-4 h-4" />
                        <span>R$ {(Number(order.total_amount) * 0.1).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Ver Rota
                      </Button>
                      <Button 
                        size="sm"
                      onClick={() => acceptDelivery(order.id)}
                      disabled={loading}
                      title={loading ? 'Processando...' : 'Aceitar este pedido para entrega'}
                      >
                        Aceitar
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Current Delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-sky" />
              <span>Entrega Atual</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myOrders.length > 0 ? (
              <div className="space-y-4">
                {myOrders.map((order) => {
                  const deliveryAddress = order.delivery_address as any;
                  const restaurantAddress = order.restaurant_address as any;
                  
                  return (
                  <div key={order.id} className="p-4 border-2 border-sky rounded-lg space-y-4 bg-sky/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">Pedido em andamento</p>
                      </div>
                      <Badge className="bg-sky text-sky-foreground">
                        A caminho
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium">Retirada:</span>
                        </div>
                        <p className="text-sm pl-6">{restaurantAddress?.street || 'Endereço não disponível'}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="w-4 h-4 text-accent" />
                          <span className="font-medium">Entrega:</span>
                        </div>
                        <p className="text-sm pl-6">{deliveryAddress?.street || 'Endereço não disponível'}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="w-4 h-4 mr-2" />
                        Ligar Cliente
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Navigation className="w-4 h-4 mr-2" />
                        Ver no Mapa
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirmar Entrega
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma entrega em andamento</p>
                {!isOnline && (
                  <p className="text-sm mt-2">Ative o status online para receber entregas</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}