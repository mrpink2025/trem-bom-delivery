import React, { useEffect } from 'react';
import { useAnalyticsTracking } from '@/hooks/useAnalyticsTracking';
import { useLocation } from 'react-router-dom';

export const AnalyticsTracker: React.FC = () => {
  const { trackPageView } = useAnalyticsTracking();
  const location = useLocation();

  useEffect(() => {
    // Track page views on route changes
    const pageName = location.pathname === '/' ? 'Home' : location.pathname.substring(1);
    trackPageView(pageName, {
      path: location.pathname,
      search: location.search,
      hash: location.hash
    });
  }, [location, trackPageView]);

  // This component doesn't render anything visible
  return null;
};