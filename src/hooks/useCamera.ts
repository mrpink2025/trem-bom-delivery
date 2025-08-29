import { useState } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  source?: CameraSource;
  resultType?: CameraResultType;
  saveToGallery?: boolean;
  width?: number;
  height?: number;
}

export function useCamera() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Request camera permissions
  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const permissions = await Camera.requestPermissions();
        return permissions.camera === 'granted';
      }
      return true; // Web doesn't need explicit permissions
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      toast({
        title: 'Erro de Permissão',
        description: 'Não foi possível acessar a câmera',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Take a photo
  const takePhoto = async (options: CameraOptions = {}): Promise<Photo | null> => {
    setLoading(true);

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Permissão da câmera negada');
      }

      const {
        quality = 90,
        allowEditing = false,
        source = CameraSource.Camera,
        resultType = CameraResultType.DataUrl,
        saveToGallery = false,
        width,
        height,
      } = options;

      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        source,
        resultType,
        saveToGallery,
        width,
        height,
      });

      return photo;
    } catch (error: any) {
      console.error('Error taking photo:', error);
      
      // Handle user cancellation gracefully
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        return null;
      }

      toast({
        title: 'Erro na Câmera',
        description: error.message || 'Falha ao capturar foto',
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Pick image from gallery
  const pickFromGallery = async (options: CameraOptions = {}): Promise<Photo | null> => {
    return takePhoto({
      ...options,
      source: CameraSource.Photos,
    });
  };

  // Convert photo to blob for upload
  const photoToBlob = async (photo: Photo): Promise<Blob | null> => {
    try {
      if (photo.dataUrl) {
        const response = await fetch(photo.dataUrl);
        return await response.blob();
      } else if (photo.webPath) {
        const response = await fetch(photo.webPath);
        return await response.blob();
      }
      return null;
    } catch (error) {
      console.error('Error converting photo to blob:', error);
      return null;
    }
  };

  // Convert photo to File for form uploads
  const photoToFile = async (photo: Photo, filename: string = 'photo.jpg'): Promise<File | null> => {
    try {
      const blob = await photoToBlob(photo);
      if (!blob) return null;

      return new File([blob], filename, {
        type: blob.type || 'image/jpeg',
      });
    } catch (error) {
      console.error('Error converting photo to file:', error);
      return null;
    }
  };

  return {
    loading,
    takePhoto,
    pickFromGallery,
    photoToBlob,
    photoToFile,
    requestPermissions,
  };
}