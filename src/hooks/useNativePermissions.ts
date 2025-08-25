import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Camera } from '@capacitor/camera';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useToast } from './use-toast';

interface PermissionState {
  location: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown';
  camera: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'limited' | 'unknown';
  storage: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown';
}

interface PermissionInfo {
  title: string;
  description: string;
  importance: string;
  denied_message: string;
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

  const permissionInfo: Record<string, PermissionInfo> = {
    location: {
      title: 'Localização Exata',
      description: 'Necessária para rastreamento em tempo real de entregas, cálculo de rotas e estimativas de tempo',
      importance: 'Essencial para entregadores e clientes acompanharem o trajeto',
      denied_message: 'Sem a localização, você não poderá receber ou fazer entregas'
    },
    notifications: {
      title: 'Notificações Push',
      description: 'Para receber atualizações instantâneas sobre pedidos, entregas e promoções',
      importance: 'Mantenha-se informado sobre seus pedidos em tempo real',
      denied_message: 'Você perderá atualizações importantes sobre seus pedidos'
    },
    camera: {
      title: 'Câmera',
      description: 'Para tirar fotos de comprovação de entrega e upload de documentos',
      importance: 'Garantia de segurança para comprovação de entregas',
      denied_message: 'Não será possível comprovar entregas com fotos'
    },
    storage: {
      title: 'Arquivos e Mídia',
      description: 'Para salvar comprovantes, fotos e documentos no seu dispositivo',
      importance: 'Backup local de documentos importantes',
      denied_message: 'Documentos não poderão ser salvos localmente'
    }
  };

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

      // Check storage permission (Filesystem)
      let storageStatus = 'granted';
      try {
        await Filesystem.checkPermissions();
      } catch (error) {
        storageStatus = 'denied';
      }

      setPermissions({
        location: locationStatus.location,
        notifications: notificationStatus.receive,
        camera: cameraStatus.camera,
        storage: storageStatus as any
      });

      console.log('Permission status:', {
        location: locationStatus.location,
        notifications: notificationStatus.receive,
        camera: cameraStatus.camera,
        storage: storageStatus
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
      console.log('🔄 Requesting location permission...');
      
      // Check current permission first
      const currentStatus = await Geolocation.checkPermissions();
      console.log('📋 Current location permission status:', currentStatus);
      
      if (currentStatus.location === 'granted') {
        console.log('✅ Location permission already granted');
        setPermissions(prev => ({ ...prev, location: 'granted' }));
        return true;
      }

      console.log('🔐 Requesting location permission from system...');
      const result = await Geolocation.requestPermissions();
      console.log('📱 Permission request result:', result);
      
      const granted = result.location === 'granted';
      
      setPermissions(prev => ({ ...prev, location: result.location }));

      if (granted) {
        console.log('✅ Location permission granted successfully');
        toast({
          title: "✅ Localização Permitida",
          description: permissionInfo.location.importance,
        });
      } else {
        console.log('❌ Location permission denied:', result.location);
        toast({
          title: "❌ Localização Negada",
          description: permissionInfo.location.denied_message,
          variant: "destructive"
        });
      }

      return granted;
    } catch (error: any) {
      console.error('💥 Error requesting location permission:', error);
      console.error('💥 Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code
      });
      
      toast({
        title: "Erro na Permissão",
        description: `Erro ao solicitar permissão: ${error.message || 'Erro desconhecido'}`,
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
          title: "🔔 Notificações Ativadas",
          description: permissionInfo.notifications.importance,
        });
      } else {
        toast({
          title: "🔕 Notificações Negadas",
          description: permissionInfo.notifications.denied_message,
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
          title: "📷 Câmera Liberada",
          description: permissionInfo.camera.importance,
        });
      } else {
        toast({
          title: "📷 Câmera Negada",
          description: permissionInfo.camera.denied_message,
          variant: "destructive"
        });
      }

      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      await Filesystem.requestPermissions();
      setPermissions(prev => ({ ...prev, storage: 'granted' }));
      
      toast({
        title: "📁 Arquivos Permitidos",
        description: permissionInfo.storage.importance,
      });
      
      return true;
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      setPermissions(prev => ({ ...prev, storage: 'denied' }));
      
      toast({
        title: "📁 Arquivos Negados",
        description: permissionInfo.storage.denied_message,
        variant: "destructive"
      });
      
      return false;
    }
  };

  const requestAllPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return;

    const results = await Promise.allSettled([
      requestLocationPermission(),
      requestNotificationPermission(),
      requestCameraPermission(),
      requestStoragePermission()
    ]);

    const grantedCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value
    ).length;

    if (grantedCount === results.length) {
      toast({
        title: "🎉 Todas as Permissões Concedidas",
        description: "O app está configurado e pronto para uso completo!",
      });
    } else {
      toast({
        title: "⚠️ Algumas Permissões Negadas", 
        description: "Para melhor experiência, ative todas as permissões nas configurações.",
        variant: "destructive"
      });
    }
  };

  const openAppSettings = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Use a different approach for opening settings
        const settingsUrl = Capacitor.getPlatform() === 'android' 
          ? 'app-settings:' 
          : 'app-settings:';
        
        window.open(settingsUrl, '_system');
        
        toast({
          title: "Configurações",
          description: "Acesse: Configurações > Apps > Trem Bão Delivery > Permissões",
        });
      } catch (error) {
        console.error('Error opening app settings:', error);
        toast({
          title: "Configurações",
          description: "Acesse manualmente: Configurações > Apps > Trem Bão Delivery > Permissões",
          variant: "default"
        });
      }
    }
  };

  return {
    permissions,
    permissionInfo,
    isNativeApp,
    deviceInfo,
    checkAllPermissions,
    requestLocationPermission,
    requestNotificationPermission,
    requestCameraPermission,
    requestStoragePermission,
    requestAllPermissions,
    openAppSettings
  };
}