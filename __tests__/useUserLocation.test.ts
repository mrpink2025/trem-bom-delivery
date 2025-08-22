import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserLocation } from '../src/hooks/useUserLocation';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(),
    })),
  },
}));

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
});

describe('useUserLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('loadSavedLocation', () => {
    it('should load cached location when consent given', () => {
      const savedLocation = JSON.stringify({
        lat: -16.6869,
        lng: -49.2648,
        city: 'Goiânia',
        state: 'GO',
      });
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'trem_bao_user_location') return savedLocation;
        if (key === 'trem_bao_location_consent') return 'true';
        return null;
      });

      const { result } = renderHook(() => useUserLocation());

      expect(result.current.location.lat).toBe(-16.6869);
      expect(result.current.location.lng).toBe(-49.2648);
      expect(result.current.location.source).toBe('cache');
      expect(result.current.location.consent_given).toBe(true);
    });

    it('should not load location without consent', () => {
      const savedLocation = JSON.stringify({
        lat: -16.6869,
        lng: -49.2648,
      });
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'trem_bao_user_location') return savedLocation;
        if (key === 'trem_bao_location_consent') return 'false';
        return null;
      });

      const { result } = renderHook(() => useUserLocation());

      expect(result.current.location.lat).toBeNull();
      expect(result.current.location.lng).toBeNull();
      expect(result.current.location.consent_given).toBe(false);
    });
  });

  describe('getLocation', () => {
    it('should get GPS location successfully', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: -16.6869,
            longitude: -49.2648,
            accuracy: 10,
          },
        });
      });

      const { result } = renderHook(() => useUserLocation());

      let locationResult;
      await act(async () => {
        locationResult = await result.current.getLocation();
      });

      expect(locationResult.lat).toBe(-16.6869);
      expect(locationResult.lng).toBe(-49.2648);
      expect(locationResult.source).toBe('gps');
      expect(locationResult.loading).toBe(false);
    });

    it('should fallback to IP location when GPS fails', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({ code: 1, message: 'Permission denied' });
      });

      const mockInvoke = vi.fn().mockResolvedValue({
        data: {
          lat: -16.68,
          lng: -49.26,
          accuracy_km: 5,
          city: 'Goiânia',
          state: 'GO',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.functions.invoke = mockInvoke;

      const { result } = renderHook(() => useUserLocation());

      let locationResult;
      await act(async () => {
        locationResult = await result.current.getLocation();
      });

      expect(locationResult.lat).toBe(-16.68);
      expect(locationResult.lng).toBe(-49.26);
      expect(locationResult.source).toBe('ip');
      expect(locationResult.city).toBe('Goiânia');
    });
  });

  describe('setManualLocation', () => {
    it('should set manual location correctly', () => {
      const { result } = renderHook(() => useUserLocation());

      act(() => {
        result.current.setManualLocation({
          lat: -16.6869,
          lng: -49.2648,
          city: 'Goiânia',
          state: 'GO',
        });
      });

      expect(result.current.location.lat).toBe(-16.6869);
      expect(result.current.location.lng).toBe(-49.2648);
      expect(result.current.location.source).toBe('manual');
      expect(result.current.location.city).toBe('Goiânia');
      expect(result.current.location.loading).toBe(false);
    });
  });

  describe('clearLocation', () => {
    it('should clear location and localStorage', () => {
      const { result } = renderHook(() => useUserLocation());

      act(() => {
        result.current.clearLocation();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('trem_bao_user_location');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('trem_bao_location_consent');
      expect(result.current.location.lat).toBeNull();
      expect(result.current.location.lng).toBeNull();
      expect(result.current.location.consent_given).toBe(false);
    });
  });
});