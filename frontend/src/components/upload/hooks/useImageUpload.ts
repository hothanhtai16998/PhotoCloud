import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { categoryService, type Category } from '@/services/categoryService';
import { imageService } from '@/services/imageService';
import type { PreUploadResponse, FinalizeImageData, Image } from '@/types/image';
import type { Coordinates } from '@/types/common';
import { compressImage } from '@/utils/imageCompression';
import { t } from '@/i18n';

export interface ImageData {
  file: File;
  title: string;
  category: string;
  location: string;
  coordinates?: Coordinates;
  cameraModel: string;
  tags: string[];
  errors: {
    title?: string;
    category?: string;
  };
  // New fields for pre-upload flow
  preUploadData?: PreUploadResponse | null;
  uploadProgress?: number;
  isUploading?: boolean;
  uploadError?: string | null;
  preserveQuality?: boolean; // User preference for compression
}

interface UseImageUploadProps {
  onSuccess?: () => void;
}

export const useImageUpload = ({ onSuccess }: UseImageUploadProps = {}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(0);
  const [totalUploads, setTotalUploads] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const uploadProgressRef = useRef<number>(0);

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const fetchedCategories = await categoryService.fetchCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Shared validation function that returns images with errors
  // Only requires category for admin users (normal users upload pending, admin adds category later)
  const validateImagesWithErrors = useCallback(
    (imagesData: ImageData[], isAdmin: boolean = false): ImageData[] => {
      return imagesData.map((img) => {
        const errors: { title?: string; category?: string } = {};
        // Title is no longer required for anyone
        // Category is only required for admin users
        if (isAdmin && !img.category.trim()) {
          errors.category = t('upload.categoryRequired');
        }
        return { ...img, errors };
      });
    },
    []
  );

  const validateAllImages = useCallback(
    (imagesData: ImageData[], isAdmin: boolean = false): boolean => {
      const updated = validateImagesWithErrors(imagesData, isAdmin);
      return updated.every((img) => Object.keys(img.errors).length === 0);
    },
    [validateImagesWithErrors]
  );

  // Pre-upload a single image
  const preUploadSingleImage = useCallback(
    async (
      imageData: ImageData,
      preserveQuality: boolean = false,
      onProgress?: (progress: number) => void
    ): Promise<PreUploadResponse> => {
      try {
        // Compress image based on user preference
        const fileToUpload = await compressImage(imageData.file, {
          preserveQuality,
        });

        // Pre-upload to S3
        const result = await imageService.preUploadImage(
          fileToUpload,
          (progress) => {
            onProgress?.(progress);
          }
        );

        return result;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, 'Failed to upload image');
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Pre-upload all images when files are selected - small concurrent batch to improve speed
  const preUploadAllImages = useCallback(
    async (
      imagesData: ImageData[],
      preserveQuality: boolean = false,
      onImageProgress?: (index: number, progress: number) => void
    ): Promise<ImageData[]> => {
      // Clone array so we can mutate by index
      const updatedImagesData: ImageData[] = imagesData.map((img) => ({ ...img }));

      // Helper to start upload for a single index
      const startUploadForIndex = async (index: number) => {
        const imgData = imagesData[index];
        if (!imgData) return;

        // Skip if already uploaded
        if (imgData.preUploadData) {
          return;
        }

        try {
          // Mark as uploading - preserve ALL existing fields (title, category, location, etc.)
          updatedImagesData[index] = {
            ...imgData,
            isUploading: true,
            uploadProgress: 0,
            uploadError: null,
          };

          // Immediately notify progress callback with initial state
          onImageProgress?.(index, 0);

          // Pre-upload image with real-time progress updates
          const shouldPreserveQuality =
            imgData.preserveQuality ?? preserveQuality;
          const preUploadResult = await preUploadSingleImage(
            imgData,
            shouldPreserveQuality,
            (progress) => {
              onImageProgress?.(index, progress);
            }
          );

          // Final update: mark as complete (100% and not uploading)
          updatedImagesData[index] = {
            ...imgData,
            preUploadData: preUploadResult,
            isUploading: false,
            uploadProgress: 100,
            uploadError: null,
          };

          onImageProgress?.(index, 100);
        } catch (error: unknown) {
          updatedImagesData[index] = {
            ...imgData,
            isUploading: false,
            uploadProgress: 0,
            uploadError: (error as Error).message || t('upload.uploadFailed'),
            preUploadData: null,
          };
        }
      };

      // Small concurrent batch uploader (max 3 at a time)
      const maxConcurrent = 3;
      let nextIndex = 0;
      const running: Promise<void>[] = [];

      const enqueueNext = () => {
        if (nextIndex >= imagesData.length) return;
        const current = nextIndex++;
        const p = startUploadForIndex(current).then(() => {
          // When one finishes, enqueue another if available
          enqueueNext();
        });
        running.push(p);
      };

      // Prime initial batch
      const initial = Math.min(maxConcurrent, imagesData.length);
      for (let i = 0; i < initial; i++) {
        enqueueNext();
      }

      await Promise.all(running);
      return updatedImagesData;
    },
    [preUploadSingleImage]
  );

  const handleSubmitAll = useCallback(
    async (imagesData: ImageData[], isAdmin: boolean = false) => {
      // Validate all images (only requires category for admin users)
      if (!validateAllImages(imagesData, isAdmin)) {
        return false;
      }

      // Check if all images are pre-uploaded
      const allUploaded = imagesData.every(
        (img) => img.preUploadData && !img.isUploading
      );
      if (!allUploaded) {
        toast.error(t('upload.waitForAllUploads'));
        return false;
      }

      // Show finalizing progress
      setIsFinalizing(true);
      setShowProgress(true);
      setTotalUploads(imagesData.length);
      setUploadingIndex(0);

      const failedUploads: { index: number; title: string; error: unknown }[] =
        [];
      const successfulUploads: number[] = [];

      try {
        // Finalize images with controlled concurrency (max 5 at a time)
        // This balances speed with browser connection limits (typically 6 per domain)
        const maxConcurrent = 5;
        let completedCount = 0;
        let nextIndex = 0;
        const running: Promise<{ index: number; success: boolean; skipped: boolean; image: Image | null }>[] = [];
        
        const startFinalize = async (i: number): Promise<{ index: number; success: boolean; skipped: boolean; image: Image | null }> => {
          const imgData = imagesData[i];
          if (!imgData?.preUploadData) {
            completedCount++;
            setUploadingIndex(completedCount);
            return { index: i, success: false, skipped: true, image: null };
          }

          try {
            const finalizeData: FinalizeImageData = {
              uploadId: imgData.preUploadData.uploadId,
              uploadKey: imgData.preUploadData.uploadKey,
              imageTitle: imgData.title.trim() || undefined, // Title is optional
              imageCategory:
                imgData.category && imgData.category.trim()
                  ? imgData.category.trim()
                  : undefined, // Category is optional for normal users, but required for admin
              location: imgData.location.trim() || undefined,
              coordinates: imgData.coordinates,
              cameraModel: imgData.cameraModel.trim() || undefined,
              tags:
                imgData.tags && imgData.tags.length > 0
                  ? imgData.tags
                  : undefined,
            };

            const response = await imageService.finalizeImageUpload(finalizeData);
            completedCount++;
            setUploadingIndex(completedCount); // Update progress as each completes
            // Backend returns 202 Accepted for async processing, so image may not be in response yet
            // Image will be available after background processing completes
            return { 
              index: i, 
              success: response.success !== false, // Check if success is not explicitly false
              skipped: false, 
              image: response.image || null // Handle case where image is not in response (async processing)
            };
          } catch (error) {
            // Track failed finalize but continue with others
            completedCount++;
            setUploadingIndex(completedCount);
            failedUploads.push({
              index: i,
              title: imgData.title || `Image ${i + 1}`,
              error,
            });
            console.error(
              `Failed to finalize image ${i + 1} (${imgData.title}):`,
              error
            );
            return { index: i, success: false, skipped: false, image: null };
          }
        };

        const enqueueNext = () => {
          if (nextIndex >= imagesData.length) return;
          const current = nextIndex++;
          const promise = startFinalize(current).then((result) => {
            // When one finishes, enqueue another if available
            enqueueNext();
            return result;
          });
          running.push(promise);
        };

        // Start initial batch
        const initial = Math.min(maxConcurrent, imagesData.length);
        for (let i = 0; i < initial; i++) {
          enqueueNext();
        }

        // Wait for all finalizations to complete
        const results = await Promise.all(running);
        
        // Track successful uploads and collect uploaded images for optimistic update
        const uploadedImages: Image[] = [];
        results.forEach((result) => {
          // Safety check: ensure result exists and has expected properties
          if (result && result.success && !result.skipped) {
            successfulUploads.push(result.index);
            if (result.image) {
              uploadedImages.push(result.image);
            }
          }
        });

        // Dispatch refresh events with uploaded images for optimistic UI update
        // This ensures profile shows images immediately before API fetch completes
        window.dispatchEvent(new CustomEvent('refreshProfile', { 
          detail: { optimisticImages: uploadedImages } 
        }));
        window.dispatchEvent(new CustomEvent('imageUploaded'));

        // Minimal delay for UI transition (just enough for smooth animation)
        await new Promise((resolve) => setTimeout(resolve, 50));

        setShowProgress(false);
        setIsFinalizing(false);

        // Create bulk upload notification
        if (imagesData.length > 1) {
          await imageService.createBulkUploadNotification(
            successfulUploads.length,
            imagesData.length,
            failedUploads.length
          );
        }

        // Show appropriate message based on results
        if (failedUploads.length === 0) {
          // All successful
          setShowSuccess(true);
        } else if (successfulUploads.length > 0) {
          // Partial success
          setShowSuccess(true);
          const failedTitles = failedUploads.map((f) => f.title).join(', ');
          toast.warning(
            `${successfulUploads.length} ảnh đã tải lên thành công. ${failedUploads.length} ảnh thất bại: ${failedTitles}`
          );
        } else {
          // All failed
          setShowSuccess(false);
          toast.error(
            t('upload.uploadError')
          );
          return false;
        }

        // Refresh events already dispatched above (immediately after finalization)

        onSuccess?.();
        return failedUploads.length === 0; // Return true only if all succeeded
      } catch (error) {
        console.error('Failed to finalize images:', error);
        setShowProgress(false);
        setIsFinalizing(false);
        setShowSuccess(false);
        toast.error(t('upload.uploadError'));
        return false;
      }
    },
    [categories, validateAllImages, onSuccess]
  );

  const resetUploadState = useCallback(() => {
    setShowProgress(false);
    setShowSuccess(false);
    setUploadingIndex(0);
    setTotalUploads(0);
    setIsFinalizing(false);
    uploadProgressRef.current = 0;
  }, []);

  // Calculate overall upload progress
  const uploadProgress = uploadProgressRef.current;

  return {
    categories,
    loadingCategories,
    loadCategories,
    showProgress,
    showSuccess,
    uploadingIndex,
    totalUploads,
    uploadProgress,
    loading: isFinalizing,
    handleSubmitAll,
    resetUploadState,
    validateAllImages,
    validateImagesWithErrors,
    preUploadAllImages,
    preUploadSingleImage,
  };
};
