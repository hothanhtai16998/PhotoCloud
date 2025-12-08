import { useState, useEffect, useLayoutEffect, useRef, useCallback, memo, lazy, Suspense } from 'react';
// ✅ OPTIMIZED: Lazy load BlurhashPlaceholder only when blurhash is present
// This saves ~10-15KB from initial bundle
const BlurhashPlaceholder = lazy(() => import('./BlurhashPlaceholder').then(m => ({ default: m.default })));
import './ProgressiveImage.css';

interface ProgressiveImageProps {
  src: string;
  blurhash?: string; // Add blurhash prop
  thumbnailUrl?: string;
  smallUrl?: string;
  regularUrl?: string;
  // AVIF versions for better compression
  thumbnailAvifUrl?: string;
  smallAvifUrl?: string;
  regularAvifUrl?: string;
  imageAvifUrl?: string;
  alt: string;
  className?: string;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  /** Whether to load this image eagerly (for above-the-fold images) */
  eager?: boolean;
  /** Fetch priority: 'high' for critical images, 'low' for below-the-fold */
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Fallback to original URL if size-specific URLs are not available
 * (for backward compatibility with old images)
 */
const generateThumbnailUrl = (imageUrl: string): string => {
  return imageUrl;
};

/**
 * Fallback to original URL if size-specific URLs are not available
 */
const generateSmallUrl = (imageUrl: string): string => {
  return imageUrl;
};

// Module-level cache to persist loaded image URLs across component mounts
// This prevents flashing when navigating back to the grid
const globalLoadedImages = new Set<string>();

/**
 * Check if an image is already loaded in the browser cache
 * Returns true if image loads quickly (likely cached)
 */
const isImageCached = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    // Removed crossOrigin to avoid CORS issues
    // img.crossOrigin = 'anonymous';
    let resolved = false;

    const resolveOnce = (value: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    // Set a short timeout - if image loads quickly, it's likely cached
    const timeout = setTimeout(() => resolveOnce(false), 50);

    img.onload = () => {
      clearTimeout(timeout);
      resolveOnce(true);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolveOnce(false);
    };

    img.src = url;
  });
};

/**
 * ProgressiveImage component - loads images progressively like Unsplash
 * 1. Shows blur-up placeholder (thumbnail)
 * 2. Loads small size for grid view
 * 3. Optionally loads full size on hover/click
 */
const ProgressiveImage = memo(({
  src,
  blurhash, // Destructure blurhash
  thumbnailUrl,
  smallUrl,
  thumbnailAvifUrl,
  smallAvifUrl,
  alt,
  className = '',
  onLoad,
  onError,
  eager = false,
  fetchPriority = 'auto',
}: ProgressiveImageProps) => {
  // Generate URLs on-the-fly if not provided (for old images)
  const effectiveThumbnail = thumbnailUrl || generateThumbnailUrl(src);
  const effectiveSmall = smallUrl || generateSmallUrl(src);
  
  // AVIF URLs (for srcset generation, use null if not available to avoid duplicates)
  // For fallback in getCurrentUrls, we'll use WebP versions when AVIF is not available
  const effectiveSmallAvif = smallAvifUrl || null;
  
  // AVIF URLs for fallback (use WebP if AVIF not available)
  const effectiveThumbnailAvifFallback = thumbnailAvifUrl || effectiveThumbnail;

  // Check if image was already loaded (from global cache or browser cache)
  // Synchronously check cache to prevent any flash
  const isCached = globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail);
  const cachedSrc = globalLoadedImages.has(effectiveSmall) ? effectiveSmall : effectiveThumbnail;

  // Also check if image might be in browser cache by creating a test image
  // This helps catch images that were loaded but not added to global cache
  let browserCached = false;
  if (!isCached && typeof window !== 'undefined') {
    try {
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';
      // Set src to check if it's in browser cache
      // If complete is true immediately after setting src, it's cached
      const testUrl = effectiveSmall !== effectiveThumbnail ? effectiveSmall : effectiveThumbnail;
      testImg.src = testUrl;
      // Check if image is already complete (cached)
      if (testImg.complete && testImg.naturalWidth > 0) {
        browserCached = true;
        // Add to global cache for future use
        globalLoadedImages.add(testUrl);
      }
    } catch {
      // Ignore errors in cache check
    }
  }

  const isActuallyCached = isCached || browserCached;
  const finalCachedSrc = isCached ? cachedSrc : (browserCached ? (effectiveSmall !== effectiveThumbnail ? effectiveSmall : effectiveThumbnail) : effectiveThumbnail);

  const [currentSrc, setCurrentSrc] = useState<string>(finalCachedSrc);
  const [isLoaded, setIsLoaded] = useState(isActuallyCached);
  const [skipTransition, setSkipTransition] = useState(isActuallyCached); // Skip transition for cached images
  const [isError, setIsError] = useState(false);
  const [shouldLoadEagerly, setShouldLoadEagerly] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedSrcs = useRef<Set<string>>(new Set());
  const preloadedRef = useRef<boolean>(false);

  // Callback ref to check if image is already loaded when element mounts
  // This runs synchronously when React attaches the ref, before paint
  const setImgRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node) {
      // Immediately check if image is complete (browser cache)
      if (node.complete && node.naturalWidth > 0) {
        // Image is already loaded in browser, force immediate visibility
        node.style.setProperty('opacity', '1', 'important');
        node.style.setProperty('transition', 'none', 'important');
        // Add to global cache for future use
        globalLoadedImages.add(node.src);
        if (!isLoaded) {
          setIsLoaded(true);
          setSkipTransition(true);
        }
      } else if (isLoaded || skipTransition || isActuallyCached) {
        // Image is in our cache, force immediate visibility
        node.style.setProperty('opacity', '1', 'important');
        node.style.setProperty('transition', 'none', 'important');
        // Check if src is in cache
        const imgSrc = node.src || currentSrc;
        if (globalLoadedImages.has(imgSrc)) {
          node.style.setProperty('opacity', '1', 'important');
          node.style.setProperty('transition', 'none', 'important');
        }
      }
    }
  }, [isLoaded, skipTransition, isActuallyCached, currentSrc]);

  // Reset state when src changes - but preserve loaded state if already loaded
  useEffect(() => {
    const currentSrcValue = effectiveThumbnail;
    // Only reset if src actually changed
    if (currentSrc !== currentSrcValue) {
      // Check multiple sources for cached state
      const isInGlobalCache = globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail);
      const isInLocalCache = loadedSrcs.current.has(effectiveSmall) || loadedSrcs.current.has(effectiveThumbnail);

      if (isInGlobalCache || isInLocalCache) {
        // Image was already loaded, restore immediately without transition
        setCurrentSrc(effectiveSmall !== effectiveThumbnail && globalLoadedImages.has(effectiveSmall) ? effectiveSmall : currentSrcValue);
        setIsLoaded(true);
        setSkipTransition(true); // Skip transition for cached images
      } else {
        // New src, check browser cache asynchronously
        // But set initial state optimistically - if it's not in cache, it will reset
        const targetUrl = effectiveSmall !== effectiveThumbnail ? effectiveSmall : effectiveThumbnail;
        isImageCached(targetUrl).then((cached) => {
          if (cached) {
            setCurrentSrc(targetUrl);
            setIsLoaded(true);
            setSkipTransition(true);
            globalLoadedImages.add(targetUrl);
          } else {
            // Not cached, reset state
            setCurrentSrc(currentSrcValue);
            setIsLoaded(false);
            setSkipTransition(false);
            setIsError(false);
            setShouldLoadEagerly(false);
            preloadedRef.current = false;
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, effectiveThumbnail, effectiveSmall]);

  // Use useLayoutEffect to check cache synchronously before paint
  // This prevents any flash by ensuring cached images are marked as loaded before render
  useLayoutEffect(() => {
    // Double-check cache synchronously before first paint
    if (!isLoaded) {
      const isInCache = globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail);
      if (isInCache) {
        const cachedUrl = globalLoadedImages.has(effectiveSmall) ? effectiveSmall : effectiveThumbnail;
        setCurrentSrc(cachedUrl);
        setIsLoaded(true);
        setSkipTransition(true);
      }
    }

    // If image element exists, force immediate visibility if cached
    if (imgRef.current) {
      const img = imgRef.current;
      const imgSrc = img.src || currentSrc;

      // Check if this image URL is in the global cache
      if (globalLoadedImages.has(imgSrc) || globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail)) {
        // Force immediate visibility - set before browser paints
        img.style.setProperty('opacity', '1', 'important');
        img.style.setProperty('transition', 'none', 'important');
        if (!isLoaded) {
          setIsLoaded(true);
          setSkipTransition(true);
        }
      }
    }
  }, [currentSrc, effectiveSmall, effectiveThumbnail, isLoaded]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (img.src) {
      globalLoadedImages.add(img.src);
      loadedSrcs.current.add(img.src);
    }
    setIsLoaded(true);
    if (onLoad) {
      onLoad(img);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsError(true);
    if (onError) {
      onError(e);
    }
  };

  // Effect for lazy loading using IntersectionObserver
  useEffect(() => {
    if (eager || isLoaded || isActuallyCached) {
      setShouldLoadEagerly(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadEagerly(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [eager, isLoaded, isActuallyCached]);

  // Determine which URLs to use for the picture element sources
  const getCurrentUrls = () => {
    const avifSrc = effectiveSmallAvif || effectiveThumbnailAvifFallback;
    const webpSrc = effectiveSmall !== effectiveThumbnail ? effectiveSmall : effectiveThumbnail;
    return { avifSrc, webpSrc };
  };

  const { avifSrc, webpSrc } = getCurrentUrls();

  return (
    <div
      ref={containerRef}
      className={`progressive-image-container ${className} ${isLoaded ? 'loaded' : 'loading'}`}
    >
      {!isLoaded && blurhash && (
        <Suspense fallback={<div className="progressive-image-blur" style={{ backgroundColor: '#f0f0f0' }} />}>
          <BlurhashPlaceholder
            hash={blurhash}
            isLoaded={isLoaded}
            className="progressive-image-blur"
          />
        </Suspense>
      )}

      <picture>
        {shouldLoadEagerly && (
          <>
            {avifSrc && <source type="image/avif" srcSet={avifSrc} />}
            {webpSrc && <source type="image/webp" srcSet={webpSrc} />}
          </>
        )}
        <img
          ref={setImgRef}
          src={shouldLoadEagerly ? webpSrc : finalCachedSrc}
          alt={alt}
          className={`progressive-image ${skipTransition ? 'skip-transition' : ''}`}
          style={{ opacity: isLoaded ? 1 : 0 }}
          onLoad={handleLoad}
          onError={handleError}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={fetchPriority}
          decoding="async"
        />
      </picture>

      {isError && <div className="progressive-image-error">Failed to load</div>}
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';

export default ProgressiveImage;