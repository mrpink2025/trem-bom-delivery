import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Clock, Truck } from 'lucide-react';
import { useDeliveryTracking } from '@/hooks/useDeliveryTracking';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryTrackingMapProps {
  orderId: string;
  deliveryAddress: {
    lat: number;
    lng: number;
    address: string;
  };
  restaurantAddress: {
    lat: number;
    lng: number;
    address: string;
  };
  className?: string;
}

export function DeliveryTrackingMap({
  orderId,
  deliveryAddress,
  restaurantAddress,
  className
}: DeliveryTrackingMapProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  
  const {
    locations,
    currentLocation,
    isTracking,
    isLoading,
    error,
    startTracking,
    stopTracking,
    updateDeliveryStatus
  } = useDeliveryTracking({ orderId });

  // Get Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (!error && data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error getting Mapbox token:', error);
      }
    };

    getMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [restaurantAddress.lng, restaurantAddress.lat],
      zoom: 13
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add restaurant marker
    new mapboxgl.Marker({ color: '#ff6b35' })
      .setLngLat([restaurantAddress.lng, restaurantAddress.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-2">
          <strong>Restaurante</strong><br>
          ${restaurantAddress.address}
        </div>
      `))
      .addTo(map.current);

    // Add delivery address marker
    new mapboxgl.Marker({ color: '#22c55e' })
      .setLngLat([deliveryAddress.lng, deliveryAddress.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-2">
          <strong>Destino</strong><br>
          ${deliveryAddress.address}
        </div>
      `))
      .addTo(map.current);

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, restaurantAddress, deliveryAddress]);

  // Update courier location and route
  useEffect(() => {
    if (!map.current || !currentLocation) return;

    // Remove existing courier marker
    const existingMarker = document.querySelector('[data-courier-marker]');
    if (existingMarker) {
      existingMarker.remove();
    }

    // Add courier marker (XSS-safe)
    const courierMarker = new mapboxgl.Marker({ 
      color: '#3b82f6',
      element: (() => {
        const el = document.createElement('div');
        el.className = 'courier-marker';
        el.setAttribute('data-courier-marker', 'true');
        
        const markerDiv = document.createElement('div');
        markerDiv.className = 'bg-blue-500 text-white rounded-full p-2 shadow-lg';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z');
        
        svg.appendChild(path);
        markerDiv.appendChild(svg);
        el.appendChild(markerDiv);
        return el;
      })()
     })
      .setLngLat([currentLocation.longitude, currentLocation.latitude])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-2">
          <strong>Entregador</strong><br>
          Status: ${getStatusLabel(currentLocation.status)}<br>
          ${currentLocation.eta_minutes ? `ETA: ${currentLocation.eta_minutes} min` : ''}
        </div>
      `))
      .addTo(map.current);

    // Draw route if available
    if (locations.length > 1) {
      const coordinates = locations.map(loc => [loc.longitude, loc.latitude]);
      
      // Add or update route line
      if (map.current.getSource('route')) {
        (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates
          }
        });
      } else {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates
            }
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
            'line-width': 4
          }
        });
      }
    }

    // Fit map to show all points
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([restaurantAddress.lng, restaurantAddress.lat]);
    bounds.extend([deliveryAddress.lng, deliveryAddress.lat]);
    bounds.extend([currentLocation.longitude, currentLocation.latitude]);
    
    map.current.fitBounds(bounds, { padding: 50 });
  }, [currentLocation, locations, restaurantAddress, deliveryAddress]);

  const getStatusLabel = (status: string) => {
    const labels = {
      created: 'Criado',
      accepted: 'Aceito',
      picked_up: 'Retirado',
      in_transit: 'A caminho',
      arrived: 'Chegou ao destino',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      created: 'bg-gray-500',
      accepted: 'bg-blue-500',
      picked_up: 'bg-yellow-500',
      in_transit: 'bg-orange-500',
      arrived: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const handleStartTracking = async () => {
    try {
      await startTracking(deliveryAddress.lat, deliveryAddress.lng);
      toast({
        title: 'Rastreamento iniciado',
        description: 'Sua localização está sendo compartilhada'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o rastreamento',
        variant: 'destructive'
      });
    }
  };

  const handleStopTracking = () => {
    stopTracking();
    toast({
      title: 'Rastreamento parado',
      description: 'Sua localização não está mais sendo compartilhada'
    });
  };

  const handleStatusUpdate = async (status: 'picked_up' | 'arrived' | 'delivered') => {
    try {
      await updateDeliveryStatus(status, deliveryAddress.lat, deliveryAddress.lng);
      toast({
        title: 'Status atualizado',
        description: `Status alterado para: ${getStatusLabel(status)}`
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Rastreamento da Entrega
          </h3>
          
          {currentLocation && (
            <Badge className={getStatusColor(currentLocation.status)}>
              {getStatusLabel(currentLocation.status)}
            </Badge>
          )}
        </div>

        {/* Delivery Info */}
        {currentLocation && (
          <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {currentLocation.eta_minutes ? (
                <span>ETA: {currentLocation.eta_minutes} min</span>
              ) : (
                <span>Calculando tempo...</span>
              )}
            </div>
            
            {currentLocation.distance_to_destination && (
              <div className="flex items-center">
                <Navigation className="w-4 h-4 mr-1" />
                <span>{currentLocation.distance_to_destination.toFixed(1)} km</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={mapContainer} className="h-80" />
        
        {!mapboxToken && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Carregando mapa...</p>
          </div>
        )}
      </div>

      {/* Controls for Courier */}
      {profile?.role === 'courier' && (
        <div className="p-4 border-t">
          <div className="flex flex-wrap gap-2">
            {!isTracking ? (
              <Button onClick={handleStartTracking} size="sm">
                <MapPin className="w-4 h-4 mr-2" />
                Iniciar Rastreamento
              </Button>
            ) : (
              <Button onClick={handleStopTracking} variant="outline" size="sm">
                <MapPin className="w-4 h-4 mr-2" />
                Parar Rastreamento
              </Button>
            )}

            <Button 
              onClick={() => handleStatusUpdate('picked_up')} 
              variant="outline" 
              size="sm"
              disabled={currentLocation?.status !== 'accepted'}
            >
              Pedido Retirado
            </Button>

            <Button 
              onClick={() => handleStatusUpdate('arrived')} 
              variant="outline" 
              size="sm"
              disabled={currentLocation?.status !== 'in_transit'}
            >
              Chegou ao Destino
            </Button>

            <Button 
              onClick={() => handleStatusUpdate('delivered')} 
              variant="outline" 
              size="sm"
              disabled={currentLocation?.status !== 'arrived'}
            >
              Entrega Concluída
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="p-4 border-t">
        <h4 className="font-medium mb-3">Histórico</h4>
        <div className="space-y-2">
          {locations.slice(-5).reverse().map((location, index) => (
            <div key={location.id} className="flex items-center text-sm">
              <div className={`w-2 h-2 rounded-full mr-3 ${getStatusColor(location.status)}`} />
              <div className="flex-1">
                <span className="font-medium">{getStatusLabel(location.status)}</span>
                <span className="text-muted-foreground ml-2">
                  {new Date(location.created_at || location.timestamp || new Date()).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}