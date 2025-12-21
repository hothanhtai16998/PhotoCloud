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
  isNewQuery,
  hasFiltersChanged,
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
      const state = get();

      // CRITICAL: If _refresh is true (always set for filter changes), skip ALL blocking immediately
      // This ensures filter changes always work on first try
      const isForcedRefresh = params?._refresh === true;

      // Check if any filters are active FIRST - this determines if we can skip blocking logic
      // IMPORTANT: sortBy='date' and order='desc' are defaults, so don't count as filters
      const hasAnyFilters = !!(
        params?.color || 
        (params?.orientation && params.orientation !== 'all') ||
        params?.dateFrom || 
        params?.dateTo ||
        params?.cameraMake ||
        params?.cameraModel ||
        params?.focalLengthMin !== undefined ||
        params?.focalLengthMax !== undefined ||
        params?.apertureMin !== undefined ||
        params?.apertureMax !== undefined ||
        params?.isoMin !== undefined ||
        params?.isoMax !== undefined ||
        params?.minWidth !== undefined ||
        params?.minHeight !== undefined ||
        params?.aspectRatio ||
        (params?.sortBy && params.sortBy !== 'date') ||
        (params?.order && params.order !== 'desc')
      );
      
      
      // Calculate these once for use in all logic paths
      const isPaginationRequest = params?.page && params.page > 1;
      const isSameQuery = 
        params?.category === state.currentCategory &&
        params?.search === state.currentSearch &&
        params?.location === state.currentLocation;
      
      // CRITICAL: If filters are present OR refresh is forced, ALWAYS fetch - skip ALL blocking logic
      // This ensures filter changes work immediately on first try
      // Also handles changing from one filter to another (e.g., red → green) correctly
      // Since buildFetchParams always sets _refresh: true for filters, this should always bypass
      if (!isForcedRefresh && !hasAnyFilters) {
        // Only apply blocking logic when no forced refresh and no filters are present
        // Block pagination if initial load is in progress and we have no images yet
        if (state.loading) {
          if (isPaginationRequest && state.images.length === 0) {
            return;
          }
          if (!isPaginationRequest) {
            return;
          }
        }
        
        // For pagination requests, ensure we're fetching the same query
        if (isPaginationRequest && !isSameQuery) {
          return;
        }
      }
      // If isForcedRefresh || hasAnyFilters, we continue to fetch (no blocking)

      // Check for filter changes
      const { categoryChanged, searchChanged, locationChanged } =
        hasFiltersChanged(
          params,
          state.currentCategory,
          state.currentSearch,
          state.currentLocation
        );

      // Check cache FIRST, before any state changes (critical for zero-flash)
      // BUT: Don't use cache if any filters are active
      // because cache only stores unfiltered category data
      const cacheKey = getCategoryCacheKey(params);
      const cached = cacheKey && !categoryChanged && !hasAnyFilters ? categoryCache.get(cacheKey) : null;
      
      // IMPORTANT: If filters are present, ALWAYS fetch - never skip
      // This ensures filter changes are always detected and applied immediately
      if (hasAnyFilters) {
        // Filters present - always proceed to fetch, skip all "already showing" checks
      } else {
        // No filters - can check if we're already showing this query
        const isAlreadyShowingQuery = 
          isSameQuery &&
          !params?._refresh &&
          (params?.page === 1 || !params?.page);
        
        if (isAlreadyShowingQuery && state.images.length > 0 && !cached) {
          // Already showing this exact query with no filters, no need to fetch
          return;
        }
      }
      
      // If we have cached data and not refreshing, use it IMMEDIATELY and synchronously
      // Only use cache when no filters are active (cache stores unfiltered data)
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
      // For filter changes, ALWAYS clear images and set loading to show filter is being applied
      set((draft) => {
        draft.error = null;
        
        // For filter changes (any filter parameter), ALWAYS clear images and show loading
        // This ensures users see that filters are being applied immediately
        if (hasAnyFilters && (params?.page === 1 || !params?.page)) {
          draft.images = [];
          draft.pagination = null;
          draft.loading = true; // Always show loading when applying filters
        } else if (
          (params?.page === 1 || !params?.page) &&
          !categoryChanged &&
          !searchChanged &&
          !locationChanged &&
          params?._refresh
        ) {
          // Only clear on explicit refresh without filter changes
          draft.images = [];
          draft.pagination = null;
          draft.loading = true;
        } else {
          // For category/search/location changes, keep old images visible until new ones load
          // Only set loading if we don't have images to show
          if (draft.images.length === 0) {
            draft.loading = true;
          } else {
            // We have images to show - don't set loading to true
            // This keeps the grid visible during category switch
            draft.loading = false;
          }
        }
      });

      try {
        // Determine if we should bust cache
        // Always bust cache if filters are present or if it's a new query
        const shouldBustCache =
          !params?.page ||
          params.page === 1 ||
          params?._refresh ||
          categoryChanged ||
          searchChanged ||
          hasAnyFilters; // Always bust cache when filters are present

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

          // Initialize favorite count store with image data (important for new sessions)
          // This ensures the count is available when user clicks save
          if (newImages.length > 0) {
            const store = useImageFavoriteCountStore.getState();
            newImages.forEach((img) => {
              if (img._id && img.favoriteCount !== undefined) {
                // Always initialize with image's favoriteCount (even if 0)
                // This ensures we have the correct baseline
                const currentCount = store.getFavoriteCount(img._id);
                if (currentCount === 0) {
                  store.updateFavoriteCount(img._id, img.favoriteCount);
                }
              }
            });
          }

          // Update current filters
          // IMPORTANT: Always update state when filters are present OR when it's a new query
          if (isNewQuery(params) || hasAnyFilters) {
            draft.currentSearch = params?.search;
            draft.currentCategory = params?.category;
            draft.currentLocation = params?.location;

            // For category/search/location/filter changes, replace images completely
            // This happens after loading, so old images were visible during the transition
            if (categoryChanged || searchChanged || locationChanged || hasAnyFilters) {
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
