import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { categoryService, type Category } from '@/services/categoryService';
import { imageService } from '@/services/imageService';
import type { PreUploadResponse, FinalizeImageData } from '@/types/image';
import type { Coordinates } from '@/types/common';
import { compressImage } from '@/utils/imageCompression';

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
          errors.category = 'Category is required';
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

  // Pre-upload all images when files are selected - process one at a time to prevent blocking
  const preUploadAllImages = useCallback(
    async (
      imagesData: ImageData[],
      preserveQuality: boolean = false,
      onImageProgress?: (index: number, progress: number) => void
    ): Promise<ImageData[]> => {
      const updatedImagesData: ImageData[] = [];

      // Process images one at a time with delays to prevent blocking UI
      for (let i = 0; i < imagesData.length; i++) {
        const imgData = imagesData[i];
        if (!imgData) continue;

        // Skip if already uploaded
        if (imgData.preUploadData) {
          updatedImagesData.push(imgData);
          continue;
        }

        try {
          // Mark as uploading - preserve ALL existing fields (title, category, location, etc.)
          const uploadingState: ImageData = {
            ...imgData, // Preserve all existing form data
            isUploading: true,
            uploadProgress: 0,
            uploadError: null,
          };
          updatedImagesData.push(uploadingState);

          // Immediately notify progress callback with initial state
          onImageProgress?.(i, 0);

          // Add delay between images to prevent blocking (except for first image)
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Pre-upload image with real-time progress updates
          // Use preserveQuality from parameter (global setting) or from imageData (per-image setting)
          const shouldPreserveQuality =
            imgData.preserveQuality ?? preserveQuality;
          const preUploadResult = await preUploadSingleImage(
            imgData,
            shouldPreserveQuality,
            (progress) => {
              // Update progress in real-time (0-100%) - throttled by caller
              onImageProgress?.(i, progress);
            }
          );

          // Final update: mark as complete (100% and not uploading)
          // Only set isUploading to false when we have preUploadData (upload truly complete)
          updatedImagesData[i] = {
            ...imgData, // Preserve all existing form data (title, category, location, etc.)
            preUploadData: preUploadResult, // Upload is complete when we have this
            isUploading: false, // This will hide the overlay - only set false when preUploadData exists
            uploadProgress: 100, // Ensure it shows 100% before hiding
            uploadError: null,
          };

          // Send final 100% update, then mark as not uploading
          onImageProgress?.(i, 100);
        } catch (error: unknown) {
          // Mark as failed
          updatedImagesData[i] = {
            ...imgData,
            isUploading: false,
            uploadProgress: 0,
            uploadError: (error as Error).message || 'Upload failed',
            preUploadData: null,
          };
        }
      }

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
        toast.error('Vui lòng đợi tất cả ảnh tải lên hoàn tất');
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
        // Finalize all images sequentially
        for (let i = 0; i < imagesData.length; i++) {
          setUploadingIndex(i);
          const imgData = imagesData[i];
          if (!imgData?.preUploadData) continue;

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

            await imageService.finalizeImageUpload(finalizeData);
            successfulUploads.push(i);
          } catch (error) {
            // Track failed finalize but continue with others
            failedUploads.push({
              index: i,
              title: imgData.title || `Image ${i + 1}`,
              error,
            });
            console.error(
              `Failed to finalize image ${i + 1} (${imgData.title}):`,
              error
            );
          }

          // Small delay between finalizations
          if (i < imagesData.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        // Wait a moment before showing success
        await new Promise((resolve) => setTimeout(resolve, 800));

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
            `Tất cả ${failedUploads.length} ảnh đều thất bại khi tải lên.`
          );
          return false;
        }

        // Dispatch refresh events
        window.dispatchEvent(new CustomEvent('refreshProfile'));

        // Dispatch imageUploaded event immediately after upload completes to refresh all grids
        // This way the grid refreshes when user clicks "Gửi 1 ảnh", not when they close the modal
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('imageUploaded'));
        }, 300);

        onSuccess?.();
        return failedUploads.length === 0; // Return true only if all succeeded
      } catch (error) {
        console.error('Failed to finalize images:', error);
        setShowProgress(false);
        setIsFinalizing(false);
        setShowSuccess(false);
        toast.error('Đã xảy ra lỗi khi tải lên ảnh. Vui lòng thử lại.');
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
