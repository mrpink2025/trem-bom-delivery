import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { isNativeApp } from "@/capacitor";

const PWAInstallBanner = () => {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  // Don't show on native platforms or if not installable, already installed, or dismissed
  if (isNativeApp() || !isInstallable || isInstalled || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    await installPWA();
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Instalar Trem Bão App</p>
            <p className="opacity-90">Tenha acesso rápido e receba notificações dos seus pedidos!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="bg-white/20 text-white hover:bg-white/30 border-white/30"
          >
            Instalar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-white hover:bg-white/20 p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;