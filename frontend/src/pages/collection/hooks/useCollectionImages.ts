import { useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Image } from '@/types/image';
import type { Collection } from '@/types/collection';
import { useCollectionImageStore } from '@/stores/useCollectionImageStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import { generateImageSlug } from '@/lib/utils';
import { saveScrollPosition, setModalActive, prepareModalNavigationState } from '@/utils/modalNavigation';

interface UseCollectionImagesProps {
  collection: Collection | null;
  collectionId: string | undefined;
  isOwner: boolean;
  canEdit: boolean;
  isMobile: boolean;
  fetchCollection: (id: string) => Promise<void>;
}

export const useCollectionImages = ({
  collection,
  collectionId,
  isOwner,
  canEdit,
  isMobile,
  fetchCollection,
}: UseCollectionImagesProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const imageScope = useRef<string | undefined>(undefined);

  const {
    images,
    draggedImageId,
    dragOverImageId,
    isReordering,
    selectionMode,
    selectedImageIds,
    isBulkRemoving,
    setImages,
    setDraggedImageId,
    setDragOverImageId,
    reorderImages,
    toggleSelectionMode,
    toggleImageSelection,
    selectAllImages,
    deselectAllImages,
    bulkRemoveImages,
    clearSelection,
  } = useCollectionImageStore();

  // Sync images from collection to image store
  useEffect(() => {
    if (imageScope.current !== collection?._id || !canEdit) clearSelection();
    imageScope.current = collection?._id;
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
  }, [collection, canEdit, setImages, clearSelection]);

  // Handle drag start
  const handleDragStart = useCallback((imageId: string, e: React.DragEvent) => {
    if (!isOwner || isReordering || selectionMode) { e.preventDefault(); return; }
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', imageId);
  }, [isOwner, isReordering, selectionMode, setDraggedImageId]);

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
    if (!isOwner || isReordering || selectionMode || !draggedImageId || !collectionId) return;

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
  }, [isOwner, isReordering, selectionMode, draggedImageId, collectionId, images, setDraggedImageId, setDragOverImageId, reorderImages]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  }, [setDraggedImageId, setDragOverImageId]);

  // Handle image click
  const handleImageClick = useCallback((image: Image) => {
    if (selectionMode && canEdit) {
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
    // Always use location.pathname directly to ensure we have the correct current path
    // This ensures the background is always the collection detail page, not a stale route
    const backgroundLocation = {
      pathname: location.pathname || (collectionId ? `/collections/${collectionId}` : '/collections'),
      search: location.search || '',
      hash: location.hash || '',
      state: null,
      key: location.key || 'default', // Use 'default' instead of empty string
    };
    const modalState = prepareModalNavigationState(backgroundLocation);

    // 4. Navigate with modal state
    navigate(targetPath, {
      // Include clicked image for fast modal open
      state: { ...modalState, images, image, fromGrid: true }
    });
  }, [selectionMode, canEdit, isMobile, navigate, images, toggleImageSelection, location, collectionId]);

  // Handle bulk remove - Note: Confirmation is now handled by the component using ConfirmModal
  const handleBulkRemove = useCallback(async () => {
    if (!canEdit || !collectionId || selectedImageIds.size === 0 || isBulkRemoving) return;

    const imageIdsArray = Array.from(selectedImageIds);
    const session = getAuthSessionVersion();
    await bulkRemoveImages(collectionId, imageIdsArray);

    // Reload collection to sync with backend
    if (session === getAuthSessionVersion() && useCollectionStore.getState().collection?._id === collectionId) {
      void fetchCollection(collectionId).catch(() => {});
    }
  }, [canEdit, collectionId, selectedImageIds, isBulkRemoving, bulkRemoveImages, fetchCollection]);

  return {
    images,
    draggedImageId,
    dragOverImageId,
    isReordering,
    selectionMode,
    selectedImageIds,
    isBulkRemoving,
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
  };
};

