import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseImageUrlOptions {
  bucket: string;
  path?: string | null;
  fallback?: string;
}

export const useImageUrl = ({ bucket, path, fallback }: UseImageUrlOptions) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getImageUrl = async () => {
      if (!path) {
        setImageUrl(fallback || null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if bucket is public
        const publicBuckets = ['avatars', 'restaurants', 'menu-items'];
        
        if (publicBuckets.includes(bucket)) {
          // For public buckets, construct URL directly
          const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          
          setImageUrl(data.publicUrl);
        } else {
          // For private buckets, get signed URL
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600); // 1 hour expiry

          if (error) {
            throw error;
          }

          setImageUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting image URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setImageUrl(fallback || null);
      } finally {
        setLoading(false);
      }
    };

    getImageUrl();
  }, [bucket, path, fallback]);

  return { imageUrl, loading, error };
};