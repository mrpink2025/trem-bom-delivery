import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  DollarSign, 
  MapPin, 
  User, 
  MessageCircle, 
  BarChart3,
  Settings,
  Navigation,
  Clock,
  CheckCircle,
  Wifi
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CourierFinancial } from './CourierFinancial';
import { CourierChat } from './CourierChat';
import { DeliveryMap } from './DeliveryMap';
import { CourierOffers } from './CourierOffers';
import { RealTimeCourierOffers } from './RealTimeCourierOffers';
import { CourierProfile } from './CourierProfile';
import { CourierGoOnline } from './CourierGoOnline';
import { ActiveDeliveryTracker } from './ActiveDeliveryTracker';
import { CourierNotifications } from './CourierNotifications';
import RealtimeNotificationCenter from '@/components/notifications/RealtimeNotificationCenter';

export function NewCourierDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courierData, setCourierData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weekEarnings: 0,
    completedOrders: 0,
    rating: 4.8
  });

  useEffect(() => {
    if (user) {
      loadCourierData();
      loadStats();
      checkActiveOrder();
      loadOnlineStatus();
      getUserLocation();
    }
  }, [user]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          // Usar localização padrão de Goiânia se não conseguir obter
          setUserLocation({
            lat: -16.6869,
            lng: -49.2642
          });
        }
      );
    } else {
      // Usar localização padrão de Goiânia
      setUserLocation({
        lat: -16.6869,
        lng: -49.2642
      });
    }
  };

  const handleLocationUpdate = (location: { lat: number; lng: number }) => {
    setUserLocation(location);
  };

  const loadCourierData = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin - allow direct access
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (profile?.role === 'admin') {
        // Admin can access courier panel without registration
        setCourierData({
          id: user?.id,
          full_name: 'Admin User',
          status: 'APPROVED',
          phone: 'N/A'
        });
        setLoading(false);
        return;
      }

      // Regular courier data loading
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        toast({
          title: "Cadastro necessário",
          description: "Você precisa se cadastrar como entregador primeiro.",
          variant: "destructive"
        });
        return;
      }

      if (data.status === 'UNDER_REVIEW') {
        toast({
          title: "Cadastro em análise",
          description: "Seu cadastro está sendo analisado pela nossa equipe.",
        });
      }

      if (data.status === 'SUSPENDED') {
        toast({
          title: "Conta suspensa",
          description: "Sua conta foi suspensa. Entre em contato conosco.",
          variant: "destructive"
        });
        return;
      }

      setCourierData(data);
    } catch (error) {
      console.error('Erro ao carregar dados do entregador:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: earnings } = await supabase
        .from('courier_earnings')
        .select('*')
        .eq('courier_id', user?.id);

      if (earnings) {
        const today = new Date().toDateString();
        const todayEarnings = earnings
          .filter(e => new Date(e.created_at).toDateString() === today)
          .reduce((sum, e) => sum + (e.amount_cents / 100), 0);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekEarnings = earnings
          .filter(e => new Date(e.created_at) >= weekStart)
          .reduce((sum, e) => sum + (e.amount_cents / 100), 0);

        setStats(prev => ({
          ...prev,
          todayEarnings,
          weekEarnings,
          completedOrders: earnings.filter(e => e.type === 'BASE').length
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadOnlineStatus = async () => {
    try {
      const { data } = await supabase
        .from('courier_presence')
        .select('is_online')
        .eq('courier_id', user?.id)
        .single();
      
      setIsOnline(data?.is_online || false);
    } catch (error) {
      console.log('No presence record found');
    }
  };

  const handleToggleOnline = async (newStatus: boolean) => {
    if (!user?.id) return;

    try {
      // Update presence in database
      const { error } = await supabase
        .from('courier_presence')
        .upsert({
          courier_id: user.id,
          is_online: newStatus,
          last_seen: new Date().toISOString(),
          last_location: userLocation ? {
            type: 'Point',
            coordinates: [userLocation.lng, userLocation.lat]
          } : null
        });

      if (error) throw error;

      setIsOnline(newStatus);
      
      toast({
        title: newStatus ? 'Você está online' : 'Você está offline',
        description: newStatus 
          ? 'Agora você pode receber ofertas de entrega'
          : 'Você não receberá ofertas de entrega'
      });

    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar seu status",
        variant: "destructive"
      });
    }
  };

  const checkActiveOrder = async () => {
    try {
      const { data } = await supabase
        .from('courier_active_orders')
        .select('order_id')
        .eq('courier_id', user?.id)
        .limit(1)
        .single();
      
      if (data) {
        setActiveOrderId(data.order_id);
        loadActiveOrderData(data.order_id);
        setActiveTab('delivery'); // Switch to delivery tab if there's an active order
      }
    } catch (error) {
      console.log('No active orders');
    }
  };

  const loadActiveOrderData = async (orderId: string) => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants!inner(
            id,
            name,
            address,
            location
          )
        `)
        .eq('id', orderId)
        .single();

      if (data) {
        setActiveOrder({
          ...data,
          restaurant_address: data.restaurants?.location,
          delivery_address: data.delivery_address
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do pedido:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando painel do entregador...</p>
        </div>
      </div>
    );
  }

  if (!courierData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Você precisa ser um entregador cadastrado para acessar este painel.
            </p>
            <Button className="w-full" onClick={() => window.location.href = '/auth'}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Painel do Entregador</h1>
              <p className="text-muted-foreground">
                Bem-vindo, {courierData.full_name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <RealtimeNotificationCenter />
              <Badge variant={isOnline ? "default" : "secondary"}>
                <Wifi className="w-3 h-3 mr-1" />
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Corridas
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Entrega
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Ganhos
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Online Status Card */}
            <CourierGoOnline
              isOnline={isOnline}
              onToggleOnline={handleToggleOnline}
              courierName={courierData.full_name}
            />

            {/* Dashboard content with notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ganhos Hoje</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">R$ {stats.todayEarnings.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.completedOrders} entregas realizadas
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ganhos da Semana</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">R$ {stats.weekEarnings.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        Meta: R$ 500,00
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Active delivery preview */}
                {activeOrderId && (
                  <Card className="border-green-500 bg-green-50 dark:bg-green-950/20 mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Navigation className="w-5 h-5" />
                        Entrega Ativa
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Você tem uma entrega em andamento
                      </p>
                      <Button 
                        onClick={() => setActiveTab('delivery')}
                        className="w-full"
                      >
                        Ver Detalhes da Entrega
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('offers')}
                    className="h-20 flex-col"
                  >
                    <Package className="w-6 h-6 mb-2" />
                    Ver Corridas
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('map')}
                    className="h-20 flex-col"
                  >
                    <MapPin className="w-6 h-6 mb-2" />
                    Mapa
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('earnings')}
                    className="h-20 flex-col"
                  >
                    <DollarSign className="w-6 h-6 mb-2" />
                    Ganhos
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('profile')}
                    className="h-20 flex-col"
                  >
                    <User className="w-6 h-6 mb-2" />
                    Perfil
                  </Button>
                </div>
              </div>

              {/* Notifications panel */}
              <div>
                <CourierNotifications />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="offers">
            <RealTimeCourierOffers />
          </TabsContent>

          <TabsContent value="delivery">
            {activeOrderId ? (
              <ActiveDeliveryTracker orderId={activeOrderId} />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma entrega ativa</h3>
                  <p className="text-muted-foreground mb-4">
                    Aceite uma corrida para começar uma entrega
                  </p>
                  <Button onClick={() => setActiveTab('offers')}>
                    Ver Corridas Disponíveis
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="map">
            <DeliveryMap 
              activeOrder={activeOrder}
              userLocation={userLocation}
              onLocationUpdate={handleLocationUpdate}
            />
          </TabsContent>

          <TabsContent value="earnings">
            <CourierFinancial />
          </TabsContent>

          <TabsContent value="profile">
            <CourierProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}