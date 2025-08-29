import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  Camera, 
  MapPin, 
  Bell, 
  BellOff, 
  Smartphone, 
  Vibrate,
  Battery,
  Wifi,
  Volume2
} from 'lucide-react';

// Capacitor imports (only available in mobile build)
let CapacitorCamera: any = null;
let CapacitorGeolocation: any = null;
let CapacitorHaptics: any = null;
let CapacitorStatusBar: any = null;
let CapacitorDevice: any = null;
let CapacitorNetwork: any = null;

// Dynamic imports for Capacitor
const loadCapacitorPlugins = async () => {
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const { Camera } = await import('@capacitor/camera');
      const { Geolocation } = await import('@capacitor/geolocation');
      const { Haptics } = await import('@capacitor/haptics');
      const { StatusBar } = await import('@capacitor/status-bar');
      const { Device } = await import('@capacitor/device');
      const { Network } = await import('@capacitor/network');
      
      CapacitorCamera = Camera;
      CapacitorGeolocation = Geolocation;
      CapacitorHaptics = Haptics;
      CapacitorStatusBar = StatusBar;
      CapacitorDevice = Device;
      CapacitorNetwork = Network;
      
      return true;
    }
  } catch (error) {
    console.log('Capacitor not available - running in web mode');
  }
  return false;
};

interface DeviceInfo {
  model: string;
  platform: string;
  version: string;
  isVirtual: boolean;
  manufacturer: string;
  battery?: {
    batteryLevel: number;
    isCharging: boolean;
  };
  network?: {
    connected: boolean;
    connectionType: string;
  };
}

export const NativeFeatures: React.FC = () => {
  const { toast } = useToast();
  const [isCapacitorAvailable, setIsCapacitorAvailable] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    sendTestNotification
  } = usePushNotifications();

  useEffect(() => {
    const initCapacitor = async () => {
      const available = await loadCapacitorPlugins();
      setIsCapacitorAvailable(available);
      
      if (available) {
        await loadDeviceInfo();
        await checkPermissions();
      }
    };
    
    initCapacitor();
  }, []);

  const loadDeviceInfo = async () => {
    if (!CapacitorDevice) return;

    try {
      const info = await CapacitorDevice.getInfo();
      const batteryInfo = await CapacitorDevice.getBatteryInfo();
      
      let networkInfo = { connected: navigator.onLine, connectionType: 'unknown' };
      if (CapacitorNetwork) {
        networkInfo = await CapacitorNetwork.getStatus();
      }

      setDeviceInfo({
        model: info.model,
        platform: info.platform,
        version: info.osVersion,
        isVirtual: info.isVirtual,
        manufacturer: info.manufacturer,
        battery: batteryInfo,
        network: networkInfo
      });
    } catch (error) {
      console.error('Error loading device info:', error);
    }
  };

  const checkPermissions = async () => {
    if (!CapacitorCamera || !CapacitorGeolocation) return;

    try {
      // Check camera permission
      const cameraStatus = await CapacitorCamera.checkPermissions();
      setCameraPermission(cameraStatus.camera);

      // Check location permission
      const locationStatus = await CapacitorGeolocation.checkPermissions();
      setLocationPermission(locationStatus.location);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestCameraPermission = async () => {
    if (!CapacitorCamera) {
      toast({
        title: "Câmera não disponível",
        description: "Funcionalidade disponível apenas no app mobile",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await CapacitorCamera.requestPermissions();
      setCameraPermission(permission.camera);
      
      if (permission.camera === 'granted') {
        toast({
          title: "Permissão concedida! 📷",
          description: "Agora você pode usar a câmera",
        });
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      toast({
        title: "Erro na permissão",
        description: "Não foi possível solicitar permissão da câmera",
        variant: "destructive",
      });
    }
  };

  const requestLocationPermission = async () => {
    if (!CapacitorGeolocation) {
      // Fallback to web geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            toast({
              title: "Localização obtida! 📍",
              description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`,
            });
          },
          (error) => {
            toast({
              title: "Erro de localização",
              description: error.message,
              variant: "destructive",
            });
          }
        );
      }
      return;
    }

    try {
      const permission = await CapacitorGeolocation.requestPermissions();
      setLocationPermission(permission.location);
      
      if (permission.location === 'granted') {
        const position = await CapacitorGeolocation.getCurrentPosition();
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        
        toast({
          title: "Localização obtida! 📍",
          description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`,
        });
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      toast({
        title: "Erro na localização",
        description: "Não foi possível obter sua localização",
        variant: "destructive",
      });
    }
  };

  const takePicture = async () => {
    if (cameraPermission !== 'granted') {
      await requestCameraPermission();
      return;
    }

    if (!CapacitorCamera) return;

    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: 'uri',
        source: 'camera'
      });

      toast({
        title: "Foto capturada! 📸",
        description: "Foto salva com sucesso",
      });

      console.log('Image URI:', image.webPath);
    } catch (error) {
      console.error('Error taking picture:', error);
      toast({
        title: "Erro na câmera",
        description: "Não foi possível capturar a foto",
        variant: "destructive",
      });
    }
  };

  const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!CapacitorHaptics) {
      // Fallback vibration for web
      if ('vibrate' in navigator) {
        const patterns = {
          light: [50],
          medium: [100],
          heavy: [200]
        };
        navigator.vibrate(patterns[type]);
      }
      return;
    }

    try {
      await CapacitorHaptics.impact({ style: type });
      toast({
        title: "Vibração ativada! 📳",
        description: `Feedback háptico: ${type}`,
      });
    } catch (error) {
      console.error('Error triggering haptic:', error);
    }
  };

  const changeStatusBar = async (style: 'light' | 'dark' = 'dark') => {
    if (!CapacitorStatusBar) return;

    try {
      await CapacitorStatusBar.setStyle({ style: style === 'light' ? 'LIGHT' : 'DARK' });
      toast({
        title: "Status bar alterada",
        description: `Estilo: ${style}`,
      });
    } catch (error) {
      console.error('Error changing status bar:', error);
    }
  };

  const getPermissionBadgeVariant = (permission: string) => {
    switch (permission) {
      case 'granted':
        return 'default';
      case 'denied':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Funcionalidades Nativas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plataforma:</span>
            <Badge variant={isCapacitorAvailable ? 'default' : 'secondary'}>
              {isCapacitorAvailable ? 'Mobile App' : 'Web Browser'}
            </Badge>
          </div>
          
          {deviceInfo && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Dispositivo:</span>
                <span className="text-sm font-mono">{deviceInfo.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Sistema:</span>
                <span className="text-sm font-mono">{deviceInfo.platform} {deviceInfo.version}</span>
              </div>
              {deviceInfo.battery && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bateria:</span>
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4" />
                    <span className="text-sm font-mono">
                      {Math.round(deviceInfo.battery.batteryLevel * 100)}%
                    </span>
                  </div>
                </div>
              )}
              {deviceInfo.network && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Rede:</span>
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-mono">{deviceInfo.network.connectionType}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Câmera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Permissão:</span>
            <Badge variant={getPermissionBadgeVariant(cameraPermission)}>
              {cameraPermission}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={requestCameraPermission}
              disabled={cameraPermission === 'granted'}
              variant="outline"
              size="sm"
            >
              Solicitar Permissão
            </Button>
            <Button 
              onClick={takePicture}
              disabled={cameraPermission !== 'granted'}
              size="sm"
            >
              Tirar Foto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geolocalização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Permissão:</span>
            <Badge variant={getPermissionBadgeVariant(locationPermission)}>
              {locationPermission}
            </Badge>
          </div>
          
          {location && (
            <div className="text-xs font-mono bg-muted p-2 rounded">
              Lat: {location.lat.toFixed(6)}<br />
              Lng: {location.lng.toFixed(6)}
            </div>
          )}
          
          <Button 
            onClick={requestLocationPermission}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Obter Localização
          </Button>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Suporte:</span>
            <Badge variant={pushSupported ? 'default' : 'destructive'}>
              {pushSupported ? 'Suportado' : 'Não suportado'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Status:</span>
            <Badge variant={pushSubscribed ? 'default' : 'secondary'}>
              {pushSubscribed ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            {pushSubscribed ? (
              <Button 
                onClick={unsubscribeFromPush}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <BellOff className="w-4 h-4" />
                Desativar
              </Button>
            ) : (
              <Button 
                onClick={subscribeToPush}
                size="sm"
                className="gap-2"
              >
                <Bell className="w-4 h-4" />
                Ativar
              </Button>
            )}
            
            <Button 
              onClick={sendTestNotification}
              disabled={!pushSubscribed}
              variant="outline"
              size="sm"
            >
              Teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Haptic Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vibrate className="w-5 h-5" />
            Feedback Háptico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => triggerHaptic('light')}
              variant="outline"
              size="sm"
            >
              Leve
            </Button>
            <Button 
              onClick={() => triggerHaptic('medium')}
              variant="outline"
              size="sm"  
            >
              Médio
            </Button>
            <Button 
              onClick={() => triggerHaptic('heavy')}
              variant="outline"
              size="sm"
            >
              Forte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar Control */}
      {isCapacitorAvailable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Controles do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                onClick={() => changeStatusBar('light')}
                variant="outline"
                size="sm"
              >
                Status Bar Clara
              </Button>
              <Button 
                onClick={() => changeStatusBar('dark')}
                variant="outline"
                size="sm"
              >
                Status Bar Escura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};