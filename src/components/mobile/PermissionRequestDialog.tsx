import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Bell, Camera, Folder, Shield, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { useNativePermissions } from '@/hooks/useNativePermissions';

interface PermissionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function PermissionRequestDialog({
  open,
  onOpenChange,
  onComplete
}: PermissionRequestDialogProps) {
  const { 
    permissions, 
    requestAllPermissions,
    requestLocationPermission,
    requestNotificationPermission,
    requestCameraPermission,
    isNativeApp 
  } = useNativePermissions();
  
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestAll = async () => {
    setIsRequesting(true);
    await requestAllPermissions();
    setIsRequesting(false);
    onComplete();
    onOpenChange(false);
  };

  const getPermissionIcon = (status: string) => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Shield className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getPermissionStatus = (status: string) => {
    switch (status) {
      case 'granted':
        return 'Concedida';
      case 'denied':
        return 'Negada';
      case 'prompt':
        return 'Solicitação pendente';
      default:
        return 'Desconhecida';
    }
  };

  if (!isNativeApp) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Permissões do App
          </DialogTitle>
          <DialogDescription>
            Para garantir a melhor experiência, o app precisa das seguintes permissões:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Permission */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">Localização</h4>
                    {getPermissionIcon(permissions.location)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Necessária para rastreamento em tempo real de entregas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {getPermissionStatus(permissions.location)}
                  </p>
                  {permissions.location !== 'granted' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={requestLocationPermission}
                    >
                      Solicitar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Permission */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">Notificações</h4>
                    {getPermissionIcon(permissions.notifications)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Para receber atualizações sobre pedidos e entregas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {getPermissionStatus(permissions.notifications)}
                  </p>
                  {permissions.notifications !== 'granted' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={requestNotificationPermission}
                    >
                      Solicitar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera Permission */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">Câmera</h4>
                    {getPermissionIcon(permissions.camera)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Para tirar fotos de comprovação de entrega
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {getPermissionStatus(permissions.camera)}
                  </p>
                  {permissions.camera !== 'granted' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={requestCameraPermission}
                    >
                      Solicitar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Info */}
          <Card className="border-muted-foreground/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Folder className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-muted-foreground">Armazenamento</h4>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gerenciado automaticamente pelo Android
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isRequesting}
            >
              Pular
            </Button>
            <Button
              onClick={handleRequestAll}
              disabled={isRequesting}
              className="flex-1"
            >
              {isRequesting ? 'Solicitando...' : 'Permitir Todas'}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Você pode alterar essas permissões a qualquer momento nas configurações do Android
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}