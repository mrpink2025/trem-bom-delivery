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
  offers?: any[];
  onAcceptOffer?: (offerId: string) => void;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({ 
  activeOrder, 
  userLocation,
  onLocationUpdate,
  offers = [],
  onAcceptOffer
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const courierMarker = useRef<mapboxgl.Marker | null>(null);
  const restaurantMarker = useRef<mapboxgl.Marker | null>(null);
  const customerMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [offerMarkers, setOfferMarkers] = useState<mapboxgl.Marker[]>([]);
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

  // Calcular e exibir rota
  const calculateAndDisplayRoute = async (origin: [number, number], destination: [number, number]) => {
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
          if (map.current.getSource('active-route')) {
            map.current.removeLayer('active-route');
            map.current.removeSource('active-route');
          }

          map.current.addSource('active-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });

          map.current.addLayer({
            id: 'active-route',
            type: 'line',
            source: 'active-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#22c55e',
              'line-width': 6,
              'line-opacity': 0.8
            }
          });

          toast({
            title: 'Rota calculada!',
            description: `${(route.distance / 1000).toFixed(1)} km em ${Math.round(route.duration / 60)} minutos`
          });
        }
      }
    } catch (error) {
      console.error('Erro ao calcular rota:', error);
    }
  };

  // Atualizar localização do entregador
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (courierMarker.current) {
      courierMarker.current.remove();
    }

    // Criar marcador personalizado para entregador (XSS-safe)
    const courierElement = document.createElement('div');
    courierElement.className = 'courier-marker';
    
    const outerDiv = document.createElement('div');
    outerDiv.className = 'w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center';
    
    const innerDiv = document.createElement('div');
    innerDiv.className = 'w-3 h-3 bg-white rounded-full animate-pulse';
    
    outerDiv.appendChild(innerDiv);
    courierElement.appendChild(outerDiv);

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
      // Marcador do restaurante (XSS-safe)
      const restaurantElement = document.createElement('div');
      
      const restaurantDiv = document.createElement('div');
      restaurantDiv.className = 'w-10 h-10 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center';
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'w-5 h-5 text-white');
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('viewBox', '0 0 20 20');
      
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M10 12a2 2 0 100-4 2 2 0 000 4z');
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('fill-rule', 'evenodd');
      path2.setAttribute('d', 'M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z');
      path2.setAttribute('clip-rule', 'evenodd');
      
      svg.appendChild(path1);
      svg.appendChild(path2);
      restaurantDiv.appendChild(svg);
      restaurantElement.appendChild(restaurantDiv);

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
      // Marcador do cliente (XSS-safe)
      const customerElement = document.createElement('div');
      
      const customerDiv = document.createElement('div');
      customerDiv.className = 'w-10 h-10 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center';
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'w-5 h-5 text-white');
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('viewBox', '0 0 20 20');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill-rule', 'evenodd');
      path.setAttribute('d', 'M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z');
      path.setAttribute('clip-rule', 'evenodd');
      
      svg.appendChild(path);
      customerDiv.appendChild(svg);
      customerElement.appendChild(customerDiv);

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

  // Atualizar marcadores das ofertas
  useEffect(() => {
    if (!map.current || !offers) return;

    // Limpar marcadores antigos de ofertas
    offerMarkers.forEach(marker => marker.remove());
    setOfferMarkers([]);

    const newOfferMarkers: mapboxgl.Marker[] = [];

    offers.forEach((offer) => {
      if (offer.order?.restaurants?.location) {
        const location = offer.order.restaurants.location;
        
        // Criar marcador pulsante para ofertas (XSS-safe)
        const offerElement = document.createElement('div');
        offerElement.className = 'offer-marker';
        
        const containerDiv = document.createElement('div');
        containerDiv.className = 'relative';
        
        const offerDiv = document.createElement('div');
        offerDiv.className = 'w-12 h-12 bg-yellow-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse';
        
        const innerDiv = document.createElement('div');
        innerDiv.className = 'w-6 h-6 bg-white rounded-full flex items-center justify-center';
        
        const span = document.createElement('span');
        span.className = 'text-yellow-500 font-bold text-xs';
        span.textContent = 'R$';
        
        const priceDiv = document.createElement('div');
        priceDiv.className = 'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded';
        priceDiv.textContent = `R$ ${(offer.estimated_earnings_cents / 100).toFixed(2)}`;
        
        innerDiv.appendChild(span);
        offerDiv.appendChild(innerDiv);
        containerDiv.appendChild(offerDiv);
        containerDiv.appendChild(priceDiv);
        offerElement.appendChild(containerDiv);

        // Adicionar evento de clique
        offerElement.addEventListener('click', () => {
          if (onAcceptOffer) {
            const confirmation = confirm(
              `Aceitar corrida por R$ ${(offer.estimated_earnings_cents / 100).toFixed(2)}?\n` +
              `Distância: ${offer.distance_km}km\n` +
              `Tempo estimado: ${offer.eta_minutes} min`
            );
            
            if (confirmation) {
              onAcceptOffer(offer.id);
            }
          }
        });

        const marker = new mapboxgl.Marker(offerElement)
          .setLngLat([location.lng || location.coordinates[0], location.lat || location.coordinates[1]])
          .addTo(map.current);

        newOfferMarkers.push(marker);
      }
    });

    setOfferMarkers(newOfferMarkers);

    // Ajustar visualização se há ofertas
    if (offers.length > 0 && userLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([userLocation.lng, userLocation.lat]);
      
      offers.forEach(offer => {
        const location = offer.order?.restaurants?.location;
        if (location) {
          bounds.extend([
            location.lng || location.coordinates[0], 
            location.lat || location.coordinates[1]
          ]);
        }
      });
      
      map.current.fitBounds(bounds, { padding: 50 });
    }

  }, [offers, onAcceptOffer, userLocation]);

  // Calcular rota automaticamente quando há pedido ativo
  useEffect(() => {
    if (activeOrder && userLocation) {
      const restaurantLocation = activeOrder.restaurant_address;
      if (restaurantLocation?.lng && restaurantLocation?.lat) {
        calculateAndDisplayRoute(
          [userLocation.lng, userLocation.lat],
          [restaurantLocation.lng, restaurantLocation.lat]
        );
      }
    }
  }, [activeOrder, userLocation, mapboxToken]);

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

      {/* Ofertas no mapa */}
      {offers.length > 0 && (
        <Card className="absolute top-4 right-4 z-10 w-64">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ofertas no Mapa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {offers.length} oferta(s) disponível(is). Clique nos marcadores amarelos para aceitar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Botão para calcular rota manual */}
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