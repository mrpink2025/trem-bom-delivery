import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string, path: string) => void;
  onImageRemoved?: () => void;
  bucket: 'avatars' | 'restaurants' | 'menu-items' | 'documents';
  folder?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  maxSize?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  bucket,
  folder,
  aspectRatio = 'square',
  maxSize = 10485760, // 10MB default
  className,
  placeholder = "Clique para fazer upload de uma imagem",
  disabled = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const { uploadFile, deleteFile, uploading, progress } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatioClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (disabled) return;

    const result = await uploadFile(file, {
      bucket,
      folder,
      maxSize,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (result && !result.error) {
      onImageUploaded(result.url, result.path);
    }
  };

  const handleRemoveImage = async () => {
    if (disabled || !currentImageUrl) return;

    // Extract path from URL if needed
    const pathMatch = currentImageUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    const path = pathMatch ? pathMatch[1] : '';

    if (path && await deleteFile(bucket, path)) {
      onImageRemoved?.();
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-2 border-dashed transition-all duration-200",
        aspectRatioClasses[aspectRatio],
        dragActive && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer hover:border-primary/50",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={openFileDialog}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {uploading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <Progress value={progress} className="w-3/4" />
          <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</p>
        </div>
      )}

      {currentImageUrl ? (
        <div className="relative h-full">
          <img
            src={currentImageUrl}
            alt="Uploaded image"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  openFileDialog();
                }}
                disabled={disabled}
              >
                <Camera className="h-4 w-4" />
              </Button>
              {onImageRemoved && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{placeholder}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste ou clique para fazer upload
          </p>
        </div>
      )}
    </Card>
  );
};