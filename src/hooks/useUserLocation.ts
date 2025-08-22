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

  console.log('🧭 useUserLocation hook state:', location);

  const loadSavedLocation = useCallback(() => {
    console.log('📂 Loading saved location from localStorage...');
    console.log('📂 Storage keys:', { LOCATION_STORAGE_KEY, CONSENT_STORAGE_KEY });
    
    try {
      // Verificar todos os itens do localStorage relacionados à localização
      const allKeys = Object.keys(localStorage);
      const locationKeys = allKeys.filter(key => key.includes('location') || key.includes('trem_bao'));
      console.log('📂 All localStorage keys containing location/trem_bao:', locationKeys);
      
      const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
      
      console.log('📂 Raw localStorage data:', { 
        savedLocation, 
        savedConsent,
        locationKey: LOCATION_STORAGE_KEY,
        consentKey: CONSENT_STORAGE_KEY,
        hasLocationData: !!savedLocation,
        hasConsent: savedConsent === 'true'
      });
      
      if (savedLocation && savedConsent === 'true') {
        const parsed = JSON.parse(savedLocation);
        console.log('📂 Parsed location:', parsed);
        console.log('📂 Setting location state with:', {
          ...parsed,
          source: 'cache',
          consent_given: true,
          loading: false,
        });
        setLocation(prev => {
          console.log('📂 Previous location state:', prev);
          const newState = {
            ...prev,
            ...parsed,
            source: 'cache',
            consent_given: true,
            loading: false,
          };
          console.log('📂 New location state:', newState);
          return newState;
        });
        console.log('📂 Location state should be updated now');
      } else {
        console.log('📂 No saved location found or consent not given');
        console.log('📂 Will set location to empty state');
        setLocation(prev => {
          console.log('📂 Clearing location - previous state:', prev);
          const newState = {
            lat: null,
            lng: null,
            source: null,
            error: null,
            loading: false,
            consent_given: false
          };
          console.log('📂 Clearing location - new state:', newState);
          return newState;
        });
      }
    } catch (error) {
      console.error('📂 Failed to load saved location:', error);
    }
  }, []);

  // Carregar localização salva na inicialização
  useEffect(() => {
    loadSavedLocation();
  }, [loadSavedLocation]);

  const saveLocation = useCallback((locationData: Partial<UserLocation>, withConsent: boolean) => {
    console.log('💾 Saving location:', { locationData, withConsent });
    if (withConsent) {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      console.log('💾 Location saved to localStorage');
    }
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    setLocation({
      lat: null,
      lng: null,
      source: null,
      error: null,
      loading: false,
      consent_given: false,
    });
  }, []);

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
    console.log('🎯 Getting location...');
    setLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Try GPS with high accuracy first
      try {
        const gpsResult = await tryGPSLocation(true);
        console.log('✅ GPS high accuracy successful:', gpsResult);
        const locationData = {
          ...gpsResult,
          source: 'gps' as const,
          timestamp: new Date().toISOString()
        };
        console.log('📍 Setting location state (high accuracy):', locationData);
        setLocation(locationData);
        console.log('📍 Location state updated successfully');
        return locationData;
      } catch (gpsError) {
        console.warn('❌ High accuracy GPS failed:', gpsError);
        
        // Try GPS with low accuracy
        try {
          const gpsLowResult = await tryGPSLocation(false);
          console.log('✅ GPS low accuracy successful:', gpsLowResult);
          const locationData = {
            ...gpsLowResult,
            source: 'gps' as const,
            timestamp: new Date().toISOString()
          };
          console.log('📍 Setting location state (low accuracy):', locationData);
          setLocation(locationData);
          console.log('📍 Location state updated successfully (low accuracy)');
          return locationData;
        } catch (gpsLowError) {
          console.warn('❌ Low accuracy GPS failed:', gpsLowError);
          
          // Fallback to IP geolocation
          console.log('📍 Falling back to IP geolocation...');
          const ipResult = await tryIPLocation();
          console.log('✅ IP geolocation successful:', ipResult);
          const locationData = {
            ...ipResult,
            source: 'ip' as const,
            timestamp: new Date().toISOString()
          };
          console.log('📍 Setting location state (IP):', locationData);
          setLocation(locationData);
          console.log('📍 Location state updated successfully (IP)');
          return locationData;
        }
      }
    } catch (error: any) {
      console.error('❌ All location methods failed:', error);
      const errorData = {
        lat: null,
        lng: null,
        source: null,
        error: error.message || 'Erro ao obter localização',
        loading: false,
        timestamp: new Date().toISOString()
      } as UserLocation;
      setLocation(errorData);
      throw error;
    }
  }, [tryGPSLocation, tryIPLocation]);

  const setManualLocation = useCallback((locationData: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    neighborhood?: string;
    address_text?: string;
  }) => {
    console.log('🏷️ Setting manual location:', locationData);
    const manualLocation: UserLocation = {
      ...locationData,
      source: 'manual',
      error: null,
      loading: false,
    };
    
    console.log('🏷️ Manual location object:', manualLocation);
    setLocation(manualLocation);
    console.log('🏷️ Manual location state updated');
    return manualLocation;
  }, []);

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

      setLocation(prev => ({ ...prev, consent_given: withConsent }));
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