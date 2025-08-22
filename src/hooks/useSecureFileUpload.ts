import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  validateFileType, 
  generateSecureFileName, 
  uploadRateLimit,
  validateMediaUrl 
} from '@/utils/chatSecurity';

interface SecureUploadOptions {
  bucket: string;
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

interface SecureUploadResult {
  url: string | null;
  path: string | null;
  error: string | null;
}

export const useSecureFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const secureUpload = async (
    file: File, 
    userId: string,
    options: SecureUploadOptions
  ): Promise<SecureUploadResult> => {
    try {
      setUploading(true);
      setProgress(0);

      // Check upload rate limit
      const rateLimitCheck = uploadRateLimit.checkLimit(userId);
      if (!rateLimitCheck.allowed) {
        const error = `Limite de upload excedido. Tente novamente em alguns minutos.`;
        
        // Log security event to audit_logs
        await supabase.from('audit_logs').insert({
          table_name: 'file_uploads',
          operation: 'RATE_LIMIT_EXCEEDED',
          new_values: { 
            file_name: file.name,
            file_size: file.size,
            remaining_uploads: rateLimitCheck.remainingUploads,
            user_id: userId
          }
        });
        
        toast.error(error);
        return { url: null, path: null, error };
      }

      // 🔒 Security: Validate file type and size
      const fileValidation = validateFileType(file);
      if (!fileValidation.valid) {
        const error = fileValidation.error || 'Arquivo inválido';
        
        // Log security event to audit_logs
        await supabase.from('audit_logs').insert({
          table_name: 'file_uploads',
          operation: 'INVALID_FILE_BLOCKED',
          new_values: { 
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            user_id: userId,
            error: error
          }
        });
        
        toast.error(error);
        return { url: null, path: null, error };
      }

      setProgress(25);

      // 🔒 Security: Generate secure filename
      const secureFileName = generateSecureFileName(file.name, userId);
      const fullPath = options.folder ? `${options.folder}/${secureFileName}` : secureFileName;

      setProgress(50);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(options.bucket)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setProgress(75);

      // Get secure URL
      const { data: urlData } = await supabase.storage
        .from(options.bucket)
        .createSignedUrl(fullPath, 60 * 60 * 24); // 24 hours

      if (!urlData?.signedUrl) {
        throw new Error('Falha ao gerar URL de acesso');
      }

      setProgress(90);

      // 🔒 Security: Validate the generated URL
      const urlValidation = validateMediaUrl(urlData.signedUrl);
      if (!urlValidation.valid) {
        const error = urlValidation.error || 'URL de mídia inválida';
        
        // Clean up uploaded file
        await supabase.storage.from(options.bucket).remove([fullPath]);
        
        toast.error(error);
        return { url: null, path: null, error };
      }

      setProgress(100);

      // Log successful upload to audit_logs
      await supabase.from('audit_logs').insert({
        table_name: 'file_uploads',
        operation: 'SECURE_UPLOAD_SUCCESS',
        new_values: { 
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: fullPath,
          bucket: options.bucket,
          user_id: userId
        }
      });

      toast.success('Arquivo enviado com sucesso!');
      
      return {
        url: urlData.signedUrl,
        path: fullPath,
        error: null
      };

    } catch (error: any) {
      console.error('❌ Secure upload error:', error);
      
      // Log upload failure to audit_logs
      await supabase.from('audit_logs').insert({
        table_name: 'file_uploads',
        operation: 'SECURE_UPLOAD_FAILED',
        new_values: { 
          file_name: file.name,
          error_message: error.message,
          user_id: userId
        }
      });

      const errorMsg = error.message || 'Erro no upload do arquivo';
      toast.error(errorMsg);
      
      return {
        url: null,
        path: null,
        error: errorMsg
      };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteSecureFile = async (
    bucket: string, 
    path: string, 
    userId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      // Log secure deletion to audit_logs
      await supabase.from('audit_logs').insert({
        table_name: 'file_uploads',
        operation: 'SECURE_DELETION_SUCCESS',
        new_values: { 
          storage_path: path,
          bucket: bucket,
          user_id: userId
        }
      });

      toast.success('Arquivo removido com sucesso!');
      return true;
    } catch (error: any) {
      console.error('❌ Secure deletion error:', error);
      
      await supabase.from('audit_logs').insert({
        table_name: 'file_uploads',
        operation: 'SECURE_DELETION_FAILED',
        new_values: { 
          storage_path: path,
          error_message: error.message,
          user_id: userId
        }
      });

      toast.error('Erro ao remover arquivo: ' + error.message);
      return false;
    }
  };

  return {
    secureUpload,
    deleteSecureFile,
    uploading,
    progress
  };
};