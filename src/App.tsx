import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import { PlatformInfo } from "@/components/mobile/PlatformInfo";
import { AndroidSafeArea } from "@/components/mobile/AndroidSafeArea";
import { PermissionRequestDialog } from "@/components/mobile/PermissionRequestDialog";
import { useNativePermissions } from "@/hooks/useNativePermissions";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import TrackingPage from "./pages/TrackingPage";
import MenuPage from "./pages/MenuPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import AdminPanel from "./pages/AdminPanel";
import OrdersDashboard from "./pages/OrdersDashboard";
import SinucaPage from "./pages/SinucaPage";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { VoiceAssistant } from "@/components/notifications/VoiceAssistant";

const queryClient = new QueryClient();

function AppContent() {
  const { isNativeApp } = useNativePermissions();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);

  useEffect(() => {
    // On native app first launch, show permission dialog
    if (isNativeApp && !hasRequestedPermissions) {
      const hasShownBefore = localStorage.getItem('permissions-requested');
      if (!hasShownBefore) {
        setShowPermissionDialog(true);
      }
      setHasRequestedPermissions(true);
    }
  }, [isNativeApp, hasRequestedPermissions]);

  const handlePermissionsComplete = () => {
    localStorage.setItem('permissions-requested', 'true');
    setShowPermissionDialog(false);
  };

  return (
    <AndroidSafeArea>
      <BrowserRouter>
        <AnalyticsTracker />
        <VoiceAssistant />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<OrdersDashboard />} />
          <Route path="/menu/:restaurantId" element={<MenuPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/tracking/:orderId" element={<TrackingPage />} />
          <Route path="/jogos/sinuca" element={<SinucaPage />} />
          <Route 
            path="/admin/*" 
            element={
              <AdminProtectedRoute>
                <AdminPanel />
              </AdminProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      
      <PermissionRequestDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        onComplete={handlePermissionsComplete}
      />
    </AndroidSafeArea>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              <PlatformInfo />
              <AppContent />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
