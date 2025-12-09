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
  modalImageSrc: _modalImageSrc,
  modalPlaceholderSrc: _modalPlaceholderSrc,
  isModalImageLoaded: _isModalImageLoaded,
  setIsModalImageLoaded,
  zoomProps,
  wasCachedInitially: _wasCachedInitially,
  isMobile = false,
  renderAsPage = false,
}: ImageModalContentProps) => {
  // Use modalImageSrc if available, otherwise fallback to image URLs
  // const imageSrc = modalImageSrc || image.regularUrl || image.imageUrl || image.smallUrl || '';
  const derivePlaceholder = (img: Image) =>
    img.thumbnailUrl ||
    img.smallUrl ||
    img.regularUrl ||
    img.imageUrl ||
    '';
  const deriveFull = (img: Image) =>
    img.regularUrl || img.imageUrl || img.smallUrl || '';

  const [displayedSrc, setDisplayedSrc] = useState(() => {
    const placeholder = derivePlaceholder(image);
    return placeholder || deriveFull(image);
  });
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState(() => derivePlaceholder(image));
  const [frontImage, setFrontImage] = useState<{
    id: string;
    src: string;
    placeholder: string;
  } | null>(null);
  const [frontLoaded, setFrontLoaded] = useState(false);

  // Compute values once
  const imageType = (imageTypes.get(image._id) ?? 'landscape') as 'portrait' | 'landscape';
  // const imageStyles = useMemo(() => getModalImageStyles(modalPlaceholderSrc), [modalPlaceholderSrc]);
  // const imageClassName = getImageClassName(isModalImageLoaded, imageType);

  // Generate srcSets (commented out - unused)
  // const avifSrcSet = useMemo(
  //   () => generateModalSrcSet(
  //     image.thumbnailAvifUrl,
  //     image.smallAvifUrl,
  //     image.regularAvifUrl,
  //     image.imageAvifUrl
  //   ),
  //   [image.thumbnailAvifUrl, image.smallAvifUrl, image.regularAvifUrl, image.imageAvifUrl]
  // );

  // const webpSrcSet = useMemo(
  //   () => generateModalSrcSet(
  //     image.thumbnailUrl,
  //     image.smallUrl,
  //     image.regularUrl,
  //     image.imageUrl
  //   ),
  //   [image.thumbnailUrl, image.smallUrl, image.regularUrl, image.imageUrl]
  // );

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

  // Reset loaded state when image changes to prevent showing old image
  useEffect(() => {
    const imageChanged = prevImageIdRef.current !== image._id;
    if (imageChanged) {
      prevImageIdRef.current = image._id;
      setIsModalImageLoaded(false);
      const nextSrc = deriveFull(image);
      const nextPlaceholder = derivePlaceholder(image);
      setDisplayedSrc(nextPlaceholder || nextSrc);
      setDisplayedPlaceholder(nextPlaceholder);
      if (nextSrc && nextSrc !== displayedSrc) {
        setFrontLoaded(false);
        setFrontImage({
          id: image._id,
          src: nextSrc,
          placeholder: nextPlaceholder,
        });
      } else {
        // If same src, just keep as loaded.
        setIsModalImageLoaded(true);
      }
    };
  }, [image, displayedSrc, setIsModalImageLoaded]);

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
          src={displayedSrc}
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

