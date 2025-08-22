import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NearbyRestaurant {
  id: string;
  name: string;
  description?: string;
  cuisine_type?: string;
  image_url?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  is_active: boolean;
  score?: number;
  opening_hours?: any;
  distance_km: number;
  latitude: number;
  longitude: number;
  in_same_city?: boolean;
  search_expanded?: boolean; // Indica se foi busca expandida
}

export interface NearbyRestaurantsParams {
  lat: number | null;
  lng: number | null;
  radiusKm?: number;
  onlyOpen?: boolean;
  filters?: {
    city?: string;
    category?: string;
  };
  clientCity?: string; // Nova propriedade para a cidade do cliente
}

interface NearbyRestaurantsResponse {
  items: NearbyRestaurant[];
  meta: {
    lat: number;
    lng: number;
    radius_km: number;
    client_city?: string;
    source: string;
    ts: string;
    total_found: number;
    using_city_priority?: boolean;
    search_expanded_count?: number;
  };
}

const CACHE_KEY_PREFIX = 'trem_bao_nearby_restaurants';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useNearbyRestaurants = ({
  lat,
  lng,
  radiusKm = 5,
  onlyOpen = true,
  filters = {},
  clientCity = null
}: NearbyRestaurantsParams) => {
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [searchMeta, setSearchMeta] = useState<any>(null); // Meta informações da busca

  // Monitorar status offline/online
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getCacheKey = useCallback((lat: number, lng: number, radiusKm: number) => {
    return `${CACHE_KEY_PREFIX}_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}`;
  }, []);

  const loadFromCache = useCallback((cacheKey: string) => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();
        
        if (cacheAge < CACHE_DURATION) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Failed to load from cache:', error);
    }
    return null;
  }, []);

  const saveToCache = useCallback((cacheKey: string, data: NearbyRestaurantsResponse) => {
    try {
      const cacheData = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    if (!lat || !lng) {
      setRestaurants([]);
      return;
    }

    const cacheKey = getCacheKey(lat, lng, radiusKm);
    
    // Se offline, tentar carregar do cache
    if (isOffline) {
      const cached = loadFromCache(cacheKey);
      if (cached) {
        setRestaurants(cached.items);
        setError(null);
        return;
      } else {
        setError('Você está offline e não há dados em cache para esta localização');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('search-restaurants', {
        body: {
          lat,
          lng,
          radius_km: radiusKm,
          limit: 50,
          only_open: onlyOpen,
          filters,
          client_city: clientCity
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao buscar restaurantes');
      }

      const response: NearbyRestaurantsResponse = data;
      
      setRestaurants(response.items);
      setLastFetched(new Date());
      setSearchMeta(response.meta); // Salvar meta informações
      
      // Salvar no cache
      saveToCache(cacheKey, response);
      
    } catch (error: any) {
      console.error('Error fetching nearby restaurants:', error);
      
      // Em caso de erro, tentar carregar do cache
      const cached = loadFromCache(cacheKey);
      if (cached) {
        setRestaurants(cached.items);
        setError('Dados podem estar desatualizados (offline)');
      } else {
        setRestaurants([]);
        setError(error.message || 'Erro ao carregar restaurantes próximos');
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radiusKm, onlyOpen, filters, clientCity, isOffline, getCacheKey, loadFromCache, saveToCache]);

  // Executar busca quando parâmetros mudarem
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const refetch = useCallback(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const clearCache = useCallback(() => {
    try {
      // Limpar todos os caches de restaurantes
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, []);

  return {
    restaurants,
    loading,
    error,
    isOffline,
    lastFetched,
    refetch,
    clearCache,
    searchMeta, // Incluir meta informações no retorno
  };
};