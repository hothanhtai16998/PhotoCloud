import { useCallback, useMemo, useRef, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Image } from '@/types/image';
import type { Collection } from '@/types/collection';
import { useCollectionImageStore } from '@/stores/useCollectionImageStore';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { appConfig } from '@/config/appConfig';
import { saveScrollPosition, setModalActive, prepareModalNavigationState } from '@/utils/modalNavigation';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';

interface UseCollectionImagesProps {
  collection: Collection | null;
  collectionId: string | undefined;
  isOwner: boolean;
  isMobile: boolean;
  fetchCollection: (id: string) => Promise<void>;
}

export const useCollectionImages = ({
  collection,
  collectionId,
  isOwner,
  isMobile,
  fetchCollection,
}: UseCollectionImagesProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const processedImages = useRef<Set<string>>(new Set());
  const actualLocation = useContext(ActualLocationContext);

  const {
    images,
    imageTypes,
    draggedImageId,
    dragOverImageId,
    isReordering,
    selectionMode,
    selectedImageIds,
    isBulkRemoving,
    setImages,
    updateImage,
    setImageType,
    setDraggedImageId,
    setDragOverImageId,
    reorderImages,
    toggleSelectionMode,
    toggleImageSelection,
    selectAllImages,
    deselectAllImages,
    bulkRemoveImages,
  } = useCollectionImageStore();

  // Sync images from collection to image store
  useEffect(() => {
    if (collection) {
      const imageArray = Array.isArray(collection.images)
        ? collection.images.filter((img: unknown): img is Image => {
          return typeof img === 'object' && img !== null && '_id' in img;
        })
        : [];
      setImages(imageArray);
    } else {
      setImages([]);
    }
  }, [collection, setImages]);

  // Get current image IDs for comparison
  const currentImageIds = useMemo(() => new Set(images.map(img => img._id)), [images]);

  // Determine image type when it loads
  const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
    if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;

    processedImages.current.add(imageId);
    const isPortrait = img.naturalHeight > img.naturalWidth;
    const imageType = isPortrait ? 'portrait' : 'landscape';
    setImageType(imageId, imageType);
  }, [currentImageIds, setImageType]);

  // Update image in the state when stats change
  const handleImageUpdate = useCallback((updatedImage: Image) => {
    updateImage(updatedImage._id, updatedImage);
  }, [updateImage]);

  // Handle drag start
  const handleDragStart = useCallback((imageId: string, e: React.DragEvent) => {
    if (!isOwner) return;
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', imageId);
    // Add a slight delay to allow drag image to be set
    setTimeout(() => {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    }, 0);
  }, [isOwner, setDraggedImageId]);

  // Handle drag over
  const handleDragOver = useCallback((imageId: string, e: React.DragEvent) => {
    if (!isOwner || !draggedImageId || draggedImageId === imageId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverImageId(imageId);
  }, [isOwner, draggedImageId, setDragOverImageId]);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverImageId(null);
  }, [setDragOverImageId]);

  // Handle drop
  const handleDrop = useCallback(async (targetImageId: string, e: React.DragEvent) => {
    if (!isOwner || !draggedImageId || !collectionId) return;

    e.preventDefault();
    e.stopPropagation();

    if (draggedImageId === targetImageId) {
      setDraggedImageId(null);
      setDragOverImageId(null);
      return;
    }

    // Get current image order
    const currentOrder = images.map(img => img._id);
    const draggedIndex = currentOrder.indexOf(draggedImageId);
    const targetIndex = currentOrder.indexOf(targetImageId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedImageId(null);
      setDragOverImageId(null);
      return;
    }

    // Reorder images
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedImageId);

    setDraggedImageId(null);
    setDragOverImageId(null);

    // Save to backend (store handles optimistic update and error handling)
    await reorderImages(collectionId, newOrder);
  }, [isOwner, draggedImageId, collectionId, images, setDraggedImageId, setDragOverImageId, reorderImages]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  }, [setDraggedImageId, setDragOverImageId]);

  // Handle image click
  const handleImageClick = useCallback((image: Image) => {
    if (selectionMode) {
      // Selection mode logic
      toggleImageSelection(image._id);
      return;
    }

    const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
    const targetPath = `/photos/${slug}`;

    // Mobile: full page navigation
    if (isMobile) {
      navigate(targetPath, {
        // Pass collection images + clicked image
        state: { images, image, fromGrid: true }
      });
      return;
    }

    // Desktop: modal-style with background
    // 1. Save scroll position using unified utility
    saveScrollPosition();

    // 2. Set modal active flag (required for validation)
    setModalActive();

    // 3. Prepare modal navigation state
    // CRITICAL: backgroundLocation must be a proper Location object
    const backgroundLocation = {
      pathname: actualLocation?.pathname || (collectionId ? `/collections/${collectionId}` : '/collections'),
      search: actualLocation?.search || '',
      hash: actualLocation?.hash || '',
      state: null,
      key: actualLocation?.key || 'default', // Use 'default' instead of empty string
    };
    const modalState = prepareModalNavigationState(backgroundLocation);

    // 4. Navigate with modal state
    navigate(targetPath, {
      // Include clicked image for fast modal open
      state: { ...modalState, images, image, fromGrid: true }
    });
  }, [selectionMode, isMobile, navigate, images, toggleImageSelection, actualLocation, collectionId]);

  // Handle bulk remove - Note: Confirmation is now handled by the component using ConfirmModal
  const handleBulkRemove = useCallback(async () => {
    if (!collectionId || selectedImageIds.size === 0) return;

    const imageIdsArray = Array.from(selectedImageIds);
    await bulkRemoveImages(collectionId, imageIdsArray);

    // Reload collection to sync with backend
    await fetchCollection(collectionId);
  }, [collectionId, selectedImageIds, bulkRemoveImages, fetchCollection]);

  return {
    images,
    imageTypes,
    draggedImageId,
    dragOverImageId,
    isReordering,
    selectionMode,
    selectedImageIds,
    isBulkRemoving,
    currentImageIds,
    processedImages,
    handleImageLoad,
    handleImageUpdate,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleImageClick,
    handleBulkRemove,
    toggleSelectionMode,
    toggleImageSelection,
    selectAllImages,
    deselectAllImages,
    setSearchParams,
  };
};

