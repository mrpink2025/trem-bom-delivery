import React, { useState, useRef } from 'react';
import { Camera, MapPin, Wifi, WifiOff, Upload, Download, Image, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCamera } from '@/hooks/useCamera';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { Capacitor } from '@capacitor/core';

export default function AdvancedNativeFeatures() {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Geolocation hook - using the existing API
  const {
    latitude,
    longitude,
    error: locationError,
    loading: locationLoading,
    getCurrentLocation,
  } = useGeolocation();

  // Camera hook
  const {
    loading: cameraLoading,
    takePhoto,
    pickFromGallery,
    photoToFile,
  } = useCamera();

  // Offline storage - using the existing API
  const {
    isOnline,
    syncInProgress,
    pendingActionsCount,
    addPendingAction,
    syncPendingActions,
    clearOldCache,
  } = useOfflineStorage();

  // Handle photo capture
  const handleTakePhoto = async () => {
    try {
      const photo = await takePhoto({
        quality: 80,
        allowEditing: true,
        saveToGallery: false,
      });

      if (photo?.dataUrl) {
        setCapturedImage(photo.dataUrl);
        
        // Store offline if no connection
        if (!isOnline) {
          await addPendingAction('update_profile', {
            type: 'photo',
            dataUrl: photo.dataUrl,
            timestamp: Date.now(),
          });
          
          toast({
            title: 'Foto Salva Offline',
            description: 'A foto será enviada quando a conexão for restabelecida',
          });
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  // Handle gallery picker
  const handlePickFromGallery = async () => {
    try {
      const photo = await pickFromGallery({
        quality: 80,
        allowEditing: true,
      });

      if (photo?.dataUrl) {
        setCapturedImage(photo.dataUrl);
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
    }
  };

  // Handle file upload simulation
  const simulateFileUpload = async () => {
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          toast({
            title: 'Upload Concluído',
            description: 'Arquivo enviado com sucesso!',
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Format location display
  const formatLocation = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Handle sync
  const handleSync = async () => {
    await syncPendingActions();
  };

  const hasLocation = latitude !== null && longitude !== null;

  // Handle location tracking
  const handleLocationAction = async () => {
    await getCurrentLocation();
    toast({
      title: 'Localização Atualizada',
      description: 'Sua localização foi atualizada com sucesso',
    });
  };

  return (
    <div className="space-y-6 p-4">
      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            Status da Conexão
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingActionsCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {pendingActionsCount} ações aguardando sincronização
                </span>
                <Button
                  size="sm"
                  onClick={handleSync}
                  disabled={!isOnline || syncInProgress}
                >
                  {syncInProgress ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearOldCache()}
              className="w-full"
            >
              Limpar Cache Antigo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Camera & Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Câmera e Mídia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleTakePhoto}
              disabled={cameraLoading}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Tirar Foto
            </Button>
            
            <Button
              variant="outline"
              onClick={handlePickFromGallery}
              disabled={cameraLoading}
              className="flex items-center gap-2"
            >
              <Image className="h-4 w-4" />
              Galeria
            </Button>
          </div>

          {capturedImage && (
            <div className="mt-4">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-48 object-cover rounded-md border"
              />
              <Button
                className="w-full mt-2"
                onClick={simulateFileUpload}
                disabled={uploadProgress > 0 && uploadProgress < 100}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadProgress > 0 && uploadProgress < 100 ? 'Enviando...' : 'Enviar Foto'}
              </Button>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
              )}
            </div>
          )}

          {/* File input for web */}
          {!Capacitor.isNativePlatform() && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCapturedImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geolocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geolocalização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              {locationLoading ? 'Localizando...' : 'Localizar'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleLocationAction}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {locationError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <span className="text-sm text-destructive">{locationError}</span>
            </div>
          )}

          {hasLocation && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Coordenadas:</span>
                  <p className="font-mono">{formatLocation(latitude!, longitude!)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>Ativa</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Plataforma:</span>
              <p>{Capacitor.isNativePlatform() ? 'Nativa' : 'Web'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Platform:</span>
              <p>{Capacitor.getPlatform()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}