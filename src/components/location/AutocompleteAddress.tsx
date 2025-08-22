import { useState, useCallback, useEffect } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/utils/performance';
import { useToast } from '@/hooks/use-toast';

interface AddressSuggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{ id: string; text: string }>;
}

interface AutocompleteAddressProps {
  onAddressSelect: (address: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    neighborhood?: string;
    address_text: string;
  }) => void;
  initialAddress?: string;
}

export const AutocompleteAddress = ({ 
  onAddressSelect, 
  initialAddress = '' 
}: AutocompleteAddressProps) => {
  const [query, setQuery] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar token do Mapbox na inicialização
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Failed to fetch Mapbox token:', error);
        toast({
          variant: "destructive",
          title: "Erro de configuração",
          description: "Não foi possível carregar o serviço de mapas. Tente novamente mais tarde.",
        });
      }
    };

    fetchMapboxToken();
  }, [toast]);

  const searchAddresses = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || !mapboxToken || searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
          new URLSearchParams({
            access_token: mapboxToken,
            country: 'BR',
            types: 'address,poi',
            limit: '5',
            language: 'pt'
          })
        );

        if (!response.ok) {
          throw new Error('Falha na busca de endereços');
        }

        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        console.error('Address search error:', error);
        setSuggestions([]);
        toast({
          variant: "destructive",
          title: "Erro na busca",
          description: "Não foi possível buscar endereços. Verifique sua conexão.",
        });
      } finally {
        setLoading(false);
      }
    }, 300),
    [mapboxToken, toast]
  );

  useEffect(() => {
    searchAddresses(query);
  }, [query, searchAddresses]);

  const getCurrentLocation = useCallback(async () => {
    if (!mapboxToken) return;

    setLoading(true);
    try {
      // Tentar obter localização via GPS
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      const { latitude, longitude } = position.coords;

      // Fazer reverse geocoding
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
        new URLSearchParams({
          access_token: mapboxToken,
          language: 'pt'
        })
      );

      if (!response.ok) {
        throw new Error('Falha no reverse geocoding');
      }

      const data = await response.json();
      const feature = data.features[0];

      if (feature) {
        setQuery(feature.place_name);
        setSelectedAddress(feature);
      }

      toast({
        title: "Localização encontrada!",
        description: "Endereço atual carregado com sucesso.",
      });

    } catch (error) {
      console.error('Current location error:', error);
      toast({
        variant: "destructive",
        title: "Erro de localização",
        description: "Não foi possível obter sua localização atual.",
      });
    } finally {
      setLoading(false);
    }
  }, [mapboxToken, toast]);

  const selectAddress = useCallback((suggestion: AddressSuggestion) => {
    setQuery(suggestion.place_name);
    setSuggestions([]);
    setSelectedAddress(suggestion);
  }, []);

  const parseAddressContext = useCallback((suggestion: AddressSuggestion) => {
    const context = suggestion.context || [];
    let city = '';
    let state = '';
    let neighborhood = '';

    context.forEach(item => {
      if (item.id.startsWith('place.')) {
        city = item.text;
      } else if (item.id.startsWith('region.')) {
        state = item.text;
      } else if (item.id.startsWith('neighborhood.')) {
        neighborhood = item.text;
      }
    });

    return { city, state, neighborhood };
  }, []);

  const confirmAddress = useCallback(() => {
    if (!selectedAddress) return;

    const [lng, lat] = selectedAddress.center;
    const { city, state, neighborhood } = parseAddressContext(selectedAddress);

    onAddressSelect({
      lat,
      lng,
      city,
      state,
      neighborhood,
      address_text: selectedAddress.place_name,
    });
  }, [selectedAddress, parseAddressContext, onAddressSelect]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="Digite seu endereço..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          disabled={!mapboxToken}
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
        )}
      </div>

      <Button
        variant="outline"
        onClick={getCurrentLocation}
        disabled={!mapboxToken || loading}
        className="w-full"
      >
        <Navigation className="w-4 h-4 mr-2" />
        Usar Localização Atual
      </Button>

      {suggestions.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  onClick={() => selectAddress(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{suggestion.place_name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAddress && (
        <div className="space-y-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Endereço selecionado:</p>
                  <p className="text-sm text-muted-foreground">{selectedAddress.place_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={confirmAddress} className="w-full">
            Confirmar Endereço
          </Button>
        </div>
      )}
    </div>
  );
};