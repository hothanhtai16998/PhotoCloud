import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Image } from '@/types/image';
import type { Collection } from '@/types/collection';
import { useCollectionImageStore } from '@/stores/useCollectionImageStore';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { appConfig } from '@/config/appConfig';

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

  // Get selected image slug from URL
  const imageSlugFromUrl = searchParams.get('image');

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

  // MOBILE ONLY: If URL has ?image=slug on mobile, redirect to ImagePage
  useEffect(() => {
    if (imageSlugFromUrl && isMobile) {
      // Set flag to indicate we're opening from grid
      sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
      // Navigate to ImagePage with images state
      navigate(`/photos/${imageSlugFromUrl}`, {
        state: {
          images,
          fromGrid: true
        },
        replace: true // Replace current URL to avoid back button issues
      });
      // Clear the image param from current URL
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('image');
        return newParams;
      });
    }
  }, [imageSlugFromUrl, isMobile, navigate, images, setSearchParams]);

  // Find selected image from URL slug - DESKTOP ONLY
  const selectedImage = useMemo(() => {
    // Don't show modal on mobile
    if (isMobile) return null;
    if (!imageSlugFromUrl || images.length === 0) return null;

    const shortId = extractIdFromSlug(imageSlugFromUrl);
    if (!shortId) return null;

    return images.find(img => {
      const imgShortId = img._id.slice(-12);
      return imgShortId === shortId;
    }) || null;
  }, [imageSlugFromUrl, images, isMobile]);

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

    // MOBILE ONLY: Navigate to ImagePage instead of opening modal
    if (isMobile) {
      const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
      navigate(`/photos/${slug}`, {
        state: { images }
      });
      return;
    }

    // DESKTOP: Use modal (existing behavior)
    const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('image', slug);
      return newParams;
    });
  }, [selectionMode, isMobile, navigate, images, toggleImageSelection, setSearchParams]);

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
    selectedImage,
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

