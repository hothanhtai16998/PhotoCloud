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

      // Prepare state for new fetch
      set((draft) => {
        draft.loading = true;
        draft.error = null;

        // Clear images for new query
        if (
          categoryChanged ||
          searchChanged ||
          locationChanged ||
          params?.page === 1 ||
          !params?.page
        ) {
          draft.images = [];
          draft.pagination = null;
        }
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

            // For new queries, merge with recent uploads
            const recentUploads = filterRecentUploads(
              draft.images,
              params,
              params?._refresh === true
            );
            draft.images = mergeImages(draft.images, newImages, recentUploads);
          } else {
            // For pagination, append without duplicates
            draft.images = appendImages(draft.images, newImages);
          }

          draft.pagination = Array.isArray(response)
            ? null
            : response.pagination || null;
          draft.loading = false;
        });
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
    },
  }))
);
