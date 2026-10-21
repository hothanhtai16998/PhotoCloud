import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionService } from '@/services/collectionService';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import type { CollectionImageState } from '@/types/store';
import type { Image } from '@/types/image';

// Replacing the dataset invalidates mutations belonging to the previous page.
let imageRevision = 0;

export const useCollectionImageStore = create(
  immer<CollectionImageState>((set, get) => ({
    images: [],
    imageTypes: new Map<string, 'portrait' | 'landscape'>(),
    draggedImageId: null,
    dragOverImageId: null,
    isReordering: false,
    selectionMode: false,
    selectedImageIds: new Set<string>(),
    isBulkRemoving: false,

    setImages: (images: Image[]) => {
      imageRevision++;
      set(state => {
        state.images = images;
        state.isReordering = false;
        state.isBulkRemoving = false;
        state.draggedImageId = null;
        state.dragOverImageId = null;
        const ids = new Set(images.map(image => image._id));
        state.selectedImageIds = new Set([...state.selectedImageIds].filter(id => ids.has(id)));
      });
    },
    updateImage: (imageId, updatedImage) => {
      set(state => {
        const index = state.images.findIndex(image => image._id === imageId);
        if (index !== -1) state.images[index] = updatedImage;
      });
    },
    removeImage: imageId => {
      set(state => {
        state.images = state.images.filter(image => image._id !== imageId);
        state.selectedImageIds.delete(imageId);
      });
    },
    reorderImages: async (collectionId, newOrder) => {
      if (get().isReordering || get().isBulkRemoving) return;
      const previous = get().images;
      const revision = imageRevision;
      const session = getAuthSessionVersion();
      const isCurrent = (): boolean => revision === imageRevision && session === getAuthSessionVersion();
      set(state => {
        state.isReordering = true;
        state.images = newOrder.map(id => previous.find(image => image._id === id)).filter((image): image is Image => Boolean(image));
      });
      try {
        const updated = await collectionService.reorderCollectionImages(collectionId, newOrder);
        if (!isCurrent()) return;
        set(state => {
          state.images = updated.images.filter((image): image is Image => typeof image === 'object' && image !== null);
          state.isReordering = false;
        });
        if (useCollectionStore.getState().collection?._id === collectionId) {
          useCollectionStore.setState({ collection: updated });
        }
        toast.success('Đã sắp xếp lại ảnh');
      } catch {
        if (!isCurrent()) return;
        set(state => { state.images = previous; state.isReordering = false; });
        toast.error('Không thể sắp xếp lại ảnh. Vui lòng thử lại.');
      }
    },
    setImageType: (imageId, type) => {
      set(state => { if (!state.imageTypes.has(imageId)) state.imageTypes.set(imageId, type); });
    },
    setDraggedImageId: imageId => { set(state => { state.draggedImageId = imageId; }); },
    setDragOverImageId: imageId => { set(state => { state.dragOverImageId = imageId; }); },
    setIsReordering: isReordering => { set(state => { state.isReordering = isReordering; }); },
    toggleSelectionMode: () => {
      if (get().isBulkRemoving || get().isReordering) return;
      set(state => {
        state.selectionMode = !state.selectionMode;
        if (!state.selectionMode) state.selectedImageIds.clear();
      });
    },
    toggleImageSelection: imageId => {
      if (get().isBulkRemoving) return;
      set(state => {
        if (state.selectedImageIds.has(imageId)) state.selectedImageIds.delete(imageId);
        else state.selectedImageIds.add(imageId);
      });
    },
    selectAllImages: () => {
      if (get().isBulkRemoving) return;
      set(state => { state.selectedImageIds = new Set(state.images.map(image => image._id)); });
    },
    deselectAllImages: () => {
      if (get().isBulkRemoving) return;
      set(state => { state.selectedImageIds.clear(); });
    },
    bulkRemoveImages: async (collectionId, imageIds) => {
      if (!imageIds.length || get().isBulkRemoving || get().isReordering) return;
      const revision = imageRevision;
      const session = getAuthSessionVersion();
      const isCurrent = (): boolean => revision === imageRevision && session === getAuthSessionVersion();
      set(state => { state.isBulkRemoving = true; });
      const results = await Promise.allSettled(imageIds.map(imageId => collectionService.removeImageFromCollection(collectionId, imageId)));
      if (!isCurrent()) return;
      const removed = new Set(imageIds.filter((_, index) => results[index].status === 'fulfilled'));
      const failed = imageIds.filter(id => !removed.has(id));
      set(state => {
        state.images = state.images.filter(image => !removed.has(image._id));
        state.selectedImageIds = new Set(failed);
        state.selectionMode = failed.length > 0;
        state.isBulkRemoving = false;
      });
      if (useCollectionStore.getState().collection?._id === collectionId) {
        for (const id of removed) useCollectionStore.getState().removeImageFromCollection(id);
      }
      if (failed.length) {
        // Retry only failures; successful deletions must not be sent again.
        const message = removed.size
          ? `Đã xóa ${removed.size} ảnh; ${failed.length} ảnh chưa xóa được. Vui lòng thử lại.`
          : 'Không thể xóa ảnh. Vui lòng thử lại.';
        throw new Error(message);
      }
      toast.success(`Đã xóa ${removed.size} ảnh khỏi bộ sưu tập`);
    },
    clearSelection: () => {
      set(state => {
        state.selectedImageIds.clear();
        state.selectionMode = false;
        state.draggedImageId = null;
        state.dragOverImageId = null;
      });
    },
  }))
);

