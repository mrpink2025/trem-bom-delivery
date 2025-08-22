import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wifi, WifiOff } from "lucide-react";

interface CourierGoOnlineProps {
  isOnline: boolean;
  onToggleOnline: (isOnline: boolean) => void;
  courierName: string;
  locationError?: string | null;
}

export function CourierGoOnline({ 
  isOnline, 
  onToggleOnline, 
  courierName, 
  locationError 
}: CourierGoOnlineProps) {
  return (
    <Card className={`${isOnline ? 'bg-gradient-fresh' : 'bg-muted'} text-foreground`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {courierName}
            </h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-success" />
                ) : (
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm opacity-90">
                  {isOnline ? 'Online • Disponível para entregas' : 'Offline • Não recebendo pedidos'}
                </span>
              </div>
              {isOnline && (
                <Badge variant="default" className="bg-success/10 text-success border-success/20">
                  Ativo
                </Badge>
              )}
            </div>
            {locationError && (
              <div className="flex items-center space-x-1 mt-2">
                <MapPin className="w-4 h-4 text-warning" />
                <p className="text-sm text-warning">
                  Localização não disponível: {locationError}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <Switch
              checked={isOnline}
              onCheckedChange={onToggleOnline}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}