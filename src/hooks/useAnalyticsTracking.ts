import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsEvent {
  event_type: string;
  properties: Record<string, any>;
  user_id?: string;
  session_id?: string;
  page_url?: string;
  user_agent?: string;
  ip_address?: string;
}

export function useAnalyticsTracking() {
  const { user } = useAuth();

  const trackEvent = useCallback(async (eventType: string, properties: Record<string, any> = {}) => {
    try {
      const event = {
        event_type: eventType,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          referrer: document.referrer,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          user_agent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        },
        user_id: user?.id,
        session_id: sessionStorage.getItem('analytics_session_id') || generateSessionId(),
        page_url: window.location.href,
        user_agent: navigator.userAgent
      };

      // Ensure session ID is stored
      if (!sessionStorage.getItem('analytics_session_id')) {
        sessionStorage.setItem('analytics_session_id', event.session_id!);
      }

      // For now, store analytics events in localStorage until table types are updated
      const existingEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      existingEvents.push(event);
      
      // Keep only last 1000 events
      if (existingEvents.length > 1000) {
        existingEvents.splice(0, existingEvents.length - 1000);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(existingEvents));

      console.log('Analytics event tracked:', eventType, properties);
    } catch (error) {
      console.error('Error in trackEvent:', error);
    }
  }, [user]);

  // Common tracking functions
  const trackPageView = useCallback((pageName: string, additionalProperties: Record<string, any> = {}) => {
    trackEvent('page_view', {
      page_name: pageName,
      ...additionalProperties
    });
  }, [trackEvent]);

  const trackOrderPlaced = useCallback((orderId: string, restaurantId: string, totalAmount: number, items: any[]) => {
    trackEvent('order_placed', {
      order_id: orderId,
      restaurant_id: restaurantId,
      total_amount: totalAmount,
      item_count: items.length,
      items: items
    });
  }, [trackEvent]);

  const trackSearchPerformed = useCallback((searchTerm: string, resultsCount: number, filtersUsed: Record<string, any> = {}) => {
    trackEvent('search_performed', {
      search_term: searchTerm,
      results_count: resultsCount,
      filters_used: filtersUsed
    });
  }, [trackEvent]);

  const trackItemAddedToCart = useCallback((menuItemId: string, restaurantId: string, quantity: number, price: number) => {
    trackEvent('item_added_to_cart', {
      menu_item_id: menuItemId,
      restaurant_id: restaurantId,
      quantity: quantity,
      price: price
    });
  }, [trackEvent]);

  const trackUserRegistration = useCallback((registrationMethod: string = 'email') => {
    trackEvent('user_registration', {
      registration_method: registrationMethod
    });
  }, [trackEvent]);

  const trackUserLogin = useCallback((loginMethod: string = 'email') => {
    trackEvent('user_login', {
      login_method: loginMethod
    });
  }, [trackEvent]);

  const trackFeatureUsed = useCallback((featureName: string, context: Record<string, any> = {}) => {
    trackEvent('feature_used', {
      feature_name: featureName,
      ...context
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackOrderPlaced,
    trackSearchPerformed,
    trackItemAddedToCart,
    trackUserRegistration,
    trackUserLogin,
    trackFeatureUsed
  };
}

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}