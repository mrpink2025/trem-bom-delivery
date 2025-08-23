import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search, Crosshair, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface LocationMapSelectorProps {
  currentLocation?: LocationData;
  onLocationSelect: (location: LocationData) => void;
  height?: string;
}

export function LocationMapSelector({ 
  currentLocation, 
  onLocationSelect,
  height = "400px" 
}: LocationMapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const { toast } = useToast();
  const { getCurrentLocation, loading: geoLoading } = useGeolocation();

  // Buscar token do Mapbox
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o mapa. Verifique a configuração do Mapbox.",
          variant: "destructive"
        });
      }
    };

    getMapboxToken();
  }, [toast]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;

    const initialLat = currentLocation?.latitude || -16.6869;
    const initialLng = currentLocation?.longitude || -49.2648;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [initialLng, initialLat],
      zoom: currentLocation ? 15 : 12
    });

    // Adicionar controles de navegação
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Adicionar marker inicial se existir localização
    if (currentLocation) {
      marker.current = new mapboxgl.Marker({
        draggable: true,
        color: '#3B82F6'
      })
        .setLngLat([initialLng, initialLat])
        .addTo(map.current);

      // Listener para arrastar o marker
      marker.current.on('dragend', handleMarkerDrag);
    }

    // Click no mapa para adicionar/mover marker
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      updateMarkerPosition(lat, lng);
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, currentLocation]);

  const handleMarkerDrag = () => {
    if (!marker.current) return;
    
    const lngLat = marker.current.getLngLat();
    updateLocation(lngLat.lat, lngLat.lng);
  };

  const updateMarkerPosition = (lat: number, lng: number) => {
    if (!map.current) return;

    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else {
      marker.current = new mapboxgl.Marker({
        draggable: true,
        color: '#3B82F6'
      })
        .setLngLat([lng, lat])
        .addTo(map.current);
      
      marker.current.on('dragend', handleMarkerDrag);
    }

    updateLocation(lat, lng);
  };

  const updateLocation = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      // Geocodificação reversa usando Mapbox
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=pt&country=BR`
      );
      
      if (!response.ok) throw new Error('Erro na geocodificação');
      
      const data = await response.json();
      const feature = data.features[0];
      
      let locationData: LocationData = { latitude: lat, longitude: lng };
      
      if (feature) {
        const addressComponents = feature.context || [];
        const placeComponents = feature.place_name.split(', ');
        
        locationData = {
          latitude: lat,
          longitude: lng,
          address: feature.place_name,
          street: feature.text || '',
          neighborhood: addressComponents.find((c: any) => c.id?.startsWith('neighborhood'))?.text || '',
          city: addressComponents.find((c: any) => c.id?.startsWith('place'))?.text || 'Goiânia',
          state: addressComponents.find((c: any) => c.id?.startsWith('region'))?.text || 'Goiás',
          zipCode: addressComponents.find((c: any) => c.id?.startsWith('postcode'))?.text || ''
        };
      }

      onLocationSelect(locationData);
      
      toast({
        title: "Localização atualizada",
        description: "As coordenadas foram atualizadas com sucesso"
      });
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      // Mesmo com erro na geocodificação, salvamos as coordenadas
      onLocationSelect({ latitude: lat, longitude: lng });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    try {
      const position = await getCurrentLocation();
      if (position.latitude && position.longitude) {
        map.current?.flyTo({
          center: [position.longitude, position.latitude],
          zoom: 16
        });
        updateMarkerPosition(position.latitude, position.longitude);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível obter sua localização atual",
        variant: "destructive"
      });
    }
  };

  const handleSearchAddress = async () => {
    if (!searchAddress.trim() || !mapboxToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchAddress)}.json?access_token=${mapboxToken}&country=BR&language=pt&proximity=${map.current?.getCenter().lng},${map.current?.getCenter().lat}`
      );
      
      if (!response.ok) throw new Error('Erro na busca de endereço');
      
      const data = await response.json();
      const feature = data.features[0];
      
      if (feature) {
        const [lng, lat] = feature.center;
        map.current?.flyTo({
          center: [lng, lat],
          zoom: 16
        });
        updateMarkerPosition(lat, lng);
      } else {
        toast({
          title: "Endereço não encontrado",
          description: "Tente uma busca mais específica",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar o endereço",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mapboxToken) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Carregando mapa...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Localização no Mapa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca de endereço */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search">Buscar endereço</Label>
            <Input
              id="search"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Digite um endereço..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={handleSearchAddress}
              disabled={loading || !searchAddress.trim()}
              size="icon"
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button
              onClick={handleCurrentLocation}
              disabled={geoLoading}
              size="icon"
              variant="outline"
              title="Usar localização atual"
            >
              {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mapa */}
        <div 
          ref={mapContainer} 
          style={{ height }}
          className="w-full rounded-lg overflow-hidden border"
        />
        
        <p className="text-sm text-muted-foreground">
          Clique no mapa ou arraste o marcador para definir a localização exata do seu restaurante
        </p>
      </CardContent>
    </Card>
  );
}