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

interface LocationState {
  lat: number;
  lng: number;
  timestamp: number;
}

export function useRealtimeLocation(enabled: boolean = false) {
  const { user } = useAuth();
  const { latitude, longitude, getCurrentLocation } = useGeolocation(enabled);
  const [isTracking, setIsTracking] = useState(false);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const lastLocationRef = useRef<LocationState | null>(null);
  const pendingUpdatesRef = useRef<LocationPing[]>([]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  const sendLocationPing = async (location: LocationPing, force: boolean = false) => {
    if (!user) return false;

    // Check if location change is significant (≥10 meters) or forced
    if (!force && lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.lat, 
        lastLocationRef.current.lng,
        location.lat, 
        location.lng
      );
      
      // Skip if movement is less than 10 meters and not forced
      if (distance < 10) {
        console.log(`Location change too small: ${distance.toFixed(1)}m, skipping ping`);
        return false;
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('location-ping', {
        body: location
      });

      if (error) {
        console.error('Location ping error:', error);
        // Add to pending updates for retry
        pendingUpdatesRef.current.push(location);
        return false;
      }

      // Update last known location
      lastLocationRef.current = {
        lat: location.lat,
        lng: location.lng,
        timestamp: Date.now()
      };

      setLastPing(new Date());
      console.log(`Location ping sent: ${location.lat}, ${location.lng}`);
      return true;
    } catch (error) {
      console.error('Failed to send location ping:', error);
      // Add to pending updates for retry
      pendingUpdatesRef.current.push(location);
      return false;
    }
  };

  // Retry failed location updates
  const retryPendingUpdates = async () => {
    if (pendingUpdatesRef.current.length === 0) return;

    console.log(`Retrying ${pendingUpdatesRef.current.length} pending location updates`);
    const updates = [...pendingUpdatesRef.current];
    pendingUpdatesRef.current = [];

    for (const update of updates) {
      const success = await sendLocationPing(update, true);
      if (!success) {
        // If still failing, keep only the most recent update
        pendingUpdatesRef.current = [update];
        break;
      }
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

    // Set up high-frequency location updates every 2.5 seconds
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
        
        // Retry any pending updates
        await retryPendingUpdates();
      } catch (error) {
        console.error('Failed to get current location:', error);
      }
    }, 2500); // 2.5 seconds for optimal real-time tracking

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