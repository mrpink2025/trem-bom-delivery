import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trembaodelivery.app',
  appName: 'Trem Bão Delivery',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#D97706',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#D97706'
    }
  }
};

export default config;