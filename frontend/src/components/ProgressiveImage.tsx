import { useEffect, useRef, useReducer, memo, useMemo } from 'react';
import { LRUSet } from '@/utils/lruCache';
import './ProgressiveImage.css';

interface ProgressiveImageProps {
  src: string;
  thumbnailUrl?: string;
  smallUrl?: string;
  regularUrl?: string;
  thumbnailAvifUrl?: string;
  smallAvifUrl?: string;
  regularAvifUrl?: string;
  imageAvifUrl?: string;
  alt: string;
  className?: string;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  eager?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
}

type ImageState = {
  currentSrc: string;
  isLoaded: boolean;
  skipTransition: boolean;
  isError: boolean;
};

type ImageAction =
  | { type: 'LOAD_START'; src: string }
  | { type: 'LOAD_SUCCESS'; src: string; skipTransition?: boolean }
  | { type: 'LOAD_ERROR' }
  | { type: 'UPGRADE_SRC'; src: string };

const imageReducer = (state: ImageState, action: ImageAction): ImageState => {
  switch (action.type) {
    case 'LOAD_START':
      return { currentSrc: action.src, isLoaded: false, skipTransition: false, isError: false };
    case 'LOAD_SUCCESS':
      return { currentSrc: action.src, isLoaded: true, skipTransition: action.skipTransition ?? false, isError: false };
    case 'LOAD_ERROR':
      return { ...state, isError: true, isLoaded: true };
    case 'UPGRADE_SRC':
      return { ...state, currentSrc: action.src };
    default:
      return state;
  }
};

const globalLoadedImages = new LRUSet(500);
const getFallbackUrl = (imageUrl: string): string => imageUrl;
const checkImageCache = (url: string): boolean => globalLoadedImages.has(url);

/**
 * Check if image is in browser cache synchronously
 */
const checkBrowserCache = (url: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const testImg = new Image();
    testImg.src = url;
    if (testImg.complete && testImg.naturalWidth > 0) {
      globalLoadedImages.add(url);
      return true;
    }
  } catch {
    // Ignore errors
  }
  return false;
};

/**
 * Get adaptive rootMargin based on connection speed
 */
const getAdaptiveRootMargin = (): string => {
  if (typeof navigator === 'undefined') return '300px';

  interface NavigatorWithConnection extends Navigator {
    connection?: { effectiveType?: string };
    mozConnection?: { effectiveType?: string };
    webkitConnection?: { effectiveType?: string };
  }

  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  return isSlowConnection ? '100px' : '300px';
};

const preloadImage = (url: string, onSuccess: () => void, onFail: () => void): (() => void) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { globalLoadedImages.add(url); onSuccess(); };
  img.onerror = onFail;
  img.src = url;
  return () => { img.onload = null; img.onerror = null; img.src = ''; };
};

const ProgressiveImage = memo(({
  src, thumbnailUrl, smallUrl, regularUrl, thumbnailAvifUrl, smallAvifUrl, regularAvifUrl, imageAvifUrl,
  alt, className = '', onLoad, onError, eager = false, fetchPriority = 'auto',
}: ProgressiveImageProps) => {
  const effectiveThumbnail = thumbnailUrl || getFallbackUrl(src);
  const effectiveSmall = smallUrl || getFallbackUrl(src);
  const effectiveRegular = regularUrl || src;
  const effectiveThumbnailAvif = thumbnailAvifUrl || null;
  const effectiveSmallAvif = smallAvifUrl || null;
  const effectiveRegularAvif = regularAvifUrl || null;
  const effectiveOriginalAvif = imageAvifUrl || null;
  const effectiveThumbnailAvifFallback = thumbnailAvifUrl || effectiveThumbnail;
  const effectiveSmallAvifFallback = smallAvifUrl || effectiveSmall;
  const effectiveOriginalAvifFallback = imageAvifUrl || src;
  const isGif = src?.toLowerCase().endsWith('.gif');

  const initialState = useMemo((): ImageState => {
    const targetUrl = isGif ? effectiveSmall : effectiveSmall;
    // Check global cache first, then browser cache as fallback
    let isCached = checkImageCache(targetUrl) || checkImageCache(effectiveThumbnail);

    // Also check browser cache synchronously to prevent flash
    if (!isCached) {
      isCached = checkBrowserCache(targetUrl) || checkBrowserCache(effectiveThumbnail);
    }

    return { currentSrc: isCached ? targetUrl : effectiveThumbnail, isLoaded: isCached, skipTransition: isCached, isError: false };
  }, [effectiveThumbnail, effectiveSmall, isGif]);

  const [state, dispatch] = useReducer(imageReducer, initialState);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const loadedSrcsRef = useRef<Set<string>>(new Set()); // Local tracking for this component instance

  useEffect(() => {
    if (isGif) {
      const gifUrl = effectiveSmall;
      // Check if this exact GIF is already loaded/cached
      if (!checkImageCache(gifUrl) && !loadedSrcsRef.current.has(gifUrl)) {
        dispatch({ type: 'LOAD_START', src: gifUrl });
      } else {
        // GIF is cached, show it immediately without transition
        dispatch({ type: 'LOAD_SUCCESS', src: gifUrl, skipTransition: true });
      }
      return;
    }
    const isCached = checkImageCache(effectiveSmall) || loadedSrcsRef.current.has(effectiveSmall);
    if (isCached) {
      dispatch({ type: 'LOAD_SUCCESS', src: effectiveSmall, skipTransition: true });
    } else {
      // Check if thumbnail is at least cached to prevent flash
      const thumbnailCached = checkImageCache(effectiveThumbnail) || loadedSrcsRef.current.has(effectiveThumbnail);
      if (thumbnailCached) {
        dispatch({ type: 'LOAD_SUCCESS', src: effectiveThumbnail, skipTransition: true });
      } else {
        dispatch({ type: 'LOAD_START', src: effectiveThumbnail });
      }
    }
  }, [src, effectiveThumbnail, effectiveSmall, isGif]);

  useEffect(() => {
    if (!containerRef.current || state.isLoaded) return;

    // Use adaptive rootMargin based on connection speed
    const rootMargin = eager ? '0px' : getAdaptiveRootMargin();

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const targetUrl = isGif ? effectiveSmall : effectiveSmall;
          if (cleanupRef.current) cleanupRef.current();
          cleanupRef.current = preloadImage(
            targetUrl,
            () => {
              loadedSrcsRef.current.add(targetUrl);
              dispatch({ type: 'LOAD_SUCCESS', src: targetUrl, skipTransition: false });
              if (onLoad && imgRef.current) onLoad(imgRef.current);
            },
            () => { dispatch({ type: 'LOAD_ERROR' }); }
          );
          observer.disconnect();
        }
      });
    };
    const observer = new IntersectionObserver(handleIntersection, { rootMargin });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); if (cleanupRef.current) cleanupRef.current(); };
  }, [effectiveSmall, isGif, eager, onLoad, state.isLoaded]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const loadedSrc = img.src;

    // Add to both local and global cache
    loadedSrcsRef.current.add(loadedSrc);
    globalLoadedImages.add(loadedSrc);

    if (loadedSrc === effectiveThumbnail && effectiveSmall !== effectiveThumbnail) {
      // Check both local and global cache
      if (!loadedSrcsRef.current.has(effectiveSmall) && !checkImageCache(effectiveSmall)) {
        if (cleanupRef.current) cleanupRef.current();
        cleanupRef.current = preloadImage(effectiveSmall,
          () => {
            loadedSrcsRef.current.add(effectiveSmall);
            dispatch({ type: 'UPGRADE_SRC', src: effectiveSmall });
            dispatch({ type: 'LOAD_SUCCESS', src: effectiveSmall, skipTransition: false });
            if (onLoad && imgRef.current) onLoad(imgRef.current);
          },
          () => { dispatch({ type: 'LOAD_SUCCESS', src: effectiveThumbnail, skipTransition: false }); }
        );
      } else {
        // Small version is cached, upgrade immediately without transition
        dispatch({ type: 'LOAD_SUCCESS', src: effectiveSmall, skipTransition: true });
        if (onLoad && imgRef.current) onLoad(imgRef.current);
      }
    } else {
      dispatch({ type: 'LOAD_SUCCESS', src: loadedSrc, skipTransition: false });
      if (onLoad) onLoad(img);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    dispatch({ type: 'LOAD_ERROR' });
    if (onError) onError(e);
  };

  const generateSrcSet = (thumbnail: string | null, small: string | null, regular: string | null, original: string | null) => {
    const srcsetParts: string[] = [];
    if (thumbnail) srcsetParts.push(`${thumbnail} 200w`);
    if (small && small !== thumbnail) srcsetParts.push(`${small} 800w`);
    if (regular && regular !== small && regular !== thumbnail) srcsetParts.push(`${regular} 1080w`);
    if (original && original !== regular && original !== small && original !== thumbnail) srcsetParts.push(`${original} 1920w`);
    return srcsetParts.length > 0 ? srcsetParts.join(', ') : null;
  };

  const avifSrcSet = generateSrcSet(effectiveThumbnailAvif, effectiveSmallAvif, effectiveRegularAvif, effectiveOriginalAvif);
  const webpSrcSet = generateSrcSet(effectiveThumbnail, effectiveSmall, effectiveRegular, src);

  const getCurrentUrls = () => {
    if (state.currentSrc === effectiveSmall) return { avif: effectiveSmallAvifFallback, webp: effectiveSmall };
    else if (state.currentSrc === effectiveThumbnail) return { avif: effectiveThumbnailAvifFallback, webp: effectiveThumbnail };
    else return { avif: effectiveOriginalAvifFallback, webp: state.currentSrc };
  };

  const { webp: currentWebpUrl } = getCurrentUrls();
  const hasAvif = thumbnailAvifUrl || smallAvifUrl || regularAvifUrl || imageAvifUrl;
  const sizes = className?.includes('modal') || className?.includes('detail') || className?.includes('full')
    ? '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1080px'
    : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px';
  const finalClassName = `progressive-image ${state.isLoaded ? 'loaded' : 'loading'} ${state.isError ? 'error' : ''} ${state.skipTransition ? 'no-transition' : ''}`;

  return (
    <div ref={containerRef} className={`progressive-image-wrapper ${className}`}>
      {isGif ? (
        <img ref={imgRef} src={state.currentSrc} alt={alt} className={finalClassName} onLoad={handleLoad} onError={handleError}
          loading={eager || state.isLoaded ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : fetchPriority}
          style={state.skipTransition ? { opacity: 1, transition: 'none' } : state.isLoaded ? { opacity: 1 } : undefined} />
      ) : hasAvif ? (
        <picture>
          {avifSrcSet && <source srcSet={avifSrcSet} sizes={sizes} type="image/avif" />}
          {webpSrcSet && <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />}
          <img ref={imgRef} src={currentWebpUrl} srcSet={webpSrcSet || undefined} sizes={webpSrcSet ? sizes : undefined} alt={alt}
            className={finalClassName} onLoad={handleLoad} onError={handleError} loading={eager || state.isLoaded ? 'eager' : 'lazy'}
            decoding="async" fetchPriority={eager ? 'high' : fetchPriority}
            style={state.skipTransition ? { opacity: 1, transition: 'none' } : state.isLoaded ? { opacity: 1 } : undefined} />
        </picture>
      ) : (
        <img ref={imgRef} src={state.currentSrc} srcSet={webpSrcSet || undefined} sizes={webpSrcSet ? sizes : undefined} alt={alt}
          className={finalClassName} onLoad={handleLoad} onError={handleError} loading={eager || state.isLoaded ? 'eager' : 'lazy'}
          decoding="async" fetchPriority={eager ? 'high' : fetchPriority}
          style={state.skipTransition ? { opacity: 1, transition: 'none' } : state.isLoaded ? { opacity: 1 } : undefined} />
      )}
      {effectiveThumbnail && !state.skipTransition && (
        <div className={`progressive-image-blur ${state.isLoaded ? 'fade-out' : ''}`} style={{ backgroundImage: `url(${effectiveThumbnail})` }} />
      )}
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';
export default ProgressiveImage;
