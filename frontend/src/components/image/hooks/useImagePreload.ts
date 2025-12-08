import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import type { Image } from '@/types/image';

interface UseImagePreloadReturn {
  placeholderSrc: string; // Small/thumbnail URL for background-image (blur-up)
  imageSrc: string; // Full image URL for src
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
  wasCachedInitial: boolean; // Whether the full image was already cached on first render
}

// Global cache to track loaded images across modal navigation
// Also accessible via window for cross-component access
const modalImageCache = new Set<string>();
if (typeof window !== 'undefined') {
  (window as any).modalImageCache = modalImageCache;
}

/**
 * Check if an image URL is already loaded in browser cache
 * (Currently unused - kept for potential future use)
 */
// const isImageCached = (url: string): Promise<boolean> => {
//   return new Promise((resolve) => {
//     if (modalImageCache.has(url)) {
//       resolve(true);
//       return;
//     }
//
//     const img = new Image();
//     // Removed crossOrigin to avoid CORS issues
//     // img.crossOrigin = 'anonymous';
//     let resolved = false;
//
//     const resolveOnce = (value: boolean) => {
//       if (!resolved) {
//         resolved = true;
//         if (value) {
//           modalImageCache.add(url);
//         }
//         resolve(value);
//       }
//     };
//
//     // Short timeout - if image loads quickly, it's cached
//     const timeout = setTimeout(() => resolveOnce(false), 50);
//
//     img.onload = () => {
//       clearTimeout(timeout);
//       resolveOnce(true);
//     };
//     img.onerror = () => {
//       clearTimeout(timeout);
//       resolveOnce(false);
//     };
//
//     img.src = url;
//   });
// };

/**
 * Synchronously check if an image is likely cached
 * This is used for initial state to prevent flashing
 * Returns true optimistically to prevent flashing, then we verify asynchronously
 */
const checkImageCacheSync = (url: string): boolean => {
  // Check our cache first (most reliable)
  if (modalImageCache.has(url)) {
    return true;
  }

  // Try to check if the image is in browser cache synchronously
  // Create a test image element
  const img = new Image();
  img.src = url;

  // If image loads synchronously (complete = true immediately), it's cached
  if (img.complete && img.naturalWidth > 0) {
    modalImageCache.add(url);
    return true;
  }

  // If not immediately available, assume not cached
  // Better to show loading state briefly than flash on cached images
  return false;
};

/**
 * Custom hook for blur-up image loading (Unsplash-style)
 * Uses a small placeholder as background-image and full image as src
 * This prevents flashing by always showing the placeholder until full image loads
 */
export const useImagePreload = (image: Image): UseImagePreloadReturn => {
  const derivePlaceholder = () =>
    image.thumbnailUrl ||
    image.smallUrl ||
    image.regularUrl ||
    image.imageUrl ||
    '';

  const deriveFull = () =>
    image.regularUrl || image.imageUrl || image.smallUrl || '';

  // Calculate image URLs once for initial state
  const fullImage = deriveFull();
  const initialPlaceholder = derivePlaceholder();

  // Track whether this image was already cached on first render.
  const initialIsCachedRef = useRef<boolean>(false);

  // Initialize isLoaded based on synchronous cache check to prevent flashing.
  // Also remember that initial cache state so other components can avoid
  // forcing a "loading" transition for cached images.
  const [isLoaded, setIsLoaded] = useState(() => {
    if (!fullImage) return false;
    const cached = checkImageCacheSync(fullImage);
    initialIsCachedRef.current = cached;
    return cached;
  });

  const [placeholderSrc, setPlaceholderSrc] = useState<string>(initialPlaceholder);
  const [imageSrc, setImageSrc] = useState<string>(fullImage);
  const currentImageIdRef = useRef<string | null>(null);
  const previousImageIdRef = useRef<string | null>(null);
  const imageObjectsRef = useRef<HTMLImageElement[]>([]);

  // Use useLayoutEffect for synchronous state updates to prevent flashing
  // This is intentional - we need synchronous updates to prevent visual flashing
  useLayoutEffect(() => {
    const imageId = image._id;
    const imageChanged = previousImageIdRef.current !== imageId;
    previousImageIdRef.current = imageId;
    currentImageIdRef.current = imageId;

    const placeholder = derivePlaceholder();
    const fullImage = deriveFull();

    // Set immediately (synchronous) to prevent flashing
    // Note: Linter warns about setState in useLayoutEffect, but this is intentional
    // to prevent visual flashing when changing images
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaceholderSrc(placeholder);
    setImageSrc(fullImage);

    // CRITICAL: Only update isLoaded state if image is NOT cached
    // This prevents the flash from true -> false -> true for cached images
    if (imageChanged && fullImage) {
      const isCached = checkImageCacheSync(fullImage);
      // Only set isLoaded to false if image is NOT cached
      // If cached, keep isLoaded as true to prevent any state changes
      if (!isCached) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoaded(false);
      } else {
        // Image is cached, ensure isLoaded is true
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoaded(true);
      }
    }
  }, [
    image._id,
    image.thumbnailUrl,
    image.smallUrl,
    image.regularUrl,
    image.imageUrl,
  ]);

  // Use useEffect for async operations and cleanup
  useEffect(() => {
    const imageId = image._id;
    const imageChanged = previousImageIdRef.current !== imageId;

    // Cleanup previous image objects
    imageObjectsRef.current.forEach((img) => {
      img.src = '';
      img.onload = null;
      img.onerror = null;
    });
    imageObjectsRef.current = [];

    const fullImage =
      image.regularUrl || image.imageUrl || image.smallUrl || '';

    // Verify cache status asynchronously
    // We start optimistically (isLoaded = true) to prevent flashing
    // Then verify if it's actually cached
    if (fullImage) {
      if (imageChanged) {
        // Quick check - if image is in our cache, keep isLoaded = true
        if (modalImageCache.has(fullImage)) {
          // Already in cache, keep loaded state
          return;
        }

        // Check if image is in browser cache (async, but fast)
        // Use a short timeout to detect if image loads quickly (cached)
        const testImg = new Image();
        testImg.crossOrigin = 'anonymous';
        let resolved = false;

        const checkComplete = () => {
          if (resolved || currentImageIdRef.current !== imageId) return;
          if (testImg.complete && testImg.naturalWidth > 0) {
            resolved = true;
            modalImageCache.add(fullImage);
            // Image is cached, keep isLoaded = true
            return;
          }
          // If not complete after a short delay, it might not be cached
          // But we keep isLoaded = true optimistically to prevent flash
          // The actual image onLoad will handle the real loading state
        };

        testImg.onload = () => {
          if (!resolved && currentImageIdRef.current === imageId) {
            resolved = true;
            modalImageCache.add(fullImage);
            // Image loaded quickly, it was cached
          }
        };

        testImg.src = fullImage;

        // Check immediately (might be cached)
        setTimeout(checkComplete, 0);
        // Also check after a very short delay
        setTimeout(checkComplete, 10);
      }
      // If image didn't change, keep current isLoaded state
    }

    // If we have a full-size imageUrl and it's different from regularUrl, preload it
    if (
      image.imageUrl &&
      image.imageUrl !== image.regularUrl &&
      image.regularUrl
    ) {
      const fullSizeImg = new Image();
      fullSizeImg.crossOrigin = 'anonymous';
      imageObjectsRef.current.push(fullSizeImg);

      fullSizeImg.onload = () => {
        // Upgrade to full size after it's loaded
        if (currentImageIdRef.current === imageId) {
          modalImageCache.add(image.imageUrl!);
          setImageSrc(image.imageUrl);
        }
      };
      fullSizeImg.onerror = () => {
        // If full size fails, keep the regularUrl
        console.warn('Failed to preload full-size image');
      };
      fullSizeImg.src = image.imageUrl;
    }

    // Cleanup function
    return () => {
      // Cleanup image objects when component unmounts or image changes
      imageObjectsRef.current.forEach((img) => {
        img.src = '';
        img.onload = null;
        img.onerror = null;
      });
      imageObjectsRef.current = [];
    };
  }, [
    image._id,
    image.thumbnailUrl,
    image.smallUrl,
    image.regularUrl,
    image.imageUrl,
  ]);

  return {
    placeholderSrc,
    imageSrc,
    isLoaded,
    setIsLoaded,
    wasCachedInitial: initialIsCachedRef.current,
  };
};
