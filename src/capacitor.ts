import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export const initializeCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    // Configure status bar
    try {
      await StatusBar.setStyle({ style: Style.Default });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch (error) {
      console.warn('StatusBar configuration failed:', error);
    }

    // Configure keyboard
    try {
      Keyboard.setAccessoryBarVisible({ isVisible: true });
    } catch (error) {
      console.warn('Keyboard configuration failed:', error);
    }

    // Hide splash screen
    try {
      await SplashScreen.hide();
    } catch (error) {
      console.warn('SplashScreen hide failed:', error);
    }
  }
};

export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return Capacitor.getPlatform();
};