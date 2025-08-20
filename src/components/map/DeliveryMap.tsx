import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryMapProps {
  orderId: string;
  restaurantLocation: { lat: number; lng: number };
  deliveryLocation: { lat: number; lng: number };
  courierLocation?: { lat: number; lng: number };
  className?: string;
}

export const DeliveryMap = ({ 
  orderId, 
  restaurantLocation, 
  deliveryLocation, 
  courierLocation,
  className = "w-full h-96 rounded-lg"
}: DeliveryMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const courierMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    // Get Mapbox token from Supabase secrets
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error getting Mapbox token:', error);
        // Fallback - ask user to enter token
        const token = prompt('Por favor, insira seu token público do Mapbox:');
        if (token) setMapboxToken(token);
      }
    };

    getMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [restaurantLocation.lng, restaurantLocation.lat],
      zoom: 13,
    });

    // Add restaurant marker
    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([restaurantLocation.lng, restaurantLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<p>Restaurante</p>'))
      .addTo(map.current);

    // Add delivery marker
    new mapboxgl.Marker({ color: '#22c55e' })
      .setLngLat([deliveryLocation.lng, deliveryLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<p>Destino</p>'))
      .addTo(map.current);

    // Add courier marker if available
    if (courierLocation) {
      courierMarker.current = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([courierLocation.lng, courierLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<p>Entregador</p>'))
        .addTo(map.current);
    }

    // Fit map to show all markers
    const bounds = new mapboxgl.LngLatBounds()
      .extend([restaurantLocation.lng, restaurantLocation.lat])
      .extend([deliveryLocation.lng, deliveryLocation.lat]);
    
    if (courierLocation) {
      bounds.extend([courierLocation.lng, courierLocation.lat]);
    }

    map.current.fitBounds(bounds, { padding: 50 });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, restaurantLocation, deliveryLocation, courierLocation]);

  useEffect(() => {
    if (!courierLocation || !courierMarker.current) return;

    // Update courier marker position
    courierMarker.current.setLngLat([courierLocation.lng, courierLocation.lat]);
  }, [courierLocation]);

  return <div ref={mapContainer} className={className} />;
};