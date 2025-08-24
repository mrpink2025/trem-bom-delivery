import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logger } from '@/utils/logger'
import { initializeCapacitor } from './capacitor.ts'

// Initialize Capacitor for native platforms
initializeCapacitor();

// Register service worker for PWA (only if not in native platform)
import { Capacitor } from '@capacitor/core';

if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator && !window.matchMedia('(display-mode: standalone)').matches) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logger.info('SW registered', registration);
      })
      .catch((registrationError) => {
        logger.error('SW registration failed', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
