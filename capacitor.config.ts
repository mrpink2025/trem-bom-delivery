import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4151c76ae46a476eb3992c50a1afaf78',
  appName: 'trem-bom-delivery',
  webDir: 'dist',
  server: {
    url: 'https://4151c76a-e46a-476e-b399-2c50a1afaf78.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#D97706',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#D97706',
      overlaysWebView: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#D97706",
      sound: "beep.wav"
    },
    Geolocation: {
      requestPermissions: true,
      accuracy: 'high'
    },
    Camera: {
      permissions: {
        camera: "This app uses the camera to take photos for orders and profile pictures.",
        photos: "This app uses photo library to select images for orders and profile."
      }
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true
  }
};

export default config;