import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (watch = false) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const getCurrentLocation = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor's native geolocation for mobile apps
        const permissions = await Geolocation.checkPermissions();
        
        if (permissions.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          if (requestResult.location !== 'granted') {
            setState(prev => ({
              ...prev,
              error: 'Permissão de localização negada',
              loading: false,
            }));
            return;
          }
        }

        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        setState({
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          error: null,
          loading: false,
        });
      } else {
        // Use web geolocation API for browsers
        if (!navigator.geolocation) {
          setState(prev => ({
            ...prev,
            error: 'Geolocalização não é suportada pelo seu navegador',
            loading: false,
          }));
          return;
        }

        const handleSuccess = (position: GeolocationPosition) => {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
          });
        };

        const handleError = (error: GeolocationPositionError) => {
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

          setState(prev => ({
            ...prev,
            error: errorMessage,
            loading: false,
          }));
        };

        const options: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        };

        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleError,
          options
        );
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Erro ao obter localização',
        loading: false,
      }));
    }
  };

  useEffect(() => {
    if (watch) {
      getCurrentLocation();
    }
  }, [watch]);

  return {
    ...state,
    getCurrentLocation,
  };
};