import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Camera } from '@capacitor/camera';
import { Device } from '@capacitor/device';
import { useToast } from './use-toast';

interface PermissionState {
  location: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown';
  camera: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'limited' | 'unknown';
  storage: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown';
}

export function useNativePermissions() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PermissionState>({
    location: 'unknown',
    notifications: 'unknown',
    camera: 'unknown',
    storage: 'unknown'
  });
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    const initializeNative = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNativeApp(true);
        
        // Get device info
        try {
          const info = await Device.getInfo();
          setDeviceInfo(info);
          console.log('Device info:', info);
        } catch (error) {
          console.error('Failed to get device info:', error);
        }

        // Check initial permissions
        await checkAllPermissions();
      }
    };

    initializeNative();
  }, []);

  const checkAllPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Check location permission
      const locationStatus = await Geolocation.checkPermissions();
      
      // Check notification permission
      const notificationStatus = await PushNotifications.checkPermissions();
      
      // Check camera permission  
      const cameraStatus = await Camera.checkPermissions();

      setPermissions({
        location: locationStatus.location,
        notifications: notificationStatus.receive,
        camera: cameraStatus.camera,
        storage: 'granted' // Android handles this automatically for most cases
      });

      console.log('Permission status:', {
        location: locationStatus.location,
        notifications: notificationStatus.receive,
        camera: cameraStatus.camera
      });

    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Permissão necessária",
        description: "Este app precisa acessar sua localização para funcionar corretamente.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const result = await Geolocation.requestPermissions();
      const granted = result.location === 'granted';
      
      setPermissions(prev => ({ ...prev, location: result.location }));

      if (granted) {
        toast({
          title: "Permissão concedida",
          description: "Agora podemos acessar sua localização para entregas em tempo real.",
        });
      } else {
        toast({
          title: "Permissão negada",
          description: "O acesso à localização é necessário para o funcionamento do app.",
          variant: "destructive"
        });
      }

      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      toast({
        title: "Erro",
        description: "Não foi possível solicitar permissão de localização.",
        variant: "destructive"
      });
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const result = await PushNotifications.requestPermissions();
      const granted = result.receive === 'granted';
      
      setPermissions(prev => ({ ...prev, notifications: result.receive }));

      if (granted) {
        // Register for push notifications
        await PushNotifications.register();
        
        toast({
          title: "Notificações ativadas",
          description: "Você receberá atualizações sobre seus pedidos.",
        });
      } else {
        toast({
          title: "Notificações desativadas",
          description: "Você pode ativar as notificações nas configurações do app.",
          variant: "destructive"
        });
      }

      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const result = await Camera.requestPermissions();
      const granted = result.camera === 'granted';
      
      setPermissions(prev => ({ ...prev, camera: result.camera }));

      if (granted) {
        toast({
          title: "Câmera liberada",
          description: "Agora você pode tirar fotos para comprovar entregas.",
        });
      } else {
        toast({
          title: "Acesso à câmera negado",
          description: "A câmera é necessária para comprovar entregas.",
          variant: "destructive"
        });
      }

      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const requestAllPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return;

    const results = await Promise.allSettled([
      requestLocationPermission(),
      requestNotificationPermission(),
      requestCameraPermission()
    ]);

    const grantedCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value
    ).length;

    if (grantedCount === results.length) {
      toast({
        title: "Todas as permissões concedidas",
        description: "O app está pronto para uso completo!",
      });
    } else {
      toast({
        title: "Algumas permissões foram negadas",
        description: "Você pode alterar isso nas configurações do Android.",
        variant: "destructive"
      });
    }
  };

  const openAppSettings = async () => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        // This would require a custom plugin or using App plugin
        console.log('Opening app settings...');
      } catch (error) {
        console.error('Error opening app settings:', error);
      }
    }
  };

  return {
    permissions,
    isNativeApp,
    deviceInfo,
    checkAllPermissions,
    requestLocationPermission,
    requestNotificationPermission,
    requestCameraPermission,
    requestAllPermissions,
    openAppSettings
  };
}