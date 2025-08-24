import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  accuracy?: number;
  source: 'gps' | 'ip' | 'manual' | 'approx' | 'cache' | null;
  city?: string;
  state?: string;
  neighborhood?: string;
  address_text?: string;
  error: string | null;
  loading: boolean;
  consent_given?: boolean;
}

const LOCATION_STORAGE_KEY = 'trem_bao_user_location';
const CONSENT_STORAGE_KEY = 'trem_bao_location_consent';

export const useUserLocation = () => {
  const [location, setLocation] = useState<UserLocation>({
    lat: null,
    lng: null,
    source: null,
    error: null,
    loading: false,
  });

  // Log wrapper para setLocation
  const setLocationWithLog = useCallback((newLocation: UserLocation | ((prev: UserLocation) => UserLocation)) => {
    console.log('📝 setLocation called with:', newLocation);
    setLocation((prev) => {
      const result = typeof newLocation === 'function' ? newLocation(prev) : newLocation;
      console.log('📝 setLocation - previous:', prev);
      console.log('📝 setLocation - new:', result);
      return result;
    });
  }, []);

  // Substituir setLocation por setLocationWithLog no resto do código
  const actualSetLocation = setLocationWithLog;

  

  // Função para fazer reverse geocoding
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<UserLocation>> => {
    try {
      const { data, error } = await supabase.functions.invoke('ip-geolocate', {
        body: { lat, lng, reverse: true }
      });

      if (error) {
        console.warn('Reverse geocoding failed:', error);
        return {};
      }

      return {
        city: data.city,
        state: data.state,
        neighborhood: data.neighborhood,
        address_text: data.address_text,
      };
    } catch (error) {
      console.warn('Reverse geocoding error:', error);
      return {};
    }
  }, []);

  const loadSavedLocation = useCallback(async () => {
    try {
      const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
      
      if (savedLocation && savedConsent === 'true') {
        const parsed = JSON.parse(savedLocation);
        
        // Definir localização inicial do cache
        actualSetLocation(prev => ({
          ...prev,
          ...parsed,
          source: 'cache' as const,
          consent_given: true,
          loading: false,
        }));

        // Se temos coordenadas mas não temos cidade/estado, tenta resolver o endereço
        if (parsed.lat && parsed.lng && (!parsed.city || !parsed.state)) {
          console.log('🔄 Resolvendo endereço para coordenadas do cache...');
          const addressData = await reverseGeocode(parsed.lat, parsed.lng);
          
          if (addressData.city || addressData.state) {
            const updatedLocation = {
              ...parsed,
              ...addressData,
              source: 'cache' as const,
              consent_given: true,
              loading: false,
            };
            
            actualSetLocation(updatedLocation);
            
            // Salvar a localização atualizada no cache
            localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(updatedLocation));
            
            console.log('✅ Endereço resolvido:', addressData);
          }
        }
      } else {
        actualSetLocation(prev => ({
          ...prev,
          lat: null,
          lng: null,
          source: null,
          error: null,
          loading: false,
          consent_given: false
        }));
      }
    } catch (error) {
      console.error('Failed to load saved location:', error);
    }
  }, [reverseGeocode, actualSetLocation]);

  // Carregar localização salva na inicialização
  useEffect(() => {
    loadSavedLocation();
  }, [loadSavedLocation]);

  const saveLocation = useCallback((locationData: Partial<UserLocation>, withConsent: boolean) => {
    if (withConsent) {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    }
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    actualSetLocation({
      lat: null,
      lng: null,
      source: null,
      error: null,
      loading: false,
      consent_given: false,
    });
  }, [actualSetLocation]);

  const tryGPSLocation = useCallback(async (highAccuracy = true): Promise<UserLocation> => {
    if (Capacitor.isNativePlatform()) {
      // Usar Capacitor Geolocation para mobile
      const permissions = await Geolocation.checkPermissions();
      
      if (permissions.location !== 'granted') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== 'granted') {
          throw new Error('Permissão de localização negada');
        }
      }

      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: highAccuracy,
        timeout: 8000
      });

      return {
        lat: coordinates.coords.latitude,
        lng: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
        source: 'gps',
        error: null,
        loading: false,
      };
    } else {
      // Usar Web Geolocation API
      if (!navigator.geolocation) {
        throw new Error('Geolocalização não é suportada pelo seu navegador');
      }

      return new Promise((resolve, reject) => {
        const options: PositionOptions = {
          enableHighAccuracy: highAccuracy,
          timeout: 8000,
          maximumAge: 60000,
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              source: 'gps',
              error: null,
              loading: false,
            });
          },
          (error) => {
            let errorMessage = 'Erro desconhecido ao obter localização';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Permissão de localização negada pelo usuário';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Informações de localização não disponíveis';
                break;
              case error.TIMEOUT:
                errorMessage = 'Tempo limite para obter localização esgotado';
                break;
            }

            reject(new Error(errorMessage));
          },
          options
        );
      });
    }
  }, []);

  const tryIPLocation = useCallback(async (): Promise<UserLocation> => {
    const { data, error } = await supabase.functions.invoke('ip-geolocate', {
      body: {}
    });

    if (error) {
      throw new Error(`IP geolocation failed: ${error.message}`);
    }

    return {
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy_km * 1000, // converter para metros
      source: 'ip',
      city: data.city,
      state: data.state,
      error: null,
      loading: false,
    };
  }, []);

  const getLocation = useCallback(async (): Promise<UserLocation> => {
    console.log('🔥 getLocation STARTED - current state:', location);
    actualSetLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Try GPS with high accuracy first
      try {
        console.log('🎯 Trying GPS high accuracy...');
        const gpsResult = await tryGPSLocation(true);
        console.log('✅ GPS high accuracy result:', gpsResult);
        
        // Fazer reverse geocoding para GPS também
        let addressData = {};
        if (gpsResult.lat && gpsResult.lng) {
          console.log('🔄 Getting address for GPS coordinates...');
          addressData = await reverseGeocode(gpsResult.lat, gpsResult.lng);
          console.log('📍 Address data for GPS:', addressData);
        }
        
        const locationData = {
          ...gpsResult,
          ...addressData,
          source: 'gps' as const,
          timestamp: new Date().toISOString()
        };
        console.log('🏆 Final GPS location data:', locationData);
        actualSetLocation(locationData);
        return locationData;
      } catch (gpsError) {
        console.log('❌ GPS high accuracy failed:', gpsError);
        // Try GPS with low accuracy
        try {
          console.log('🎯 Trying GPS low accuracy...');
          const gpsLowResult = await tryGPSLocation(false);
          console.log('✅ GPS low accuracy result:', gpsLowResult);
          
          // Fazer reverse geocoding para GPS também
          let addressData = {};
          if (gpsLowResult.lat && gpsLowResult.lng) {
            console.log('🔄 Getting address for GPS low accuracy coordinates...');
            addressData = await reverseGeocode(gpsLowResult.lat, gpsLowResult.lng);
            console.log('📍 Address data for GPS low accuracy:', addressData);
          }
          
          const locationData = {
            ...gpsLowResult,
            ...addressData,
            source: 'gps' as const,
            timestamp: new Date().toISOString()
          };
          console.log('🏆 Final GPS low accuracy location data:', locationData);
          actualSetLocation(locationData);
          return locationData;
        } catch (gpsLowError) {
          console.log('❌ GPS low accuracy failed:', gpsLowError);
          // Fallback to IP geolocation
          console.log('🌐 Falling back to IP geolocation...');
          const ipResult = await tryIPLocation();
          console.log('✅ IP geolocation result:', ipResult);
          const locationData = {
            ...ipResult,
            source: 'ip' as const,
            timestamp: new Date().toISOString()
          };
          console.log('🏆 Final IP location data:', locationData);
          actualSetLocation(locationData);
          return locationData;
        }
      }
    } catch (error: any) {
      console.error('💥 getLocation FAILED completely:', error);
      const errorData = {
        lat: null,
        lng: null,
        source: null,
        error: error.message || 'Erro ao obter localização',
        loading: false,
        timestamp: new Date().toISOString()
      } as UserLocation;
      console.log('💀 Setting error location data:', errorData);
      actualSetLocation(errorData);
      throw error;
    }
  }, [tryGPSLocation, tryIPLocation, reverseGeocode, location, actualSetLocation]);

  const setManualLocation = useCallback((locationData: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    neighborhood?: string;
    address_text?: string;
  }) => {
    const manualLocation: UserLocation = {
      ...locationData,
      source: 'manual',
      error: null,
      loading: false,
    };
    
    actualSetLocation(manualLocation);
    return manualLocation;
  }, [actualSetLocation]);

  const persistLocation = useCallback(async (withConsent: boolean) => {
    if (location.lat && location.lng) {
      // Salvar no localStorage se consentimento for dado
      if (withConsent) {
        saveLocation(location, true);
      }

      // Salvar no banco de dados se usuário estiver logado
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && withConsent) {
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              latitude: location.lat,
              longitude: location.lng,
              accuracy_km: location.accuracy ? location.accuracy / 1000 : null,
              source: location.source || 'unknown',
              city: location.city,
              state: location.state,
              neighborhood: location.neighborhood,
              address_text: location.address_text,
              consent_given: withConsent,
            }, {
              onConflict: 'user_id'
            });
        }
      } catch (error) {
        console.warn('Failed to persist location to database:', error);
      }

      actualSetLocation(prev => ({ ...prev, consent_given: withConsent }));
    }
  }, [location, saveLocation]);

  return {
    location,
    getLocation,
    setManualLocation,
    persistLocation,
    clearLocation,
    loadSavedLocation,
  };
};