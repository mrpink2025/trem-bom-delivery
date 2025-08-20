import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePWA } from "@/hooks/usePWA";
import { isNativeApp } from "@/capacitor";
import { 
  Smartphone, 
  Download, 
  X, 
  Wifi, 
  WifiOff,
  Bell,
  BellOff,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PWAInstallPrompt() {
  const { 
    isInstallable, 
    isInstalled, 
    isOnline, 
    notificationPermission,
    installPWA,
    requestNotificationPermission,
    showNotification
  } = usePWA();
  
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Don't show prompts on native platforms
    if (isNativeApp()) return;
    
    // Show install prompt after user interaction
    const handleUserInteraction = () => {
      if (!hasInteracted && isInstallable && !isInstalled) {
        setHasInteracted(true);
        // Delay to not interrupt user flow
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    // Show notification prompt if notifications are default (not granted/denied)
    if (notificationPermission.default && !showNotificationPrompt) {
      setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 5000);
    }

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('scroll', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
    };
  }, [isInstallable, isInstalled, hasInteracted, notificationPermission.default, showNotificationPrompt]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setShowInstallPrompt(false);
      // Removed install success notification for native app compatibility
    }
  };

  const handleNotificationPermission = async () => {
    const permission = await requestNotificationPermission();
    setShowNotificationPrompt(false);
    
    if (permission.granted) {
      showNotification('Notificações ativadas!', {
        body: 'Você receberá atualizações sobre seus pedidos',
        icon: '/icon-192x192.png',
        tag: 'notification-enabled'
      });
    }
  };

  return (
    <>
      {/* Online/Offline Status */}
      <div className={cn(
        "fixed top-16 right-4 z-50 transition-all duration-300",
        isOnline ? "translate-y-0 opacity-0" : "translate-y-0 opacity-100"
      )}>
        {!isOnline && (
          <Badge variant="destructive" className="flex items-center space-x-2 p-2">
            <WifiOff className="w-4 h-4" />
            <span>Offline</span>
          </Badge>
        )}
      </div>

      {/* PWA Install Prompt */}
      {showInstallPrompt && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <Card className="shadow-glow border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-warm rounded-lg flex items-center justify-center">
                    <Home className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    Instalar Trem Bão
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Tenha acesso rápido na sua tela inicial
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInstallPrompt(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Instalar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Permission Prompt */}
      {showNotificationPrompt && notificationPermission.default && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <Card className="shadow-glow border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-fresh rounded-lg flex items-center justify-center">
                    <Bell className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    Ativar Notificações
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizações sobre seus pedidos
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotificationPrompt(false)}
                  >
                    <BellOff className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNotificationPermission}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Ativar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PWA Features Banner (for installed users) - Removed for native app compatibility */}
    </>
  );
}