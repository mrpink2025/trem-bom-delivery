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
    permissionInfo,
    requestAllPermissions,
    requestLocationPermission,
    requestNotificationPermission,
    requestCameraPermission,
    requestStoragePermission,
    openAppSettings,
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
                    {permissionInfo.location.description}
                  </p>
                  <p className="text-xs text-primary/80 mb-2">
                    {permissionInfo.location.importance}
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
                    {permissionInfo.notifications.description}
                  </p>
                  <p className="text-xs text-primary/80 mb-2">
                    {permissionInfo.notifications.importance}
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
                    {permissionInfo.camera.description}
                  </p>
                  <p className="text-xs text-primary/80 mb-2">
                    {permissionInfo.camera.importance}
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

          {/* Storage Permission */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Folder className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">Arquivos e Mídia</h4>
                    {getPermissionIcon(permissions.storage)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {permissionInfo.storage.description}
                  </p>
                  <p className="text-xs text-primary/80 mb-2">
                    {permissionInfo.storage.importance}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {getPermissionStatus(permissions.storage)}
                  </p>
                  {permissions.storage !== 'granted' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={requestStoragePermission}
                    >
                      Solicitar
                    </Button>
                  )}
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

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-center text-muted-foreground">
              Você pode alterar essas permissões a qualquer momento
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={openAppSettings}
              className="h-8 text-xs"
            >
              Abrir Configurações do App
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}