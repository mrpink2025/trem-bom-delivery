import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] => {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    triggerOnce = false
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        
        if (isElementIntersecting) {
          setIsIntersecting(true);
          
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      {
        threshold,
        root,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, triggerOnce]);

  return [ref, isIntersecting];
};

// Hook for lazy loading images
export const useLazyImage = (src: string, fallbackSrc?: string) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const [imageRef, isIntersecting] = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1
  });

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
      };
      
      img.onerror = () => {
        if (fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
      };
      
      img.src = src;
    }
  }, [isIntersecting, src, fallbackSrc]);

  return { imageRef, imageSrc };
};

// Hook for infinite scrolling
export const useInfiniteScroll = (
  callback: () => void,
  hasMore: boolean = true
) => {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  });

  useEffect(() => {
    if (isIntersecting && hasMore) {
      callback();
    }
  }, [isIntersecting, hasMore, callback]);

  return ref;
};

// Hook for visibility tracking (analytics)
export const useVisibilityTracking = (
  elementId: string,
  onVisible?: () => void,
  threshold: number = 0.5
) => {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold,
    triggerOnce: true
  });

  useEffect(() => {
    if (isIntersecting && onVisible) {
      onVisible();
      
      // Track with analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'element_visible', {
          element_id: elementId,
          visibility_threshold: threshold
        });
      }
    }
  }, [isIntersecting, onVisible, elementId, threshold]);

  return ref;
};