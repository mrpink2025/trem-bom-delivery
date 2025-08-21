import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadOptions {
  bucket: 'avatars' | 'restaurants' | 'menu-items' | 'documents';
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (
    file: File, 
    options: UploadOptions
  ): Promise<UploadResult | null> => {
    const { bucket, folder, maxSize = 10485760, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

    try {
      setUploading(true);
      setProgress(0);

      // Validate file size
      if (file.size > maxSize) {
        throw new Error(`Arquivo muito grande. Tamanho máximo: ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`);
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setProgress(100);

      // Get public URL for public buckets
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      toast({
        title: "Upload realizado com sucesso",
        description: "Arquivo enviado com sucesso!",
      });

      return {
        url: urlData.publicUrl,
        path: data.path,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload';
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
      return { url: '', path: '', error: errorMessage };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw error;
      }

      toast({
        title: "Arquivo removido",
        description: "Arquivo removido com sucesso!",
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao remover arquivo';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploading,
    progress,
  };
};