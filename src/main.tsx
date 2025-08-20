import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logger } from '@/utils/logger'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
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
