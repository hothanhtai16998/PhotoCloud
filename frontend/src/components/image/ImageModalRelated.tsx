import { useCallback, useMemo } from 'react';
import { ImageOff } from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from '../ProgressiveImage';
import { ICON_SIZE } from './imageModalUtils';
import { t } from '@/i18n';

interface ImageModalRelatedProps {
  relatedImages: Image[];
  hasMoreRelatedImages: boolean;
  isLoadingRelatedImages: boolean;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  onImageSelect: (image: Image) => void;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  modalContentRef: React.RefObject<HTMLDivElement | null>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

export const ImageModalRelated = ({
  relatedImages,
  hasMoreRelatedImages,
  isLoadingRelatedImages,
  imageTypes,
  currentImageIds,
  processedImages,
  onImageSelect,
  onImageLoad,
  modalContentRef,
  loadMoreRef,
}: ImageModalRelatedProps) => {
  // Memoized click handler for performance
  const handleImageClick = useCallback((relatedImage: Image) => {
    onImageSelect(relatedImage);
    // Scroll to top instantly to show the new image (like Unsplash)
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [onImageSelect, modalContentRef]);

  // Extract and memoize image load handler
  const handleRelatedImageLoad = useCallback(
    (imageId: string, img: HTMLImageElement) => {
      const shouldProcess = !processedImages.current.has(imageId) && currentImageIds.has(imageId);
      if (shouldProcess) {
        onImageLoad(imageId, img);
      }
    },
    [processedImages, currentImageIds, onImageLoad]
  );

  // Memoize empty state to avoid re-renders
  const emptyState = useMemo(
    () => (
      <div className="related-images-empty">
        <div className="related-images-empty-icon">
          <ImageOff size={ICON_SIZE.XLARGE} />
        </div>
        <p className="related-images-empty-text">{t('image.noRelatedImages')}</p>
      </div>
    ),
    []
  );

  return (
    <div className="modal-related-images">
      <h3 className="related-images-title">
        {t('image.relatedImages')}
        {relatedImages.length > 0 && ` (${relatedImages.length})`}
      </h3>
      {relatedImages.length > 0 ? (
        <>
          <div className="related-images-grid">
            {relatedImages.map((relatedImage) => {
              const imageType = imageTypes.get(relatedImage._id) ?? 'landscape';
              return (
                <div
                  key={relatedImage._id}
                  className={`related-image-item ${imageType}`}
                  onClick={() => handleImageClick(relatedImage)}
                >
                  <ProgressiveImage
                    src={relatedImage.imageUrl}
                    thumbnailUrl={relatedImage.thumbnailUrl}
                    smallUrl={relatedImage.smallUrl}
                    regularUrl={relatedImage.regularUrl}
                    alt={relatedImage.imageTitle ?? 'Photo'}
                    onLoad={(img) => handleRelatedImageLoad(relatedImage._id, img)}
                  />
                  <div className="related-image-overlay">
                    <span className="related-image-title">{relatedImage.imageTitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Infinite scroll trigger for related images */}
          {hasMoreRelatedImages && (
            <div ref={loadMoreRef} className="related-images-load-more-trigger" />
          )}
          {isLoadingRelatedImages && (
            <div className="related-images-loading">
              <div className="loading-spinner" />
              <p>{t('common.loading')}</p>
            </div>
          )}
        </>
      ) : (
        emptyState
      )}
    </div>
  );
};

