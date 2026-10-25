import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { categoryService, type Category } from '@/services/categoryService';
import { imageService } from '@/services/imageService';
import type { PreUploadResponse, FinalizeImageData } from '@/types/image';
import type { Coordinates } from '@/types/common';
import { compressImage } from '@/utils/imageCompression';
import { useUploadTranslation } from '../UploadTranslationContext';
import { runUploadBatch } from '@/utils/uploadProcessing';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import { onLogout } from '@/utils/authEvents';

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
  const t = useUploadTranslation();
  const submission = useRef<AbortController | null>(null);
  const notifiedBatches = useRef(new Set<string>());
  useEffect(() => () => { submission.current?.abort(); }, []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(0);
  const [totalUploads, setTotalUploads] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);


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
    [t]
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
        const errorMessage = getErrorMessage(error, t('upload.uploadFailed'));
        throw new Error(errorMessage);
      }
    },
    [t]
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

      await runUploadBatch(imagesData.length, 3, startUploadForIndex);
      return updatedImagesData;
    },
    [preUploadSingleImage, t]
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

      if (submission.current) return false;
      toast.dismiss('upload-finalize-error');
      const controller = new AbortController();
      submission.current = controller;
      const session = getAuthSessionVersion();
      const isCurrent = () => !controller.signal.aborted && session === getAuthSessionVersion();
      setIsFinalizing(true);
      setShowSuccess(false);
      setShowProgress(true);
      setTotalUploads(imagesData.length);
      setUploadingIndex(0);
      let completed = 0;
      try {
        const results = await runUploadBatch(imagesData.length, 3, async index => {
          const img = imagesData[index];
          try {
            if (!img.preUploadData || !isCurrent()) throw new DOMException('Upload cancelled', 'AbortError');
            const payload: FinalizeImageData = {
              uploadId: img.preUploadData.uploadId, uploadKey: img.preUploadData.uploadKey,
              imageTitle: img.title.trim() || undefined,
              imageCategory: img.category.trim() || undefined,
              location: img.location.trim() || undefined, coordinates: img.coordinates,
              cameraModel: img.cameraModel.trim() || undefined, tags: img.tags.length ? img.tags : undefined,
            };
            const response = await imageService.finalizeImageUpload(payload, controller.signal);
            if (!response.image || !isCurrent()) throw new DOMException('Upload cancelled', 'AbortError');
            completed++;
            setUploadingIndex(completed);
            // Refresh only after the database image exists, also for partial batches.
            window.dispatchEvent(new CustomEvent('refreshProfile', { detail: { optimisticImages: [response.image] } }));
            window.dispatchEvent(new CustomEvent('imageUploaded'));
            return { image: response.image, error: null };
          } catch (error) {
            return { image: null, error: getErrorMessage(error, t('upload.uploadFailed')) };
          }
        });
        if (!isCurrent()) return false;
        const failed = results.filter(result => result.error);
        if (failed.length) {
          setShowSuccess(false);
          toast.error(failed[0].error, { id: 'upload-finalize-error' });
          // Keep the form and original upload IDs for an idempotent retry.
          return false;
        }
        const batchId = imagesData.map(img => img.preUploadData?.uploadId).join(',');
        if (imagesData.length > 1 && !notifiedBatches.current.has(batchId)) {
          notifiedBatches.current.add(batchId);
          void imageService.createBulkUploadNotification(completed, imagesData.length, 0);
        }
        setShowSuccess(true);
        onSuccess?.();
        return true;
      } finally {
        if (submission.current === controller) submission.current = null;
        if (!controller.signal.aborted) {
          setShowProgress(false);
          setIsFinalizing(false);
        }
      }
    },
    [validateAllImages, onSuccess, t]
  );

  const resetUploadState = useCallback(() => {
    toast.dismiss('upload-finalize-error');
    submission.current?.abort();
    submission.current = null;
    setShowProgress(false);
    setShowSuccess(false);
    setUploadingIndex(0);
    setTotalUploads(0);
    setIsFinalizing(false);

  }, []);

  useEffect(() => onLogout(resetUploadState), [resetUploadState]);

  // Calculate overall upload progress
  const uploadProgress = 0; // Finalization progress is tracked by uploadingIndex.

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
