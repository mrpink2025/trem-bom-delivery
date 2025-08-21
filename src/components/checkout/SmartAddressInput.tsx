import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddressSuggestion {
  place_name: string;
  center: [number, number];
  address: string;
  context: Array<{ id: string; text: string }>;
}

interface SmartAddressInputProps {
  onAddressChange?: (address: any) => void;
  initialAddress?: any;
}

export const SmartAddressInput = ({ onAddressChange, initialAddress }: SmartAddressInputProps) => {
  const { toast } = useToast();
  const [query, setQuery] = useState(initialAddress?.street || '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(initialAddress || null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Get Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error getting Mapbox token:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o autocomplete de endereços",
          variant: "destructive",
        });
      }
    };
    getMapboxToken();
  }, [toast]);

  // Geocoding search
  const searchAddresses = async (searchQuery: string) => {
    if (!mapboxToken || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${mapboxToken}&country=BR&language=pt&types=address,poi&limit=5`
      );
      const data = await response.json();
      
      const formattedSuggestions: AddressSuggestion[] = data.features.map((feature: any) => ({
        place_name: feature.place_name,
        center: feature.center,
        address: feature.text || feature.place_name,
        context: feature.context || []
      }));
      
      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      searchAddresses(query);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, mapboxToken]);

  // Get current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Erro",
        description: "Geolocalização não é suportada pelo seu navegador",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding
      if (mapboxToken) {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
          `access_token=${mapboxToken}&language=pt&types=address`
        );
        const data = await response.json();
        
        if (data.features.length > 0) {
          const feature = data.features[0];
          selectAddress({
            place_name: feature.place_name,
            center: [longitude, latitude],
            address: feature.text || feature.place_name,
            context: feature.context || []
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível obter sua localização",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.place_name);
    setSuggestions([]);
    
    // Parse address components
    const neighborhood = suggestion.context.find(c => c.id.includes('neighborhood'))?.text || '';
    const city = suggestion.context.find(c => c.id.includes('place'))?.text || '';
    const state = suggestion.context.find(c => c.id.includes('region'))?.text || '';
    const postcode = suggestion.context.find(c => c.id.includes('postcode'))?.text || '';

    const parsedAddress = {
      street: suggestion.address,
      number: '',
      complement: '',
      neighborhood,
      city,
      state,
      zipCode: postcode,
      latitude: suggestion.center[1],
      longitude: suggestion.center[0]
    };
    
    setSelectedAddress(parsedAddress);
  };

  const confirmAddress = async () => {
    if (!selectedAddress) return;
    
    setIsConfirming(true);
    try {
      onAddressChange?.(selectedAddress);
      toast({
        title: "Sucesso",
        description: "Endereço confirmado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao confirmar endereço",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Endereço de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Digite seu endereço..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-20"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-1 top-1 h-8 px-2"
            onClick={getCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="border rounded-md bg-background">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                onClick={() => selectAddress(suggestion)}
              >
                <div className="font-medium">{suggestion.address}</div>
                <div className="text-sm text-muted-foreground">
                  {suggestion.place_name}
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedAddress && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{selectedAddress.street}</div>
              <div className="text-sm text-muted-foreground">
                {selectedAddress.neighborhood}, {selectedAddress.city} - {selectedAddress.state}
              </div>
              {selectedAddress.zipCode && (
                <div className="text-sm text-muted-foreground">
                  CEP: {selectedAddress.zipCode}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Número"
                value={selectedAddress.number}
                onChange={(e) => setSelectedAddress(prev => ({ ...prev, number: e.target.value }))}
              />
              <Input
                placeholder="Complemento (opcional)"
                value={selectedAddress.complement}
                onChange={(e) => setSelectedAddress(prev => ({ ...prev, complement: e.target.value }))}
              />
            </div>

            <Button
              onClick={confirmAddress}
              disabled={isConfirming || !selectedAddress.number}
              className="w-full"
            >
              {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Endereço
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};