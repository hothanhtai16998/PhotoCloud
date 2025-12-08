import { useEffect, useState, useRef } from 'react';
import type { Image } from '@/types/image';
import EditImageModal from './EditImageModal';
import CollectionModal from './CollectionModal';
import { useImageModal } from './image/hooks/useImageModal';
import { useImageZoom } from './image/hooks/useImageZoom';
import { useImageModalActions } from './image/hooks/useImageModalActions';
import { useRelatedImages } from './image/hooks/useRelatedImages';
import { useScrollLock } from '@/hooks/useScrollLock';
import { ImageModalHeader } from './image/ImageModalHeader';
import { ImageModalContent } from './image/ImageModalContent';
import { ImageModalSidebar } from './image/ImageModalSidebar';
import { ImageModalRelated } from './image/ImageModalRelated';
import { useUserStore } from '@/stores/useUserStore';
import { appConfig } from '@/config/appConfig';
import './ImageModal.css';

// Scroll detection thresholds
const HEADER_HIDE_THRESHOLD_PX = 20;
const MIN_SCROLL_BEFORE_HIDE_PX = 50;
const RELATED_IMAGES_CHECK_DELAY_MS = 300;
const RELATED_IMAGES_RETRY_DELAY_MS = 100;
const RESIZE_DEBOUNCE_MS = 150;

interface ImageModalProps {
  image: Image;
  images: Image[];
  onClose: () => void;
  onImageSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  renderAsPage?: boolean; // When true, renders as page (no overlay)
  lockBodyScroll?: boolean; // Allow caller to disable body scroll lock
}

const ImageModal = ({
  image,
  images,
  onClose,
  onImageSelect,
  onDownload,
  imageTypes,
  onImageLoad,
  currentImageIds,
  processedImages,
  renderAsPage = false,
  lockBodyScroll = true,
}: ImageModalProps) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const { user } = useUserStore();

  // Detect mobile to show author banner on mobile regardless of renderAsPage
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= appConfig.mobileBreakpoint;
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Image zoom functionality
  const zoomProps = useImageZoom({
    minZoom: 1,
    maxZoom: 5,
    zoomStep: 0.25,
    doubleClickZoom: 2,
  });

  // Reset zoom when image changes
  useEffect(() => {
    zoomProps.resetZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id]);

  // Actions hook
  const {
    showEditModal,
    showCollectionModal,
    handleDownloadWithSize,
    handleEdit,
    handleEditClose,
    handleEditUpdate,
    handleOpenCollection,
    handleCollectionClose,
    handleViewProfile,
  } = useImageModalActions({
    image,
    onImageSelect,
    onClose,
  });

  // Use the custom hook for modal state and logic
  const {
    views,
    downloads,
    isFavorited,
    isTogglingFavorite,
    modalPlaceholderSrc,
    modalImageSrc,
    isModalImageLoaded,
    setIsModalImageLoaded,
    wasCachedInitial,
    handleToggleFavorite,
  } = useImageModal({
    image,
    images,
    onImageSelect,
    onClose,
    onDownload,
    onDownloadWithSize: handleDownloadWithSize,
  });

  // Related images hook
  const {
    relatedImages,
    hasMoreRelatedImages,
    isLoadingRelatedImages,
    loadMoreRef: relatedImagesLoadMoreRef,
  } = useRelatedImages({
    image,
    images,
    modalContentRef,
  });

  // Track if banner should be hidden when related images reaches banner position
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const relatedImagesRef = useRef<HTMLDivElement>(null);

  // Detect when related images section reaches the banner position (top of scroll container)
  useEffect(() => {
    if (!renderAsPage || !modalContentRef.current) return;

    const scrollContainer = modalContentRef.current;
    let relatedImagesElement: HTMLDivElement | null = null;
    let isMounted = true;

    const handleScroll = () => {
      if (!scrollContainer) return;

      // Get the related images element
      if (!relatedImagesElement) {
        relatedImagesElement = relatedImagesRef.current;
        if (!relatedImagesElement) return;
      }

      // Get positions relative to the scroll container
      const containerRect = scrollContainer.getBoundingClientRect();
      const relatedRect = relatedImagesElement.getBoundingClientRect();

      // Calculate position of related images relative to the top of the scroll container viewport
      const relatedTopRelativeToContainer = relatedRect.top - containerRect.top;

      // Hide when related images section reaches the sticky header position
      const shouldHide = relatedTopRelativeToContainer <= HEADER_HIDE_THRESHOLD_PX &&
        scrollContainer.scrollTop > MIN_SCROLL_BEFORE_HIDE_PX;

      setIsHeaderHidden(shouldHide);
    };

    // Wait for related images to be rendered with cleanup
    const checkAndSetup = () => {
      if (!isMounted) return;

      relatedImagesElement = relatedImagesRef.current;
      if (relatedImagesElement) {
        // Set up scroll listener
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        // Initial check - ensure header is visible on load
        setIsHeaderHidden(false);
        handleScroll();
      } else {
        // Retry after a short delay if still mounted
        setTimeout(checkAndSetup, RELATED_IMAGES_RETRY_DELAY_MS);
      }
    };

    const timeoutId = setTimeout(checkAndSetup, RELATED_IMAGES_CHECK_DELAY_MS);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [renderAsPage, relatedImages.length]);

  // Handle wheel events to redirect scroll to content
  const handleModalWheel = (e: React.WheelEvent) => {
    // Prevent scroll events from bubbling to body
    if (renderAsPage) return;

    e.stopPropagation();
    // If scrolling on modal (not content), redirect to content
    const target = e.target as HTMLElement;
    if (!target.closest('.image-modal-content')) {
      e.preventDefault();
      const modalContent = modalContentRef.current;
      if (modalContent) {
        modalContent.scrollTop += e.deltaY;
      }
    }
  };

  // Add zoom keyboard shortcuts
  const { zoom, isZoomed, zoomIn, zoomOut, resetZoom } = zoomProps;
  useEffect(() => {
    if (!isZoomed && zoom === 1) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [zoom, isZoomed, zoomIn, zoomOut, resetZoom]);

  // Lock body scroll when modal is open (only when rendered as modal, not page and when enabled)
  useScrollLock(lockBodyScroll && !renderAsPage, '.image-modal-content');

  // Avoid initial flash: only show overlay/container when we have at least a placeholder
  const isVisualReady = !!(modalPlaceholderSrc || modalImageSrc);

  return (
    <>
      {!renderAsPage && isVisualReady && (
        <div
          className="image-modal-overlay"
          onClick={onClose}
        />
      )}
      <div
        className={`image-modal ${renderAsPage ? 'image-modal-page' : ''}`}
        aria-hidden={!isVisualReady && !renderAsPage ? true : undefined}
        onClick={(e) => !renderAsPage && e.stopPropagation()}
        onWheel={handleModalWheel}
      >
        {/* Modal Header */}
        <ImageModalHeader
          image={image}
          user={user}
          isMobile={isMobile}
          renderAsPage={renderAsPage}
          isFavorited={isFavorited}
          handleToggleFavorite={handleToggleFavorite}
          handleDownloadWithSize={handleDownloadWithSize}
          handleViewProfile={handleViewProfile}
          handleOpenCollection={handleOpenCollection}
          onClose={onClose}
          modalContentRef={modalContentRef}
          onImageSelect={onImageSelect}
          isHeaderHidden={isHeaderHidden}
        />

        {/* Modal Image Content - Scrollable */}
        <div
          className="image-modal-content"
          ref={modalContentRef}
        >
          {/* Main Image with Zoom */}
          <ImageModalContent
            image={image}
            imageTypes={imageTypes}
            modalImageSrc={modalImageSrc}
            modalPlaceholderSrc={modalPlaceholderSrc}
            isModalImageLoaded={isModalImageLoaded}
            setIsModalImageLoaded={setIsModalImageLoaded}
            wasCachedInitially={wasCachedInitial}
            zoomProps={zoomProps}
          />

          {/* Modal Footer / Sidebar */}
          <ImageModalSidebar
            image={image}
            views={views}
            downloads={downloads}
            isFavorited={isFavorited}
            isTogglingFavorite={isTogglingFavorite}
            user={user}
            handleToggleFavorite={handleToggleFavorite}
            handleOpenCollection={handleOpenCollection}
            handleEdit={handleEdit}
            onClose={onClose}
          />

          {/* Related Images Section */}
          <div ref={relatedImagesRef}>
            <ImageModalRelated
              relatedImages={relatedImages}
              hasMoreRelatedImages={hasMoreRelatedImages}
              isLoadingRelatedImages={isLoadingRelatedImages}
              imageTypes={imageTypes}
              currentImageIds={currentImageIds}
              processedImages={processedImages}
              onImageSelect={onImageSelect}
              onImageLoad={onImageLoad}
              modalContentRef={modalContentRef}
              loadMoreRef={relatedImagesLoadMoreRef}
            />
          </div>
        </div>
      </div>

      {/* Edit Image Modal */}
      <EditImageModal
        image={image}
        isOpen={showEditModal}
        onClose={handleEditClose}
        onUpdate={handleEditUpdate}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={handleCollectionClose}
        imageId={image._id}
        onCollectionUpdate={undefined}
      />
    </>
  );
};

export default ImageModal;
