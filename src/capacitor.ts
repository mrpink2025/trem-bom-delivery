import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';

export const initializeCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    console.log('Initializing Capacitor for native platform...');
    
    try {
      // Configure status bar with proper Android handling
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#D97706' });
      await StatusBar.setOverlaysWebView({ overlay: false });
      
      // Hide splash screen after app loads
      await SplashScreen.hide();
      
      // Configure keyboard behavior for Android
      Keyboard.addListener('keyboardWillShow', info => {
        console.log('keyboard will show with height:', info.keyboardHeight);
        document.body.style.paddingBottom = `${info.keyboardHeight}px`;
      });
      
      Keyboard.addListener('keyboardWillHide', () => {
        console.log('keyboard will hide');
        document.body.style.paddingBottom = '0px';
      });

      // Configure push notifications listeners
      PushNotifications.addListener('registration', token => {
        console.log('Push registration success, token: ' + token.value);
      });

      PushNotifications.addListener('registrationError', err => {
        console.error('Registration error: ', err.error);
      });

      PushNotifications.addListener('pushNotificationReceived', notification => {
        console.log('Push notification received: ', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        console.log('Push notification action performed', notification.actionId, notification.inputValue);
      });

      // Handle app state changes
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      // Handle back button on Android
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
      
      console.log('Capacitor initialized successfully');
    } catch (error) {
      console.error('Error initializing Capacitor:', error);
    }
  } else {
    console.log('Running in web mode');
  }
};

export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return Capacitor.getPlatform();
};