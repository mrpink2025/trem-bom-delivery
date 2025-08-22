import { useState, useCallback, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserLocation } from '@/hooks/useUserLocation';
import { AutocompleteAddress } from './AutocompleteAddress';
import { useToast } from '@/hooks/use-toast';

interface LocationGateProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSet: (location: any) => void;
}

export const LocationGate = ({ isOpen, onClose, onLocationSet }: LocationGateProps) => {
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [saveConsent, setSaveConsent] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { getLocation, setManualLocation, persistLocation } = useUserLocation();
  const { toast } = useToast();

  const handleAllowLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      const location = await getLocation();
      
      if (location.lat && location.lng) {
        // Persistir se consentimento for dado
        if (saveConsent) {
          await persistLocation(true);
        }
        
        onLocationSet(location);
        onClose();
        
        toast({
          title: "Localização obtida com sucesso!",
          description: `Encontramos você com precisão de ${location.accuracy ? Math.round(location.accuracy/1000) : '?'}km`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao obter localização",
        description: error.message,
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleManualAddress = (addressData: any) => {
    const location = setManualLocation(addressData);
    
    // Persistir se consentimento for dado
    if (saveConsent) {
      persistLocation(true);
    }
    
    onLocationSet(location);
    onClose();
    
    toast({
      title: "Endereço definido!",
      description: `Localização: ${addressData.address_text || `${addressData.city}, ${addressData.state}`}`,
    });
  };

  const handleNotNow = () => {
    onClose();
    toast({
      title: "Sem localização",
      description: "Você pode inserir sua localização a qualquer momento no cabeçalho.",
    });
  };

  if (showAddressInput) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Inserir Endereço
            </DialogTitle>
            <DialogDescription>
              Digite seu endereço para encontrar restaurantes próximos a você
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <AutocompleteAddress onAddressSelect={handleManualAddress} />
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="save-address-consent"
                checked={saveConsent}
                onCheckedChange={(checked) => setSaveConsent(!!checked)}
              />
              <label 
                htmlFor="save-address-consent" 
                className="text-sm text-muted-foreground leading-relaxed"
              >
                Salvar minha localização para próximas visitas (conforme LGPD)
              </label>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddressInput(false)}
                className="flex-1"
              >
                Voltar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Encontrar Restaurantes Próximos
          </DialogTitle>
          <DialogDescription>
            Para mostrar os melhores restaurantes perto de você, precisamos da sua localização
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Como usamos sua localização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Encontrar restaurantes próximos a você</p>
            <p>• Calcular tempo de entrega estimado</p>
            <p>• Mostrar opções de entrega disponíveis</p>
            <p>• Seus dados são protegidos conforme a LGPD</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox 
              id="save-location-consent"
              checked={saveConsent}
              onCheckedChange={(checked) => setSaveConsent(!!checked)}
            />
            <label 
              htmlFor="save-location-consent" 
              className="text-sm text-muted-foreground leading-relaxed"
            >
              Salvar minha localização para próximas visitas
            </label>
          </div>

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Você pode alterar essas configurações a qualquer momento no seu navegador
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <Button 
              onClick={handleAllowLocation}
              disabled={isGettingLocation}
              className="flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              {isGettingLocation ? 'Obtendo localização...' : 'Permitir Localização'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowAddressInput(true)}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Inserir Endereço
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleNotNow}
              className="text-muted-foreground"
            >
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};