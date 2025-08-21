import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SearchFilter {
  id: string;
  name: string;
  filters: {
    cuisineType?: string[];
    priceRange?: [number, number];
    rating?: number;
    deliveryTime?: number;
    dietaryRestrictions?: string[];
    location?: string;
  };
  is_default: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  rating: number;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  image_url?: string;
  is_open: boolean;
  minimum_order: number;
}

export function useAdvancedSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [activeFilter, setActiveFilter] = useState<SearchFilter | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSavedFilters = useCallback(async () => {
    if (!user) return;

    try {
      // For now, we'll use local storage since the table might not be in types yet
      const savedFilters = localStorage.getItem(`search_filters_${user.id}`);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters) as SearchFilter[];
        setFilters(parsed);
        const defaultFilter = parsed.find(f => f.is_default);
        if (defaultFilter) {
          setActiveFilter(defaultFilter);
        }
      }
    } catch (error) {
      console.error('Error fetching saved filters:', error);
    }
  }, [user]);

  const saveFilter = async (name: string, filterData: SearchFilter['filters'], isDefault = false) => {
    if (!user) return;

    try {
      const newFilter: SearchFilter = {
        id: crypto.randomUUID(),
        name,
        filters: filterData,
        is_default: isDefault
      };

      const updatedFilters = [...filters];
      
      // If setting as default, remove default from others first
      if (isDefault) {
        updatedFilters.forEach(f => f.is_default = false);
      }
      
      updatedFilters.push(newFilter);
      setFilters(updatedFilters);
      
      // Save to localStorage
      localStorage.setItem(`search_filters_${user.id}`, JSON.stringify(updatedFilters));
      
      if (isDefault) {
        setActiveFilter(newFilter);
      }

      toast({
        title: "Filtro salvo",
        description: `Filtro "${name}" foi salvo com sucesso`
      });
    } catch (error) {
      console.error('Error saving filter:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o filtro",
        variant: "destructive"
      });
    }
  };

  const searchRestaurants = async (query: string, customFilters?: SearchFilter['filters']) => {
    setLoading(true);
    
    try {
      let supabaseQuery = supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true);

      // Apply text search
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${query}%,description.ilike.%${query}%,cuisine_type.ilike.%${query}%`
        );
      }

      const filtersToApply = customFilters || activeFilter?.filters || {};

      // Apply cuisine type filter
      if (filtersToApply.cuisineType?.length) {
        supabaseQuery = supabaseQuery.in('cuisine_type', filtersToApply.cuisineType);
      }

      // Apply rating filter
      if (filtersToApply.rating) {
        supabaseQuery = supabaseQuery.gte('rating', filtersToApply.rating);
      }

      // Apply delivery time filter
      if (filtersToApply.deliveryTime) {
        supabaseQuery = supabaseQuery.lte('delivery_time_max', filtersToApply.deliveryTime);
      }

      // Apply price range filter (minimum order)
      if (filtersToApply.priceRange) {
        supabaseQuery = supabaseQuery
          .gte('minimum_order', filtersToApply.priceRange[0])
          .lte('minimum_order', filtersToApply.priceRange[1]);
      }

      const { data, error } = await supabaseQuery.order('rating', { ascending: false });

      if (error) throw error;
      
      setResults(data || []);

      // Save search to history
      if (query.trim() && user) {
        const currentHistory = JSON.parse(localStorage.getItem(`search_history_${user.id}`) || '[]');
        const updated = [query.trim(), ...currentHistory.filter((term: string) => term !== query.trim())];
        const newHistory = updated.slice(0, 10); // Keep only last 10 searches
        localStorage.setItem(`search_history_${user.id}`, JSON.stringify(newHistory));
        setSearchHistory(newHistory);
      }
    } catch (error) {
      console.error('Error searching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchHistory = useCallback(async () => {
    if (!user) return;

    try {
      const history = JSON.parse(localStorage.getItem(`search_history_${user.id}`) || '[]');
      setSearchHistory(history);
    } catch (error) {
      console.error('Error fetching search history:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedFilters();
    fetchSearchHistory();
  }, [fetchSavedFilters, fetchSearchHistory]);

  return {
    results,
    filters,
    activeFilter,
    loading,
    searchHistory,
    setActiveFilter,
    saveFilter,
    searchRestaurants
  };
}