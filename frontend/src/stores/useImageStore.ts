import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { imageService } from '@/services/imageService';
import type { ImageState, UploadImageData } from '@/types/store';
import type { FetchImagesParams } from '@/types/image';
import {
  getErrorMessage,
  getUploadErrorMessage,
  isCancelledRequest,
} from '@/utils/errorHandler';
import {
  isNewQuery,
  hasFiltersChanged,
  filterRecentUploads,
  mergeImages,
  appendImages,
  filterDeletedImages,
  trimDeletedIds,
} from './helpers/imageStoreHelpers';

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
          const uploadedImage = {
            ...response.image,
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
        if (response.image.moderationStatus === 'pending') {
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
      const state = get();

      // Prevent concurrent requests (unless refreshing)
      if (state.loading && !params?._refresh) {
        return;
      }

      // Check for filter changes
      const { categoryChanged, searchChanged, locationChanged } =
        hasFiltersChanged(
          params,
          state.currentCategory,
          state.currentSearch,
          state.currentLocation
        );

      // Check if we're already showing the requested category (avoid unnecessary updates)
      const isSameCategory = 
        state.currentCategory === params?.category &&
        state.currentSearch === params?.search &&
        state.currentLocation === params?.location &&
        !params?._refresh &&
        (params?.page === 1 || !params?.page);
      
      if (isSameCategory && state.images.length > 0) {
        // Already showing this category, no need to fetch
        return;
      }

      // Check cache FIRST, before any state changes (critical for zero-flash)
      const cacheKey = getCategoryCacheKey(params);
      const cached = cacheKey ? categoryCache.get(cacheKey) : null;
      
      // If we have cached data and not refreshing, use it IMMEDIATELY and synchronously
      if (cached && !params?._refresh && (params?.page === 1 || !params?.page)) {
        // Filter out deleted images from cache
        const filteredCachedImages = filterDeletedImages(
          cached.images,
          state.deletedImageIds
        );
        
        // Only update if we actually have images or if current images are empty
        // This prevents unnecessary re-renders when cache has same images
        const needsUpdate = 
          filteredCachedImages.length !== state.images.length ||
          filteredCachedImages.some((img, idx) => img._id !== state.images[idx]?._id) ||
          state.images.length === 0 ||
          state.currentCategory !== params?.category;
        
        if (needsUpdate) {
          // CRITICAL: Update state synchronously in a single batch
          // This ensures zero flash - images appear instantly without intermediate renders
          set((draft) => {
            // Update all state in one go to prevent flash
            draft.images = filteredCachedImages;
            draft.pagination = cached.pagination;
            draft.currentSearch = params?.search;
            draft.currentCategory = params?.category;
            draft.currentLocation = params?.location;
            // Set loading to false AFTER images are set (prevents flash)
            draft.loading = false;
          });
        }
        
        return; // Use cached data, no need to fetch
      }

      // Prepare state for new fetch
      // For category changes, keep old images visible until new ones load (prevents flashing)
      set((draft) => {
        // CRITICAL: Only set loading if we don't have images to show
        // If we have images from previous category, keep them visible (no loading state)
        // This prevents flash - old images stay visible while new ones load
        if (draft.images.length === 0) {
          draft.loading = true;
        } else {
          // We have images to show - don't set loading to true
          // This keeps the grid visible during category switch
          draft.loading = false;
        }
        draft.error = null;

        // NEVER clear images on category/search/location changes
        // Only clear on explicit refresh without filter changes
        if (
          (params?.page === 1 || !params?.page) &&
          !categoryChanged &&
          !searchChanged &&
          !locationChanged &&
          params?._refresh
        ) {
          // Only clear on explicit refresh without filter changes
          draft.images = [];
          draft.pagination = null;
        }
        // For filter changes, ALWAYS keep images visible - they'll be replaced after loading
      });

      try {
        // Determine if we should bust cache
        const shouldBustCache =
          !params?.page ||
          params.page === 1 ||
          params?._refresh ||
          categoryChanged ||
          searchChanged;

        const fetchParams =
          shouldBustCache && !params?._refresh
            ? { ...params, _refresh: true }
            : params;

        const response = await imageService.fetchImages(fetchParams, signal);

        set((draft) => {
          // Extract images from response
          const rawImages = Array.isArray(response)
            ? response
            : response.images || [];

          // Filter out deleted images
          const newImages = filterDeletedImages(
            rawImages,
            draft.deletedImageIds
          );

          // Update current filters
          if (isNewQuery(params)) {
            draft.currentSearch = params?.search;
            draft.currentCategory = params?.category;
            draft.currentLocation = params?.location;

            // For category/search/location changes, replace images completely
            // This happens after loading, so old images were visible during the transition
            if (categoryChanged || searchChanged || locationChanged) {
              // Replace images completely for filter changes
              const recentUploads = filterRecentUploads(
                [],
                params,
                params?._refresh === true
              );
              draft.images = mergeImages([], newImages, recentUploads);
            } else {
              // For refresh without filter changes, merge with existing
              const recentUploads = filterRecentUploads(
                draft.images,
                params,
                params?._refresh === true
              );
              draft.images = mergeImages(draft.images, newImages, recentUploads);
            }
          } else {
            // For pagination, append without duplicates
            draft.images = appendImages(draft.images, newImages);
          }

          draft.pagination = Array.isArray(response)
            ? null
            : response.pagination || null;
          draft.loading = false;
        });

        // Cache category images (only for category-only queries, page 1, not refreshing)
        if (cacheKey && (params?.page === 1 || !params?.page) && !params?._refresh) {
          const finalState = get();
          categoryCache.set(cacheKey, {
            images: finalState.images,
            pagination: finalState.pagination,
          });
        } else if (params?._refresh && cacheKey) {
          // Clear cache when refreshing
          categoryCache.delete(cacheKey);
        }
      } catch (error) {
        // Silently ignore cancelled requests
        if (isCancelledRequest(error)) {
          set((state) => {
            state.loading = false;
          });
          return;
        }

        const message = getErrorMessage(
          error,
          'Failed to fetch images. Please try again.'
        );
        set((state) => {
          state.loading = false;
          state.error = message;
        });
        toast.error(message);
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
