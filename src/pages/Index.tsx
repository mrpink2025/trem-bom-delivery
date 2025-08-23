import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Header from "@/components/layout/Header";
import ClientDashboard from "@/components/client/ClientDashboard";
import RestaurantDashboard from "@/components/restaurant/RestaurantDashboard";
import { NewCourierDashboard } from "@/components/courier/NewCourierDashboard";
import { AdminDashboardNew } from "@/components/admin/AdminDashboardNew";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-comida-gostosa.jpg";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";
import { LocationGate } from "@/components/location/LocationGate";
import { useUserLocation } from "@/hooks/useUserLocation";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'client' | 'seller' | 'courier' | 'admin'>('client');
  const [showLocationGate, setShowLocationGate] = useState(false);
  const { location } = useUserLocation();
  const [locationKey, setLocationKey] = useState(0); // Force re-render when location changes

  // Update userType based on authenticated user's profile (only on initial load)
  useEffect(() => {
    if (profile?.role && userType === 'client') {
      // Only set userType automatically on first load, not when user explicitly changes it
      setUserType(profile.role);
    }
  }, [profile?.role]); // Only depend on profile.role, not userType

  // Show location gate for clients without location after login
  useEffect(() => {
    if (user && profile?.role === 'client' && !location.lat && !location.lng && !showLocationGate) {
      console.log('🎯 Showing LocationGate - user needs location', {
        user: !!user,
        role: profile?.role,
        hasLocation: !!(location.lat && location.lng),
        showLocationGate
      });
      setShowLocationGate(true);
    }
  }, [user, profile, location]);

  // Handle location changes to force component updates
  const handleLocationSet = (newLocation: any) => {
    console.log('🎯 Location set in Index:', newLocation);
    setShowLocationGate(false);
    // Force re-render of all components that depend on location
    setLocationKey(prev => prev + 1);
  };

  // Show login prompt for unauthenticated users
  if (!loading && !user) {
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
                    onClick={() => navigate('/auth?mode=login')}
                    className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 border-2 border-white/80 bg-white/10 text-white hover:bg-white hover:text-primary font-medium backdrop-blur-sm w-full sm:w-auto min-h-[52px]"
                  >
                    Já tenho conta
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

  const renderDashboard = () => {
    switch (userType) {
      case 'client':
        return <ClientDashboard key={`client-${locationKey}`} />;
      case 'seller':
        return <RestaurantDashboard />;
      case 'courier':
        return <NewCourierDashboard />;
      case 'admin':
        // Admins can switch between dashboards
        return <AdminDashboardNew />;
      default:
        return <ClientDashboard key={`client-${locationKey}`} />;
    }
  };

  // Admin panel selector for switching between different dashboards
  const renderAdminPanelSelector = () => {
    if (profile?.role !== 'admin') return null;

    return (
      <div className="bg-card border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3 text-sm sm:text-base">Painel do Administrador - Escolha a visualização:</h3>
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
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]"
          >
            👤 <span className="hidden sm:inline">Visão</span> Cliente
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
        
        {/* Location Gate Modal */}
        <LocationGate
          isOpen={showLocationGate}
          onClose={() => setShowLocationGate(false)}
          onLocationSet={handleLocationSet}
        />
      </div>
    </ProtectedRoute>
  );
};

export default Index;