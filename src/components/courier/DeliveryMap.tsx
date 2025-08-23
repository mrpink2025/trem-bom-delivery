import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Route, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DeliveryMapProps {
  activeOrder?: any;
  userLocation?: { lat: number; lng: number };
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({ 
  activeOrder, 
  userLocation,
  onLocationUpdate 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const courierMarker = useRef<mapboxgl.Marker | null>(null);
  const restaurantMarker = useRef<mapboxgl.Marker | null>(null);
  const customerMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const { toast } = useToast();

  // Carregar token do Mapbox
  useEffect(() => {
    const loadMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Erro ao carregar token do Mapbox:', error);
          toast({
            title: "Erro no Mapa",
            description: "Não foi possível carregar o token do mapa",
            variant: "destructive"
          });
          return;
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
          mapboxgl.accessToken = data.token;
        }
      } catch (error) {
        console.error('Erro ao obter token:', error);
      }
    };

    loadMapboxToken();
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [-49.2642, -16.6869], // Goiânia como centro padrão
      zoom: 12,
      attributionControl: false
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Atualizar localização do entregador
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (courierMarker.current) {
      courierMarker.current.remove();
    }

    // Criar marcador personalizado para entregador
    const courierElement = document.createElement('div');
    courierElement.className = 'courier-marker';
    courierElement.innerHTML = `
      <div class="w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
        <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
      </div>
    `;

    courierMarker.current = new mapboxgl.Marker(courierElement)
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);

    // Centralizar no entregador se não há pedido ativo
    if (!activeOrder) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15
      });
    }

    // Notificar mudança de localização
    if (onLocationUpdate) {
      onLocationUpdate(userLocation);
    }
  }, [userLocation, onLocationUpdate]);

  // Atualizar marcadores do pedido ativo
  useEffect(() => {
    if (!map.current || !activeOrder) return;

    // Limpar marcadores existentes
    if (restaurantMarker.current) {
      restaurantMarker.current.remove();
    }
    if (customerMarker.current) {
      customerMarker.current.remove();
    }

    const restaurantAddress = activeOrder.restaurant_address;
    const deliveryAddress = activeOrder.delivery_address;

    if (restaurantAddress?.lat && restaurantAddress?.lng) {
      // Marcador do restaurante
      const restaurantElement = document.createElement('div');
      restaurantElement.innerHTML = `
        <div class="w-10 h-10 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
          </svg>
        </div>
      `;

      restaurantMarker.current = new mapboxgl.Marker(restaurantElement)
        .setLngLat([restaurantAddress.lng, restaurantAddress.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">Retirada</h3>
            <p class="text-sm">${restaurantAddress.street || 'Restaurante'}</p>
          </div>
        `))
        .addTo(map.current);
    }

    if (deliveryAddress?.lat && deliveryAddress?.lng) {
      // Marcador do cliente
      const customerElement = document.createElement('div');
      customerElement.innerHTML = `
        <div class="w-10 h-10 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
          </svg>
        </div>
      `;

      customerMarker.current = new mapboxgl.Marker(customerElement)
        .setLngLat([deliveryAddress.lng, deliveryAddress.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">Entrega</h3>
            <p class="text-sm">${deliveryAddress.street || 'Local de entrega'}</p>
          </div>
        `))
        .addTo(map.current);
    }

    // Ajustar visualização para mostrar todos os marcadores
    if (userLocation && restaurantAddress && deliveryAddress) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([userLocation.lng, userLocation.lat]);
      bounds.extend([restaurantAddress.lng, restaurantAddress.lat]);
      bounds.extend([deliveryAddress.lng, deliveryAddress.lat]);
      
      map.current.fitBounds(bounds, { padding: 50 });
    }

  }, [activeOrder, userLocation]);

  // Calcular rota
  const calculateRoute = async (origin: [number, number], destination: [number, number]) => {
    if (!mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        setRouteInfo({
          distance: Math.round(route.distance / 1000 * 10) / 10, // km
          duration: Math.round(route.duration / 60) // minutos
        });

        // Adicionar rota ao mapa
        if (map.current) {
          if (map.current.getSource('route')) {
            map.current.removeLayer('route');
            map.current.removeSource('route');
          }

          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 5,
              'line-opacity': 0.8
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao calcular rota:', error);
    }
  };

  return (
    <div className="relative h-full">
      {/* Mapa */}
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      
      {/* Informações da rota */}
      {routeInfo && (
        <Card className="absolute top-4 left-4 z-10 w-64">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Route className="w-4 h-4" />
              <span>Informações da Rota</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>Distância</span>
              </span>
              <Badge variant="secondary">{routeInfo.distance} km</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Tempo</span>
              </span>
              <Badge variant="secondary">{routeInfo.duration} min</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão para calcular rota */}
      {activeOrder && userLocation && (
        <Card className="absolute bottom-4 left-4 z-10">
          <CardContent className="p-2">
            <button
              onClick={() => {
                const restaurantAddress = activeOrder.restaurant_address;
                if (restaurantAddress?.lng && restaurantAddress?.lat) {
                  calculateRoute(
                    [userLocation.lng, userLocation.lat],
                    [restaurantAddress.lng, restaurantAddress.lat]
                  );
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              <Navigation className="w-4 h-4" />
              <span>Calcular Rota</span>
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};