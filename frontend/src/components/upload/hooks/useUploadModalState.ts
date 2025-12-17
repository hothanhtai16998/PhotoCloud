import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import type { ImageData } from './useImageUpload';
import { t } from '@/i18n';

interface UseUploadModalStateProps {
  preUploadAllImages: (
    imagesData: ImageData[],
    preserveQuality: boolean,
    onProgress?: (index: number, progress: number) => void
  ) => Promise<ImageData[]>;
  preserveQuality: boolean;
  isAdmin?: boolean;
}

export const useUploadModalState = ({
  preUploadAllImages,
  preserveQuality,
  isAdmin = false,
}: UseUploadModalStateProps) => {
  const { settings } = useSiteSettings();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagesData, setImagesData] = useState<ImageData[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInProgressRef = useRef(false);
  const lastUpdateRef = useRef({ time: 0 });

  // Validate file based on settings
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      const maxSizeBytes = settings.maxUploadSize * 1024 * 1024; // Convert MB to bytes
      if (file.size > maxSizeBytes) {
        return {
          valid: false,
          error: `File size exceeds maximum allowed size of ${settings.maxUploadSize} MB`,
        };
      }

      // Check file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (
        !fileExtension ||
        !settings.allowedFileTypes.includes(fileExtension)
      ) {
        return {
          valid: false,
          error: `File type not allowed. Allowed types: ${settings.allowedFileTypes.join(
            ', '
          )}`,
        };
      }

      // Check MIME type - allow images and videos
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        return {
          valid: false,
          error: t('upload.fileMustBeImageOrVideo'),
        };
      }

      return { valid: true };
    },
    [settings]
  );

  // Initialize imagesData from selectedFiles
  useEffect(() => {
    if (selectedFiles.length > 0) {
      setImagesData((prev) => {
        // Create a map of existing images by file identity to preserve form data
        const existingMap = new Map<string, ImageData>();
        prev.forEach((img) => {
          const key = `${img.file.name}-${img.file.size}`;
          existingMap.set(key, img);
        });

        // Create new imagesData array
        const newImagesData = selectedFiles.map((file) => {
          const key = `${file.name}-${file.size}`;
          const existing = existingMap.get(key);

          if (existing) {
            // Preserve existing data (form fields, preUploadData, etc.)
            return existing;
          }

          // Create new image data
          return {
            file,
            title: '',
            category: '', // Will be auto-filled for admin users
            location: '',
            coordinates: undefined,
            cameraModel: '',
            tags: [],
            errors: {},
            preUploadData: null,
            uploadProgress: 0,
            isUploading: false,
            uploadError: null,
          };
        });

        return newImagesData;
      });
    } else {
      setImagesData([]);
    }
  }, [selectedFiles]);

  // Auto-start pre-upload when imagesData is initialized with files
  useEffect(() => {
    if (
      imagesData.length > 0 &&
      preUploadAllImages &&
      !uploadInProgressRef.current
    ) {
      // Check if any images need to be uploaded
      const needsUpload = imagesData.some(
        (img) => !img.preUploadData && !img.isUploading && !img.uploadError
      );

      if (needsUpload) {
        // Prevent duplicate upload attempts
        uploadInProgressRef.current = true;

        // DEFER pre-upload to prevent blocking UI
        const startPreUpload = () => {
          // Throttle frequent progress updates
          const minIntervalMs = 200; // ~5 updates/sec - good balance between smoothness and performance

          // Get fresh state
          setImagesData((currentImagesData) => {
            // Filter to only images that need uploading
            const imagesNeedingUpload = currentImagesData.filter(
              (img) => !img.preUploadData && !img.isUploading && !img.uploadError
            );

            // If no images need uploading, skip
            if (imagesNeedingUpload.length === 0) {
              uploadInProgressRef.current = false;
              return currentImagesData;
            }

            // Create a map of file identity to index for progress callback
            const fileToIndexMap = new Map<string, number>();
            currentImagesData.forEach((img, idx) => {
              if (!img.preUploadData && !img.isUploading && !img.uploadError) {
                const fileKey = `${img.file.name}-${img.file.size}`;
                fileToIndexMap.set(fileKey, idx);
              }
            });

            // Set isUploading immediately for all images that need upload
            const updatedImagesData = currentImagesData.map((img) => {
              if (!img.preUploadData && !img.isUploading && !img.uploadError) {
                return {
                  ...img,
                  isUploading: true,
                  uploadProgress: 0,
                };
              }
              return img;
            });

            // Start uploading - pass ALL images that need uploading
            // preUploadAllImages will process them in batches of 3
            preUploadAllImages(
              imagesNeedingUpload,
              preserveQuality,
              (uploadIndex, progress) => {
                // Map uploadIndex back to actual array index using file identity
                const uploadedImg = imagesNeedingUpload[uploadIndex];
                if (!uploadedImg) return;

                const fileKey = `${uploadedImg.file.name}-${uploadedImg.file.size}`;
                const actualIndex = fileToIndexMap.get(fileKey);
                if (actualIndex === undefined) return;

                const now = performance.now();
                // Always update at 0% and 100% for immediate feedback
                const isBoundary = progress === 0 || progress === 100;
                const timeSinceLastUpdate = now - lastUpdateRef.current.time;

                if (!isBoundary && timeSinceLastUpdate < minIntervalMs) {
                  return; // Skip too-frequent intermediate updates
                }
                lastUpdateRef.current.time = now;

                // Batch state updates using requestAnimationFrame
                requestAnimationFrame(() => {
                  setImagesData((prev) => {
                    const updated = [...prev];
                    if (updated[actualIndex]) {
                      updated[actualIndex] = {
                        ...updated[actualIndex],
                        uploadProgress: Math.min(100, Math.max(0, progress)),
                        isUploading: true,
                      };
                    }
                    return updated;
                  });
                });
              }
            )
              .then((uploadedImagesData) => {
                // Map uploaded results back to full array by matching file identity
                requestAnimationFrame(() => {
                  setImagesData((prev) => {
                    return prev.map((existingImg) => {
                      // Find matching uploaded image by file identity
                      const uploadedImg = uploadedImagesData.find(
                        (u) =>
                          u.file.name === existingImg.file.name &&
                          u.file.size === existingImg.file.size
                      );

                      if (uploadedImg && uploadedImg.preUploadData) {
                        // Merge: uploaded data + existing form fields
                        return {
                          ...uploadedImg,
                          // Preserve form fields from existing data
                          title: existingImg.title.trim()
                            ? existingImg.title
                            : uploadedImg.title,
                          category: existingImg.category.trim()
                            ? existingImg.category
                            : uploadedImg.category,
                          location: existingImg.location.trim()
                            ? existingImg.location
                            : uploadedImg.location,
                          coordinates:
                            existingImg.coordinates || uploadedImg.coordinates,
                          cameraModel: existingImg.cameraModel.trim()
                            ? existingImg.cameraModel
                            : uploadedImg.cameraModel,
                          tags:
                            existingImg.tags && existingImg.tags.length > 0
                              ? existingImg.tags
                              : uploadedImg.tags,
                          errors: existingImg.errors || uploadedImg.errors,
                        };
                      }
                      return existingImg;
                    });
                  });
                });

                // Check if all uploads succeeded
                const allSucceeded = uploadedImagesData.every(
                  (img) => img.preUploadData && !img.uploadError
                );
                if (allSucceeded && uploadedImagesData.length > 0) {
                  toast.success(t('upload.allUploadedSuccess'));
                } else {
                  const failedCount = uploadedImagesData.filter(
                    (img) => img.uploadError
                  ).length;
                  if (failedCount > 0) {
                    toast.error(t('upload.uploadFailed'));
                  }
                }
              })
              .catch((error) => {
                console.error('Failed to pre-upload images:', error);
                toast.error(t('upload.uploadFailed'));
              })
              .finally(() => {
                uploadInProgressRef.current = false;
              });

            return updatedImagesData;
          });
        };

        // Use requestIdleCallback if available, otherwise setTimeout
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(startPreUpload, { timeout: 500 });
        } else {
          setTimeout(startPreUpload, 300);
        }
      } else {
        // No upload needed, reset flag
        uploadInProgressRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imagesData.length,
    // Also trigger when imagesData changes (e.g., when preUploadData is added)
    // This ensures remaining images are picked up after a batch completes
    imagesData.map((img) => (img.preUploadData ? 'uploaded' : 'pending')).join(','),
    preUploadAllImages,
    preserveQuality,
  ]); // Trigger when imagesData length changes, upload status changes, or when upload completes

  const handleDrag = useCallback((e: React.DragEvent) => {
    // Only handle file drags, ignore other drag operations
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    if (e.type === 'dragenter' || e.type === 'dragover') {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (!e.dataTransfer.files || !e.dataTransfer.types.includes('Files')) {
        return;
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];

        files.forEach((file) => {
          const validation = validateFile(file);
          if (validation.valid) {
            validFiles.push(file);
          } else {
            invalidFiles.push(`${file.name}: ${validation.error}`);
          }
        });

        if (invalidFiles.length > 0) {
          toast.error(
            `${t('upload.someFilesRejected')}:\n${invalidFiles.join('\n')}`
          );
        }

        if (validFiles.length > 0) {
          // Append new files to existing ones instead of replacing
          setSelectedFiles((prev) => {
            // Check for duplicates by name and size
            const existingFileKeys = new Set(
              prev.map((f) => `${f.name}-${f.size}`)
            );
            const newFiles = validFiles.filter(
              (f) => !existingFileKeys.has(`${f.name}-${f.size}`)
            );

            // Enforce 10 image limit (skip for admins)
            if (!isAdmin) {
              const maxImages = 10;
              const currentCount = prev.length;
              const remainingSlots = maxImages - currentCount;

              if (remainingSlots <= 0) {
                toast.error(t('upload.maxImagesReached', { max: maxImages }));
                return prev;
              }

              const filesToAdd = newFiles.slice(0, remainingSlots);
              if (newFiles.length > remainingSlots) {
                toast.warning(
                  t('upload.maxImagesExceeded', {
                    max: maxImages,
                    selected: newFiles.length,
                    added: remainingSlots,
                  })
                );
              }

              return [...prev, ...filesToAdd];
            }

            // Admins can upload unlimited images
            return [...prev, ...newFiles];
          });
          if (validFiles.length < files.length) {
            toast.warning(
              `${validFiles.length} of ${files.length} files were accepted`
            );
          }
        }
      }
    },
    [validateFile, isAdmin]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];

        files.forEach((file) => {
          const validation = validateFile(file);
          if (validation.valid) {
            validFiles.push(file);
          } else {
            invalidFiles.push(`${file.name}: ${validation.error}`);
          }
        });

        if (invalidFiles.length > 0) {
          toast.error(
            `${t('upload.someFilesRejected')}:\n${invalidFiles.join('\n')}`
          );
        }

        if (validFiles.length > 0) {
          // Append new files to existing ones instead of replacing
          setSelectedFiles((prev) => {
            // Check for duplicates by name and size
            const existingFileKeys = new Set(
              prev.map((f) => `${f.name}-${f.size}`)
            );
            const newFiles = validFiles.filter(
              (f) => !existingFileKeys.has(`${f.name}-${f.size}`)
            );

            // Enforce 10 image limit (skip for admins)
            if (!isAdmin) {
              const maxImages = 10;
              const currentCount = prev.length;
              const remainingSlots = maxImages - currentCount;

              if (remainingSlots <= 0) {
                toast.error(t('upload.maxImagesReached', { max: maxImages }));
                return prev;
              }

              const filesToAdd = newFiles.slice(0, remainingSlots);
              if (newFiles.length > remainingSlots) {
                toast.warning(
                  t('upload.maxImagesExceeded', {
                    max: maxImages,
                    selected: newFiles.length,
                    added: remainingSlots,
                  })
                );
              }

              return [...prev, ...filesToAdd];
            }

            // Admins can upload unlimited images
            return [...prev, ...newFiles];
          });
          if (validFiles.length < files.length) {
            toast.warning(
              `${validFiles.length} of ${files.length} files were accepted`
            );
          }
        }

        // Reset the input so the same file can be selected again if needed
        e.target.value = '';
      }
    },
    [validateFile, isAdmin]
  );

  // Update image data when form fields change - optimized to prevent blocking
  const updateImageData = useCallback(
    (
      index: number,
      field: 'title' | 'category' | 'location' | 'cameraModel' | 'tags',
      value: string | string[]
    ) => {
      setImagesData((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            [field]: value,
            // Clear errors when user updates the field
            errors: {
              ...updated[index].errors,
              [field]: undefined,
            },
          };
        }
        return updated;
      });
    },
    []
  );

  // Update image coordinates
  const updateImageCoordinates = useCallback(
    (index: number, coordinates: { latitude: number; longitude: number } | undefined) => {
      setImagesData((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            coordinates,
          };
        }
        return updated;
      });
    },
    []
  );

  // Reset all state
  const resetState = useCallback(() => {
    setSelectedFiles([]);
    setImagesData([]);
    setDragActive(false);
    setShowTooltip(false);
    uploadInProgressRef.current = false;
    lastUpdateRef.current = { time: 0 };
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return {
    dragActive,
    selectedFiles,
    setSelectedFiles,
    imagesData,
    setImagesData,
    showTooltip,
    setShowTooltip,
    fileInputRef,
    handleDrag,
    handleDrop,
    handleFileInput,
    updateImageData,
    updateImageCoordinates,
    resetState,
  };
};
