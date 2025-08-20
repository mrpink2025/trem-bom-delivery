import React, { useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  onError?: () => void;
}

const ImageWithFallback = memo(({ 
  src, 
  fallbackSrc,
  className, 
  alt = '', 
  onError,
  ...props 
}: ImageWithFallbackProps) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const defaultFallback = "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80";

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc || defaultFallback);
      onError?.();
    }
  };

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      className={cn("transition-opacity duration-300", className)}
      onError={handleError}
      loading="lazy"
    />
  );
});

ImageWithFallback.displayName = 'ImageWithFallback';

export default ImageWithFallback;