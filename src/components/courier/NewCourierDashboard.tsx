import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import RealtimeNotificationCenter from '@/components/notifications/RealtimeNotificationCenter';

export function NewCourierDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { requestPermission } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [courierData, setCourierData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [offers, setOffers] = useState<any[]>([]);
  const { isTracking, currentLocation } = useRealtimeLocation(isOnline);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weekEarnings: 0,
    completedOrders: 0,
    rating: 4.8
  });

  // Tab options for the select dropdown
  const tabOptions = [
    { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { value: 'offers', label: 'Corridas', icon: Package },
    { value: 'delivery', label: 'Entrega', icon: Navigation },
    { value: 'map', label: 'Mapa', icon: MapPin },
    { value: 'earnings', label: 'Ganhos', icon: DollarSign },
    { value: 'profile', label: 'Perfil', icon: User }
  ];

  useEffect(() => {
    if (user) {
      loadCourierData();
      loadStats();
      checkActiveOrder();
      loadOnlineStatus();
      getUserLocation();
      setupOffersListener();
      requestNotificationPermission();
    }
  }, [user]);

  const requestNotificationPermission = async () => {
    try {
      const { subscribe } = usePushNotifications();
      await subscribe();
      console.log('Sistema de notificações push configurado');
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
    }
  };

  const setupOffersListener = () => {
    if (!user) return;

    // Listen for real-time offers
    const channel = supabase
      .channel('dispatch-offers-courier')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dispatch_offers',
        filter: `courier_id=eq.${user.id}`
      }, async (payload) => {
        const newOffer = payload.new as any;
        console.log('Nova oferta recebida:', newOffer);
        
        // Load order details
        const { data: orderData } = await supabase
          .from('orders')
          .select(`
            *,
            restaurants!inner(
              name,
              location
            )
          `)
          .eq('id', newOffer.order_id)
          .single();

        if (orderData) {
          const offerWithDetails = {
            ...newOffer,
            order: orderData
          };
          
          setOffers(prev => [...prev, offerWithDetails]);
          
          // Send push notification
          await sendPushNotification(offerWithDetails);
          
          // Switch to map tab to show offer
          setActiveTab('map');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendPushNotification = async (offer: any) => {
    try {
      await supabase.functions.invoke('push-notifications', {
        body: {
          user_id: user?.id,
          title: 'Nova Corrida Disponível! 🛵',
          body: `R$ ${(offer.estimated_earnings_cents / 100).toFixed(2)} - ${offer.distance_km}km`,
          data: {
            type: 'delivery_offer',
            offer_id: offer.id,
            amount: offer.estimated_earnings_cents,
            distance: offer.distance_km
          },
          actions: [
            { action: 'accept', title: 'Aceitar' },
            { action: 'reject', title: 'Recusar' }
          ]
        }
      });
      
      console.log('Notificação push enviada para oferta:', offer.id);
      
    } catch (error) {
      console.error('Erro ao enviar notificação push:', error);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-accept', {
        body: {
          offer_id: offerId
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro desconhecido');
      }

      // Remove offer from list
      setOffers(prev => prev.filter(o => o.id !== offerId));
      
      // Update active order
      setActiveOrderId(data.order_id);
      await loadActiveOrderData(data.order_id);
      
      toast({
        title: 'Corrida aceita!',
        description: 'Rota sendo calculada automaticamente. Dirija-se ao restaurante.'
      });

      // Switch to delivery tab
      setActiveTab('delivery');

      // Switch to map tab to show route
      setTimeout(() => {
        setActiveTab('map');
      }, 2000);

    } catch (error) {
      console.error('Erro ao aceitar oferta:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível aceitar a oferta',
        variant: 'destructive'
      });
    }
  };

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
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Painel do Entregador</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Bem-vindo, {courierData.full_name}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <RealtimeNotificationCenter />
              <div className="flex items-center gap-2">
                <Badge variant={isOnline ? "default" : "secondary"}>
                  <Wifi className="w-3 h-3 mr-1" />
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
                {isTracking && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <MapPin className="w-3 h-3 mr-1" />
                    Rastreando
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Select */}
          <div className="w-full">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue>
                  {(() => {
                    const currentTab = tabOptions.find(tab => tab.value === activeTab);
                    const IconComponent = currentTab?.icon || BarChart3;
                    return (
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{currentTab?.label || 'Dashboard'}</span>
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabOptions.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <SelectItem key={tab.value} value={tab.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

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
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full">
                <DeliveryMap 
                  activeOrder={activeOrder}
                  userLocation={currentLocation || userLocation}
                  onLocationUpdate={handleLocationUpdate}
                  offers={offers}
                  onAcceptOffer={handleAcceptOffer}
                />
              </CardContent>
            </Card>
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
