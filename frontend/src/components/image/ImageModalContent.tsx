import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Image } from '@/types/image';
import type { UseImageZoomReturn } from './hooks/useImageZoom';
import {
  getImageClassName,
  getModalImageStyles,
  MODAL_IMAGE
} from './imageModalUtils';
import { t } from '@/i18n';

interface ImageModalContentProps {
  image: Image;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  modalImageSrc: string | null;
  modalPlaceholderSrc: string | null;
  isModalImageLoaded: boolean;
  setIsModalImageLoaded: (loaded: boolean) => void;
  zoomProps: UseImageZoomReturn;
  wasCachedInitially: boolean;
  isMobile?: boolean;
  renderAsPage?: boolean;
}

export const ImageModalContent = ({
  image,
  imageTypes,
  modalImageSrc,
  modalPlaceholderSrc,
  isModalImageLoaded: _isModalImageLoaded,
  setIsModalImageLoaded,
  zoomProps,
  wasCachedInitially: _wasCachedInitially,
  isMobile = false,
  renderAsPage = false,
}: ImageModalContentProps) => {
  // Use modalImageSrc if available, otherwise fallback to image URLs
  const derivePlaceholder = (img: Image) =>
    img.thumbnailUrl ||
    img.smallUrl ||
    img.regularUrl ||
    img.imageUrl ||
    '';
  const deriveFull = (img: Image) =>
    img.regularUrl || img.imageUrl || img.smallUrl || '';

  // Use props from parent if available, otherwise derive from image
  const getPlaceholder = () => modalPlaceholderSrc || derivePlaceholder(image);
  const getFull = () => modalImageSrc || deriveFull(image);

  // Initialize with any available URL - prioritize props, then image URLs
  // Directly use image properties to avoid closure issues
  const initializeSrc = () => {
    const placeholder = modalPlaceholderSrc || derivePlaceholder(image);
    const full = modalImageSrc || deriveFull(image);
    return placeholder || full || image.imageUrl || '';
  };

  const [displayedSrc, setDisplayedSrc] = useState(initializeSrc);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState(() => 
    modalPlaceholderSrc || derivePlaceholder(image)
  );
  const [frontImage, setFrontImage] = useState<{
    id: string;
    src: string;
    placeholder: string;
  } | null>(null);
  const [frontLoaded, setFrontLoaded] = useState(false);

  // Compute values once
  const imageType = (imageTypes.get(image._id) ?? 'landscape') as 'portrait' | 'landscape';

  const {
    zoom,
    pan,
    isZoomed,
    containerRef: zoomContainerRef,
    imageRef: zoomImageRef,
    zoomIn,
    zoomOut,
    resetZoom,
    handleDoubleClick,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = zoomProps;

  // Track previous image to detect changes and reset loaded state
  const prevImageIdRef = useRef<string | null>(null);

  // Track previous props to detect changes
  const prevModalImageSrcRef = useRef<string | null>(null);
  const prevModalPlaceholderSrcRef = useRef<string | null>(null);

  // Reset loaded state when image changes to prevent showing old image
  useEffect(() => {
    const imageChanged = prevImageIdRef.current !== image._id;
    const propsChanged = 
      prevModalImageSrcRef.current !== modalImageSrc ||
      prevModalPlaceholderSrcRef.current !== modalPlaceholderSrc;
    
    const nextSrc = getFull();
    const nextPlaceholder = getPlaceholder();
    
    // Always ensure we have a valid src - try all possible sources
    const finalSrc = nextPlaceholder || nextSrc || image.regularUrl || image.imageUrl || image.smallUrl || '';
    
    if (imageChanged) {
      prevImageIdRef.current = image._id;
      prevModalImageSrcRef.current = modalImageSrc;
      prevModalPlaceholderSrcRef.current = modalPlaceholderSrc;
      setIsModalImageLoaded(false);
      
      // Always set displayed src - use placeholder first, then full, then fallback
      // Ensure we always have a src, even if it's empty (will be handled by fallback in img src)
      setDisplayedSrc(finalSrc);
      setDisplayedPlaceholder(nextPlaceholder);
      
      // If we have both placeholder and full image, and they're different, load full in front
      if (nextSrc && nextPlaceholder && nextSrc !== nextPlaceholder && nextSrc !== finalSrc) {
        setFrontLoaded(false);
        setFrontImage({
          id: image._id,
          src: nextSrc,
          placeholder: nextPlaceholder,
        });
      }
    } else if (propsChanged && finalSrc) {
      // Image didn't change, but props might have (e.g., modalImageSrc became available)
      // Update displayed src if props changed and we have a new valid URL
      prevModalImageSrcRef.current = modalImageSrc;
      prevModalPlaceholderSrcRef.current = modalPlaceholderSrc;
      
      setDisplayedSrc(finalSrc);
      setDisplayedPlaceholder(nextPlaceholder);
      if (nextSrc && nextPlaceholder && nextSrc !== nextPlaceholder && nextSrc !== finalSrc) {
        setFrontLoaded(false);
        setFrontImage({
          id: image._id,
          src: nextSrc,
          placeholder: nextPlaceholder,
        });
      }
    }
  }, [image._id, image.imageUrl, image.regularUrl, image.smallUrl, modalImageSrc, modalPlaceholderSrc, setIsModalImageLoaded]);

  // Shared image load handler
  const handleFrontImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFrontLoaded(true);
    setIsModalImageLoaded(true);
    // Update class if orientation was misdetected
    const img = e.currentTarget;
    const isPortraitImg = img.naturalHeight > img.naturalWidth;
    const shouldBePortrait = isPortraitImg;
    if (shouldBePortrait !== (imageType === 'portrait')) {
      img.classList.toggle('landscape', !shouldBePortrait);
      img.classList.toggle('portrait', shouldBePortrait);
    }
  };

  // When a front image finishes loading, promote it to displayed
  useEffect(() => {
    if (frontImage && frontLoaded) {
      setDisplayedSrc(frontImage.src);
      setDisplayedPlaceholder(frontImage.placeholder);
      setFrontImage(null);
      setFrontLoaded(false);
    }
  }, [frontImage, frontLoaded]);

  return (
    <div
      className="modal-main-image-container"
      ref={zoomContainerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: isZoomed ? (zoom > 1 ? 'grab' : 'default') : 'zoom-in',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div
        className="modal-image-wrapper modal-image-stack"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'none',
        }}
      >
        {/* Back layer: last displayed image */}
        <img
          ref={zoomImageRef}
          src={
            displayedSrc || 
            modalImageSrc || 
            modalPlaceholderSrc || 
            image.regularUrl || 
            image.imageUrl || 
            image.smallUrl || 
            image.thumbnailUrl || 
            ''
          }
          alt={image.imageTitle ?? 'Photo'}
          style={getModalImageStyles(displayedPlaceholder, isMobile && renderAsPage)}
          className={`${getImageClassName(true, imageType)} modal-image-back`}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          crossOrigin="anonymous"
          onDoubleClick={handleDoubleClick}
          draggable={false}
          onLoad={() => setIsModalImageLoaded(true)}
          onError={(e) => {
            // Try to fallback to a different URL if available
            const currentSrc = displayedSrc || image.imageUrl || image.regularUrl || image.smallUrl || '';
            const fallback = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl || '';
            if (fallback && fallback !== currentSrc) {
              setDisplayedSrc(fallback);
            }
          }}
        />

        {/* Front layer: new image being loaded */}
        {frontImage && (
          <img
            key={frontImage.id}
            src={frontImage.src}
            alt={image.imageTitle ?? 'Photo'}
            style={{
              ...getModalImageStyles(frontImage.placeholder, isMobile && renderAsPage),
              opacity: frontLoaded ? 1 : 0,
              transition: 'opacity 0.18s ease-out',
            }}
            className={`${getImageClassName(frontLoaded, imageType)} modal-image-front`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            crossOrigin="anonymous"
            onDoubleClick={handleDoubleClick}
            draggable={false}
            onLoad={handleFrontImageLoad}
          />
        )}
      </div>

      {/* Zoom Controls */}
      {isZoomed && (
        <div className="modal-zoom-controls">
          <button
            className="modal-zoom-btn"
            onClick={zoomOut}
            title={t('zoom.out')}
            aria-label={t('zoom.out')}
          >
            <ZoomOut size={MODAL_IMAGE.ZOOM_ICON_SIZE} />
          </button>
          <span className="modal-zoom-level">
            {Math.round(zoom * MODAL_IMAGE.ZOOM_PERCENTAGE_MULTIPLIER)}%
          </span>
          <button
            className="modal-zoom-btn"
            onClick={zoomIn}
            disabled={zoom >= MODAL_IMAGE.MAX_ZOOM}
            title={t('zoom.in')}
            aria-label={t('zoom.in')}
          >
            <ZoomIn size={MODAL_IMAGE.ZOOM_ICON_SIZE} />
          </button>
          <button
            className="modal-zoom-btn"
            onClick={resetZoom}
            title={t('zoom.reset')}
            aria-label={t('zoom.reset')}
          >
            <RotateCcw size={MODAL_IMAGE.ZOOM_ICON_SIZE} />
          </button>
        </div>
      )}
    </div>
  );
};

