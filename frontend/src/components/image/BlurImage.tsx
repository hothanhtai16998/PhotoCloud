
import { useState, useCallback, useEffect } from 'react';
import ImageSkeleton from './ImageSkeleton';
import './BlurImage.css';

interface BlurImageProps {
  src: string;
  blurSrc?: string;
  alt: string;
  loading?: 'eager' | 'lazy';
  showSkeleton?: boolean;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: (error: Error) => void;
}

export const BlurImage = ({
  src,
  blurSrc,
  alt,
  loading = 'lazy',
  showSkeleton = true,
  onLoad,
  onError,
}: BlurImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isLoading = !isLoaded && !hasError;

  // Handle actual image load
  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setIsLoaded(true);
    onLoad?.(img);
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`Image failed to load: ${src}`, e);
    setHasError(true);
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  }, [src, onError]);

  // Validate URLs
  useEffect(() => {
    if (!src) {
      console.warn('BlurImage: No src provided');
      setHasError(true);
    }
  }, [src]);

  return (
    <div className="blur-image-container">
      {/* Skeleton loader while loading */}
      {isLoading && showSkeleton && (
        <ImageSkeleton className="blur-image-skeleton" />
      )}

      {/* Blur/placeholder image */}
      {blurSrc && !isLoaded && (
        <img
          src={blurSrc}
          alt={`${alt} (blurred)`}
          className="blur-image-placeholder"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`blur-image-main ${isLoaded ? 'loaded' : ''} ${hasError ? 'error' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
      />

      {/* Error state */}
      {hasError && (
        <div className="blur-image-error" role="alert">
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default BlurImage;
