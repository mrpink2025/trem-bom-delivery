import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Header from "@/components/layout/Header";
import ClientDashboard from "@/components/client/ClientDashboard";
import RestaurantDashboard from "@/components/restaurant/RestaurantDashboard";
import CourierDashboard from "@/components/courier/CourierDashboard";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-goiania-style.jpg";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'client' | 'seller' | 'courier' | 'admin'>('client');

  // Update userType based on authenticated user's profile
  useEffect(() => {
    if (profile?.role) {
      setUserType(profile.role);
    }
  }, [profile]);

  // Show login prompt for unauthenticated users
  if (!loading && !user) {
    return (
      <div className="min-h-screen">
        <div className="relative h-screen overflow-hidden">
          <img 
            src={heroImage} 
            alt="Trem Bão Delivery - Sabor goiano direto na sua casa"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl text-white space-y-6">
                <h1 className="text-5xl md:text-7xl font-bold">
                  Trem Bão<br />
                  <span className="text-secondary">Delivery</span>
                </h1>
                <p className="text-2xl md:text-3xl opacity-90">
                  Sabor goiano direto na sua mesa!
                </p>
                <p className="text-xl opacity-80 max-w-2xl">
                  Os melhores sabores de Goiás agora no seu celular. 
                  Entre ou cadastre-se para começar seu pedido!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/auth')}
                    className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-warm font-medium"
                  >
                    Começar agora
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate('/auth?mode=login')}
                    className="text-lg px-8 py-6 border-2 border-white/80 bg-white/10 text-white hover:bg-white hover:text-primary font-medium backdrop-blur-sm"
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
        return <ClientDashboard />;
      case 'seller':
        return <RestaurantDashboard />;
      case 'courier':
        return <CourierDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <ClientDashboard />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header userType={userType} onUserTypeChange={setUserType} />
        
        {/* Hero Section - Only for client view */}
        {userType === 'client' && (
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img 
              src={heroImage} 
              alt="Trem Bão Delivery - Sabor goiano direto na sua casa"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 flex items-center">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl text-white space-y-4">
                  <h1 className="text-4xl md:text-6xl font-bold">
                    Trem Bão<br />
                    <span className="text-secondary">Delivery</span>
                  </h1>
                  <p className="text-xl md:text-2xl opacity-90">
                    Sabor goiano direto na sua mesa!
                  </p>
                  <p className="text-lg opacity-80">
                    Os melhores sabores de Goiás agora no seu celular
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderDashboard()}
      </div>
    </ProtectedRoute>
  );
};

export default Index;