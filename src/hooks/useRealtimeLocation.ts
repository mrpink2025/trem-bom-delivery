import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from './useGeolocation';

interface LocationPing {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery_pct?: number;
}

export function useRealtimeLocation(enabled: boolean = false) {
  const { user } = useAuth();
  const { latitude, longitude, getCurrentLocation } = useGeolocation(enabled);
  const [isTracking, setIsTracking] = useState(false);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const sendLocationPing = async (location: LocationPing) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('location-ping', {
        body: location
      });

      if (error) {
        console.error('Location ping error:', error);
        return false;
      }

      setLastPing(new Date());
      return true;
    } catch (error) {
      console.error('Failed to send location ping:', error);
      return false;
    }
  };

  const getBatteryLevel = async (): Promise<number | undefined> => {
    try {
      // @ts-ignore - Battery API is experimental
      if ('getBattery' in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch (error) {
      console.log('Battery API not available');
    }
    return undefined;
  };

  const startTracking = async () => {
    if (!user || !enabled || isTracking) return;

    console.log('Starting real-time location tracking...');
    setIsTracking(true);

    // Send initial location
    if (latitude && longitude) {
      const battery_pct = await getBatteryLevel();
      await sendLocationPing({
        lat: latitude,
        lng: longitude,
        battery_pct
      });
    }

    // Set up periodic location updates every 10 seconds
    intervalRef.current = setInterval(async () => {
      try {
        await getCurrentLocation();
        if (latitude && longitude) {
          const battery_pct = await getBatteryLevel();
          await sendLocationPing({
            lat: latitude,
            lng: longitude,
            battery_pct
          });
        }
      } catch (error) {
        console.error('Failed to get current location:', error);
      }
    }, 10000); // 10 segundos

    // Listen for real-time location updates from other couriers
    channelRef.current = supabase
      .channel('courier-locations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'courier_locations'
      }, (payload) => {
        console.log('New courier location:', payload.new);
      })
      .subscribe();
  };

  const stopTracking = () => {
    console.log('Stopping real-time location tracking...');
    setIsTracking(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // Auto-start tracking when enabled and user location is available
  useEffect(() => {
    if (enabled && user && latitude && longitude && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }
  }, [enabled, user, latitude, longitude, isTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    isTracking,
    lastPing,
    currentLocation: latitude && longitude ? { lat: latitude, lng: longitude } : null,
    startTracking,
    stopTracking,
    sendLocationPing
  };
}