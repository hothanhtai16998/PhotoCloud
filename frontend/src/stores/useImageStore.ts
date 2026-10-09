import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { imageService } from '@/services/imageService';
import type { ImageState, UploadImageData } from '@/types/store';
import type { FetchImagesParams, Image } from '@/types/image';
import type { Pagination } from '@/types/common';
import {
  getErrorMessage,
  getUploadErrorMessage,
  isCancelledRequest,
} from '@/utils/errorHandler';
import {
  filterRecentUploads,
  mergeImages,
  appendImages,
  filterDeletedImages,
  trimDeletedIds,
} from './helpers/imageStoreHelpers';
import { useImageFavoriteCountStore } from './useImageFavoriteCountStore';

// Category cache: Map<categoryKey, { images: Image[], pagination: Pagination | null }>
// categoryKey format: "category:search:location" or "all" for no filters
const categoryCache = new Map<string, { images: Image[]; pagination: Pagination | null }>();

function getCategoryCacheKey(params?: FetchImagesParams): string {
  // Normalize category: undefined, null, or empty string all become 'all'
  const category = params?.category 
    ? String(params.category).trim() || 'all'
    : 'all';
  const search = params?.search || '';
  const location = params?.location || '';
  // Only cache when no search/location filters (category-only queries)
  if (search || location) {
    return ''; // Don't cache filtered queries
  }
  // Return normalized category key
  return category;
}

let requestVersion = 0;
let activeController: AbortController | null = null;
let activeRequestKey = '';
let loadedQueryKey = '';
const queryKey = (params?: FetchImagesParams) => JSON.stringify(Object.entries(params || {}).filter(([key]) => !['page', '_refresh'].includes(key)).sort(([a], [b]) => a.localeCompare(b)));

export const useImageStore = create(
  immer<ImageState>((set, get) => ({
    // State
    images: [],
    loading: false,
    error: null,
    pagination: null,
    uploadProgress: 0,
    currentSearch: undefined as string | undefined,
    currentCategory: undefined as string | undefined,
    currentLocation: undefined as string | undefined,
    deletedImageIds: [] as string[],

    /**
     * Upload an image with progress tracking
     */
    uploadImage: async (data: UploadImageData) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.uploadProgress = 0;
      });

      let progressInterval: ReturnType<typeof setInterval> | null = null;

      try {
        const response = await imageService.uploadImage(data, (progress) => {
          set((state) => {
            state.uploadProgress = progress;
          });
        });

        // Simulate S3 processing progress (85-95%)
        let s3Progress = 85;
        progressInterval = setInterval(() => {
          s3Progress += 1;
          if (s3Progress < 95) {
            set((state) => {
              state.uploadProgress = s3Progress;
            });
          } else if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
        }, 500);

        // Clear interval when response received
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        set((state) => {
          if (!response.image) {
            state.uploadProgress = 100;
            state.loading = false;
            return;
          }

          const uploadedImage: Image = {
            ...response.image,
            _id: response.image._id || '',
            createdAt: response.image.createdAt || new Date().toISOString(),
          };

          // Only add to state if approved
          const isApproved =
            uploadedImage.moderationStatus === 'approved' ||
            !uploadedImage.moderationStatus;

          if (isApproved) {
            state.images.unshift(uploadedImage);
          }

          state.uploadProgress = 100;
          state.loading = false;
        });

        // Show appropriate message based on moderation status
        if (response.image?.moderationStatus === 'pending') {
          toast.success(
            'Image uploaded successfully! It will appear after admin approval.'
          );
        } else {
          toast.success('Image uploaded successfully!');
        }
      } catch (error) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        const message = getUploadErrorMessage(error);
        set((state) => {
          state.loading = false;
          state.error = message;
          state.uploadProgress = 0;
        });
        toast.error(message);
      }
    },

    /**
     * Fetch images with support for search, filtering, and pagination
     */
    fetchImages: async (params?: FetchImagesParams, signal?: AbortSignal) => {
      if (signal?.aborted) return;
      const state = get();
      const page = params?.page || 1;
      const query = queryKey(params);
      const key = query + ':' + page;
      if (activeRequestKey === key && !activeController?.signal.aborted) return;
      if (page > 1 && (state.loading || query !== loadedQueryKey)) return;
      const hasFilters = Object.entries(params || {}).some(([key, value]) => {
        if (['page','limit','category','_refresh'].includes(key) || value === undefined || value === null || value === '') return false;
        if (key === 'orientation' && value === 'all') return false;
        if (key === 'sortBy' && value === 'date') return false;
        if (key === 'order' && value === 'desc') return false;
        return true;
      });
      const cacheKey = !hasFilters ? getCategoryCacheKey(params) : '';
      const version = ++requestVersion;
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      activeRequestKey = key;
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, {once: true});
      const current = () => version === requestVersion && !controller.signal.aborted;
      try {
        const cached = page === 1 && !params?._refresh && cacheKey ? categoryCache.get(cacheKey) : null;
        if (cached) {
          loadedQueryKey = query;
          set(draft => {
            draft.images = filterDeletedImages(cached.images, draft.deletedImageIds);
            draft.pagination = cached.pagination;
            draft.currentCategory = params?.category; draft.currentSearch = params?.search; draft.currentLocation = params?.location;
            draft.loading = false; draft.error = null;
          });
          return;
        }
        set(draft => { draft.loading = true; draft.error = null; });
        const response = await imageService.fetchImages(page === 1 ? {...params, _refresh: true} : params, controller.signal);
        if (!current()) return;
        loadedQueryKey = query;
        set(draft => {
          const incoming = filterDeletedImages(Array.isArray(response) ? response : response.images || [], draft.deletedImageIds);
          const favoriteStore = useImageFavoriteCountStore.getState();
          incoming.forEach(image => { if (image._id && image.favoriteCount !== undefined && favoriteStore.getFavoriteCount(image._id) === 0) favoriteStore.updateFavoriteCount(image._id, image.favoriteCount); });
          if (page > 1) draft.images = appendImages(draft.images, incoming);
          else {
            const same = draft.currentCategory === params?.category && draft.currentSearch === params?.search && draft.currentLocation === params?.location;
            const recent = filterRecentUploads(same && !hasFilters ? draft.images : [], params, params?._refresh === true);
            draft.images = mergeImages([], incoming, recent);
          }
          draft.currentCategory = params?.category; draft.currentSearch = params?.search; draft.currentLocation = params?.location;
          draft.pagination = Array.isArray(response) ? null : response.pagination || null;
          draft.loading = false;
        });
        if (cacheKey && page === 1) {
          categoryCache.delete(cacheKey);
          categoryCache.set(cacheKey, {images: get().images, pagination: get().pagination});
          if (categoryCache.size > 12) categoryCache.delete(categoryCache.keys().next().value!);
        }
      } catch (error) {
        if (!current()) return;
        if (isCancelledRequest(error)) { set(draft => {draft.loading = false;}); return; }
        const message = getErrorMessage(error, 'Failed to fetch images. Please try again.');
        set(draft => {draft.loading = false; draft.error = message;});
        toast.error(message);
      } finally {
        signal?.removeEventListener('abort', abort);
        if (version === requestVersion) {
          activeRequestKey = ''; activeController = null;
          if (controller.signal.aborted) set(draft => {draft.loading = false;});
        }
      }
    },

    /**
     * Remove an image from the store and track it to prevent re-fetching
     */
    removeImage: (imageId: string) => {
      const state = get();
      const cacheKey = getCategoryCacheKey({ category: state.currentCategory });
      
      set((state) => {
        // Add to deleted IDs for filtering in future fetches
        if (!state.deletedImageIds.includes(imageId)) {
          state.deletedImageIds.push(imageId);
        }

        // Trim deleted IDs to prevent memory leak
        state.deletedImageIds = trimDeletedIds(state.deletedImageIds);

        // Remove from current images
        state.images = state.images.filter((img) => img._id !== imageId);

        // Update pagination total
        if (state.pagination) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
        }
      });

      // Invalidate cache for current category when image is removed
      if (cacheKey) {
        categoryCache.delete(cacheKey);
      }
    },
  }))
);
