import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Image } from '@/types/image';
import { t } from '@/i18n';

interface ImageGridItemProps {
  image: Image;
  imageType: 'portrait' | 'landscape';
  aspectRatio?: number;
  eager?: boolean;
  onSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  isFadingOut?: boolean;
}

export const ImageGridItem = memo(({
  image,
  imageType,
  aspectRatio,
  eager = false,
  onSelect,
  onDownload,
  onImageLoad,
  currentImageIds,
  processedImages,
  isFadingOut = false,
}: ImageGridItemProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Calculate height based on aspect ratio for consistent sizing
  const calculatedHeight = aspectRatio ? `${100 / aspectRatio}%` : 'auto';

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setIsLoaded(true);
    onImageLoad(image._id, img);
  }, [image._id, onImageLoad]);

  const handleClick = useCallback(() => {
    onSelect(image);
  }, [image, onSelect]);

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload(image, e);
  }, [image, onDownload]);

  // Cleanup check
  useEffect(() => {
    if (!currentImageIds.has(image._id)) {
      processedImages.current.delete(image._id);
    }
  }, [currentImageIds, image._id, processedImages]);

  return (
    <div
      className={cn(
        'masonry-item',
        imageType,
        isFadingOut && 'fading-out'
      )}
      data-image-id={image._id}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${t('image.viewPhoto')}: ${image.imageTitle || t('image.untitled')}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(image);
        }
      }}
      style={{
        '--calculated-height': calculatedHeight,
      } as React.CSSProperties}
    >
      <div className="masonry-link">
        <div className="image-container">
          <img
            ref={imgRef}
            src={image.imageUrl}
            alt={image.imageTitle || 'Photo'}
            className="masonry-image"
            onLoad={handleImageLoad}
            loading={eager ? 'eager' : 'lazy'}
            style={{
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
            }}
          />
          {!isLoaded && (
            <div className="image-placeholder">
              <Eye size={24} />
            </div>
          )}
        </div>
        
        <div className="masonry-overlay">
          <div className="overlay-content">
            {image.imageTitle && (
              <div className="image-title-tooltip">
                {image.imageTitle}
              </div>
            )}
            
            {image.location && (
              <div className="image-location-badge">
                <Eye size={14} />
                <span className="location-text">{image.location}</span>
              </div>
            )}
            
            <div className="image-actions">
              <button
                className="image-action-btn download-btn"
                onClick={handleDownloadClick}
                title={t('image.download')}
                aria-label={t('image.download')}
              >
                <Download size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="masonry-item-actions-mobile">
        <button
          className="mobile-action-btn download-btn"
          onClick={handleDownloadClick}
          title={t('image.download')}
          aria-label={t('image.download')}
        >
          <Download size={20} />
        </button>
      </div>
    </div>
  );
});

ImageGridItem.displayName = 'ImageGridItem';
