import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DeliveryLocation {
  id: string;
  order_id: string;
  courier_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  status: 'created' | 'accepted' | 'picked_up' | 'in_transit' | 'arrived' | 'delivered' | 'cancelled';
  eta_minutes?: number;
  distance_to_destination?: number;
  created_at?: string;
  timestamp?: string; // For backward compatibility
}

interface UseDeliveryTrackingProps {
  orderId: string;
}

export function useDeliveryTracking({ orderId }: UseDeliveryTrackingProps) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<DeliveryLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial tracking data
  const loadTrackingData = useCallback(async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error loading tracking data:', fetchError);
        setError('Erro ao carregar dados de rastreamento');
        return;
      }

      if (data && data.length > 0) {
        const processedData = data.map((item: any) => ({
          ...item,
          created_at: item.created_at || item.timestamp || new Date().toISOString()
        })) as DeliveryLocation[];
        setLocations(processedData);
        setCurrentLocation(processedData[processedData.length - 1]);
      }
    } catch (err) {
      console.error('Error in loadTrackingData:', err);
      setError('Erro ao carregar dados de rastreamento');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!orderId) return;

    channelRef.current = supabase
      .channel(`delivery_tracking_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_tracking',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const newLocation = payload.new as DeliveryLocation;
          setLocations(prev => [...prev, newLocation]);
          setCurrentLocation(newLocation);
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [orderId]);

  // Load initial data
  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  // Get current position
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    });
  }, []);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Calculate ETA using Mapbox API
  const calculateETA = useCallback(async (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<{ distance: number; duration: number }> => {
    try {
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
      if (tokenError) throw tokenError;
      
      if (!tokenData?.token) {
        throw new Error('Mapbox token not available');
      }

      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${tokenData.token}&geometries=geojson`;
      
      const directionsResponse = await fetch(directionsUrl);
      const directionsData = await directionsResponse.json();

      if (directionsData.routes && directionsData.routes.length > 0) {
        const route = directionsData.routes[0];
        return {
          distance: route.distance / 1000, // Convert to km
          duration: Math.ceil(route.duration / 60) // Convert to minutes
        };
      }
      
      throw new Error('No route found');
    } catch (error) {
      console.error('Error calculating ETA:', error);
      // Fallback to simple calculation
      const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
      return {
        distance,
        duration: Math.ceil(distance / 25 * 60) + 5 // 25 km/h + 5 min buffer
      };
    }
  }, [calculateDistance]);

  // Send location update
  const sendLocationUpdate = useCallback(async (
    position: GeolocationPosition,
    status: DeliveryLocation['status'] = 'in_transit',
    destinationLat?: number,
    destinationLng?: number
  ) => {
    if (!user || !orderId) return;

    try {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;
      
      let etaMinutes: number | undefined;
      let distanceToDestination: number | undefined;

      // Calculate ETA and distance if destination is provided
      if (destinationLat && destinationLng) {
        const routeInfo = await calculateETA(latitude, longitude, destinationLat, destinationLng);
        etaMinutes = routeInfo.duration;
        distanceToDestination = routeInfo.distance;

        // Check if arrived (within 50m)
        const directDistance = calculateDistance(latitude, longitude, destinationLat, destinationLng);
        if (directDistance < 0.05 && status === 'in_transit') { // 50m = 0.05km
          status = 'arrived';
        }
      }

      const locationData = {
        order_id: orderId,
        courier_id: user.id,
        latitude,
        longitude,
        accuracy: accuracy || undefined,
        speed: speed || undefined,
        heading: heading || undefined,
        status,
        eta_minutes: etaMinutes,
        distance_to_destination: distanceToDestination
      };

      const { error } = await supabase
        .from('delivery_tracking')
        .insert([locationData]);

      if (error) {
        console.error('Error sending location update:', error);
        throw error;
      }

      console.log('Location update sent:', locationData);
    } catch (error) {
      console.error('Failed to send location update:', error);
      setError('Erro ao enviar atualização de localização');
    }
  }, [user, orderId, calculateETA, calculateDistance]);

  // Start tracking
  const startTracking = useCallback(async (
    destinationLat?: number,
    destinationLng?: number
  ) => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo');
      return;
    }

    try {
      setIsTracking(true);
      setError(null);

      // Get initial position
      const position = await getCurrentPosition();
      await sendLocationUpdate(position, 'in_transit', destinationLat, destinationLng);

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          await sendLocationUpdate(pos, 'in_transit', destinationLat, destinationLng);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('Erro ao obter localização');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );

      // Set up interval for regular updates (every 5 seconds)
      trackingIntervalRef.current = setInterval(async () => {
        try {
          const position = await getCurrentPosition();
          await sendLocationUpdate(position, 'in_transit', destinationLat, destinationLng);
        } catch (err) {
          console.error('Error in tracking interval:', err);
        }
      }, 5000);

    } catch (error) {
      console.error('Error starting tracking:', error);
      setError('Erro ao iniciar rastreamento');
      setIsTracking(false);
    }
  }, [getCurrentPosition, sendLocationUpdate]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
  }, []);

  // Update delivery status
  const updateDeliveryStatus = useCallback(async (
    status: DeliveryLocation['status'],
    destinationLat?: number,
    destinationLng?: number
  ) => {
    try {
      const position = await getCurrentPosition();
      await sendLocationUpdate(position, status, destinationLat, destinationLng);

      // Stop tracking if delivered or cancelled
      if (status === 'delivered' || status === 'cancelled') {
        stopTracking();
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      setError('Erro ao atualizar status da entrega');
    }
  }, [getCurrentPosition, sendLocationUpdate, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      channelRef.current?.unsubscribe();
    };
  }, [stopTracking]);

  return {
    locations,
    currentLocation,
    isTracking,
    isLoading,
    error,
    startTracking,
    stopTracking,
    updateDeliveryStatus,
    reload: loadTrackingData
  };
}