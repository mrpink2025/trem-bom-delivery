import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trembaodelivery.app',
  appName: 'Trem Bão Delivery',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#D97706',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body'
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff'
  }
};

export default config;