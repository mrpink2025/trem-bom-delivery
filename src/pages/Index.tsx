import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Header from "@/components/layout/Header";
import ClientDashboard from "@/components/client/ClientDashboard";
import RestaurantDashboard from "@/components/restaurant/RestaurantDashboard";
import { NewCourierDashboard } from "@/components/courier/NewCourierDashboard";
import { AdminDashboardNew } from "@/components/admin/AdminDashboardNew";
import GamesModule from "@/components/games/GamesModule";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import heroImage from "@/assets/hero-comida-gostosa.jpg";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";
import { LocationGate } from "@/components/location/LocationGate";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Gamepad2, MapPin, Utensils, User } from 'lucide-react';
import { FinishAllMatches } from "@/components/admin/FinishAllMatches";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'client' | 'seller' | 'courier' | 'admin'>('client');
  const [showLocationGate, setShowLocationGate] = useState(false);
  const [locationGateShown, setLocationGateShown] = useState(false); // Track if gate was already shown
  const { location } = useUserLocation();
  const [locationKey, setLocationKey] = useState(0); // Force re-render when location changes
  const [currentLocation, setCurrentLocation] = useState(location); // State local da localização
  const [showGuestView, setShowGuestView] = useState(false); // Para mostrar dashboard sem autenticação

  // Sincronizar com mudanças no hook useUserLocation
  useEffect(() => {
    console.log('🔄 Sincronizando localização do hook:', location);
    setCurrentLocation(location);
  }, [location]);

  // Update userType based on authenticated user's profile (only on initial load)
  useEffect(() => {
    if (profile?.role && userType === 'client') {
      // Only set userType automatically on first load, not when user explicitly changes it
      setUserType(profile.role);
    }
  }, [profile?.role]); // Only depend on profile.role, not userType

  // Show location gate for clients without location after login (only once per session)
  useEffect(() => {
    // Só mostrar LocationGate se:
    // 1. É um usuário cliente logado OU está no modo guest
    // 2. Não tem coordenadas
    // 3. Não está carregando
    // 4. Ainda não foi mostrado nesta sessão
    // 5. Não está já aberto
    const shouldShowLocationGate = ((user && profile?.role === 'client') || (!user && showGuestView)) && 
                                   (!currentLocation.lat || !currentLocation.lng) && 
                                   !currentLocation.loading &&
                                   !locationGateShown &&
                                   !showLocationGate;
    
    console.log('🎯 Location gate check:', {
      user: !!user,
      role: profile?.role,
      showGuestView,
      hasCoordinates: !!(currentLocation.lat && currentLocation.lng),
      hasCity: !!currentLocation.city,
      source: currentLocation.source,
      loading: currentLocation.loading,
      locationGateShown,
      showLocationGate,
      shouldShowLocationGate
    });
    
    if (shouldShowLocationGate) {
      console.log('🎯 Showing LocationGate - first time for this session');
      setShowLocationGate(true);
      setLocationGateShown(true); // Mark as shown for this session
    }
  }, [user, profile?.role, showGuestView, currentLocation.lat, currentLocation.lng, currentLocation.loading, locationGateShown, showLocationGate]);

  // Handle location changes to force component updates
  const handleLocationSet = (newLocation: any) => {
    console.log('🎯 Location set in Index:', newLocation);
    console.log('🎯 Updating currentLocation state...');
    setCurrentLocation(newLocation);
    setShowLocationGate(false);
    // Force re-render apenas uma vez
    setLocationKey(prev => prev + 1);
  };

  // Prevent showing location gate again after it was closed
  const handleLocationGateClose = () => {
    console.log('🚪 LocationGate closed by user');
    setShowLocationGate(false);
  };

  // Show login prompt for unauthenticated users (unless in guest view)
  if (!loading && !user && !showGuestView) {
    return (
      <div className="min-h-screen">
        <div className="relative h-screen overflow-hidden">
          <img 
            src={heroImage} 
            alt="Trem Bão Delivery - Conectando botecos e restaurantes locais"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 flex items-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-3xl text-white space-y-4 sm:space-y-6">
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold leading-tight">
                  Trem Bão<br />
                  <span className="text-secondary">Delivery</span>
                </h1>
                <p className="text-lg sm:text-2xl md:text-3xl opacity-90">
                  Sabor mineiro e goiano direto na sua mesa!
                </p>
                <p className="text-base sm:text-xl opacity-80 max-w-2xl">
                  Conectando você aos melhores botecos e restaurantes locais de Minas e Goiás. 
                  Conveniência moderna com o sabor autêntico da sua região!
                </p>
                <div className="flex flex-col gap-3 sm:gap-4 pt-4 sm:flex-row">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/auth')}
                    className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-warm font-medium w-full sm:w-auto min-h-[52px]"
                  >
                    Começar agora
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => setShowGuestView(true)}
                    className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 border-2 border-white/80 bg-white/10 text-white hover:bg-white hover:text-primary font-medium backdrop-blur-sm w-full sm:w-auto min-h-[52px]"
                  >
                    Ver restaurantes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <PWAInstallBanner />
      </div>
    );
  }

  // Show guest view for unauthenticated users who clicked "Ver restaurantes"
  if (!loading && !user && showGuestView) {
    return (
      <div className="min-h-screen">
        <Header key={`header-guest-${locationKey}`} userType="client" onUserTypeChange={() => {}} />
        
        {/* Hero Section for guests */}
        <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
          <img 
            src={heroImage} 
            alt="Trem Bão Delivery - Conectando botecos e restaurantes locais"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 flex items-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-2xl text-white space-y-3 sm:space-y-4">
                <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold leading-tight">
                  Trem Bão<br />
                  <span className="text-secondary">Delivery</span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl opacity-90">
                  Sabor mineiro e goiano direto na sua mesa!
                </p>
                <p className="text-sm sm:text-lg opacity-80">
                  Explore nossos restaurantes. Para fazer pedidos, <Button variant="link" className="text-secondary p-0 h-auto font-medium underline" onClick={() => navigate('/auth')}>cadastre-se</Button>
                </p>
              </div>
            </div>
          </div>
        </div>

        <ClientDashboard key={`client-guest-${locationKey}`} userLocation={currentLocation} />
        
        {/* Location Gate Modal for guests */}
        <LocationGate
          isOpen={showLocationGate}
          onClose={handleLocationGateClose}
          onLocationSet={handleLocationSet}
        />
      </div>
    );
  }

  const renderClientDashboard = () => {
    return (
      <Tabs defaultValue="restaurants" className="w-full">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              <span className="hidden sm:inline">Restaurantes</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">Jogos</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Localização</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants" className="mt-6">
            <ClientDashboard key={`client-${locationKey}`} userLocation={currentLocation} />
          </TabsContent>

          <TabsContent value="games" className="mt-6">
            <GamesModule />
          </TabsContent>

          <TabsContent value="location" className="mt-6">
            <LocationGate 
              isOpen={true} 
              onClose={() => {}} 
              onLocationSet={handleLocationSet} 
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Perfil do Usuário</h2>
              <p className="text-muted-foreground">Em desenvolvimento...</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    );
  };

  const renderDashboard = () => {
    switch (userType) {
      case 'client':
        return renderClientDashboard();
      case 'seller':
        return <RestaurantDashboard />;
      case 'courier':
        return <NewCourierDashboard />;
      case 'admin':
        return <AdminDashboardNew />;
      default:
        return renderClientDashboard();
    }
  };

  // Admin panel selector for switching between different dashboards
  const renderAdminPanelSelector = () => {
    if (profile?.role !== 'admin') return null;

    return (
      <div className="bg-card border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3 text-sm sm:text-base">Painel do Administrador - Escolha a visualização:</h3>
        
        {/* Banner dos Jogos */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">Módulo de Jogos Implementado!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Clique em "🎮 Jogos & Cliente" para ver o novo sistema de jogos com créditos (Jogo da Velha funcional + placeholders para outros jogos)
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button
            variant={userType === 'admin' ? 'default' : 'outline'}
            onClick={() => setUserType('admin')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]"
          >
            🏢 <span className="hidden sm:inline">Dashboard</span> Admin
          </Button>
          <Button
            variant={userType === 'client' ? 'default' : 'outline'}
            onClick={() => setUserType('client')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] bg-primary/10 border-primary"
          >
            🎮 <span className="hidden sm:inline">Jogos &</span> Cliente
          </Button>
          <Button
            variant={userType === 'seller' ? 'default' : 'outline'}
            onClick={() => setUserType('seller')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]"
          >
            🏪 <span className="hidden sm:inline">Visão</span> Restaurante
          </Button>
          <Button
            variant={userType === 'courier' ? 'default' : 'outline'}
            onClick={() => setUserType('courier')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]"
          >
            🏍️ <span className="hidden sm:inline">Visão</span> Entregador
          </Button>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header key={`header-${locationKey}`} userType={userType} onUserTypeChange={setUserType} />
        
        {/* Admin Panel Selector */}
        {renderAdminPanelSelector()}
        
        {/* Emergency Admin Actions - Only for admins */}
        {profile?.role === 'admin' && (
          <div className="container mx-auto px-4 sm:px-6 mb-6">
            <FinishAllMatches />
          </div>
        )}
        
        {/* Hero Section - Only for client view */}
        {userType === 'client' && (
          <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
            <img 
              src={heroImage} 
              alt="Trem Bão Delivery - Conectando botecos e restaurantes locais"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 flex items-center">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-2xl text-white space-y-3 sm:space-y-4">
                  <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold leading-tight">
                    Trem Bão<br />
                    <span className="text-secondary">Delivery</span>
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl opacity-90">
                    Sabor mineiro e goiano direto na sua mesa!
                  </p>
                  <p className="text-sm sm:text-lg opacity-80 hidden sm:block">
                    Conectando botecos locais, restaurantes e você
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderDashboard()}
        
        {/* Location Gate Modal - Only show when not in location tab */}
        <LocationGate
          isOpen={showLocationGate}
          onClose={handleLocationGateClose}
          onLocationSet={handleLocationSet}
        />
      </div>
    </ProtectedRoute>
  );
};

export default Index;