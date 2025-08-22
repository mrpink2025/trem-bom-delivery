import { useState } from 'react';
import { MapPin, Navigation, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LocationGate } from './LocationGate';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useToast } from '@/hooks/use-toast';

interface LocationHeaderProps {
  onLocationChange?: (location: any) => void;
}

export const LocationHeader = ({ onLocationChange }: LocationHeaderProps) => {
  const [showLocationGate, setShowLocationGate] = useState(false);
  const { location, clearLocation, getLocation } = useUserLocation();
  const { toast } = useToast();

  const handleLocationSet = (newLocation: any) => {
    onLocationChange?.(newLocation);
  };

  const handleClearLocation = () => {
    clearLocation();
    onLocationChange?.(null);
    toast({
      title: "Localização removida",
      description: "Suas informações de localização foram apagadas.",
    });
  };

  const handleRefreshLocation = async () => {
    try {
      const newLocation = await getLocation();
      onLocationChange?.(newLocation);
      toast({
        title: "Localização atualizada!",
        description: "Sua localização foi atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar localização",
        description: error.message,
      });
    }
  };

  const getLocationText = () => {
    if (!location.lat || !location.lng) {
      return "Definir localização";
    }

    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }

    if (location.address_text) {
      return location.address_text.split(',')[0]; // Primeira parte do endereço
    }

    return `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`;
  };

  const getSourceBadge = () => {
    if (!location.source) return null;

    const sourceConfig = {
      gps: { label: 'GPS', variant: 'default' as const, icon: Navigation },
      ip: { label: 'IP', variant: 'secondary' as const, icon: MapPin },
      manual: { label: 'Manual', variant: 'outline' as const, icon: MapPin },
      cache: { label: 'Salvo', variant: 'secondary' as const, icon: MapPin },
    };

    const config = sourceConfig[location.source];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="text-xs">
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 max-w-xs">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{getLocationText()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {location.lat && location.lng ? (
              <>
                <div className="p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Localização atual</span>
                    {getSourceBadge()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {location.address_text || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                  </p>
                  {location.accuracy && (
                    <p className="text-xs text-muted-foreground">
                      Precisão: ~{Math.round(location.accuracy/1000)}km
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLocationGate(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Alterar localização
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefreshLocation}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Atualizar localização
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleClearLocation}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar localização
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => setShowLocationGate(true)}>
                <MapPin className="w-4 h-4 mr-2" />
                Definir localização
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <LocationGate
        isOpen={showLocationGate}
        onClose={() => setShowLocationGate(false)}
        onLocationSet={handleLocationSet}
      />
    </>
  );
};