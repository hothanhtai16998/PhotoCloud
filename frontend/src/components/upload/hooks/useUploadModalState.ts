import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import type { ImageData } from './useImageUpload';

interface UseUploadModalStateProps {
  preUploadAllImages: (
    imagesData: ImageData[],
    preserveQuality: boolean,
    onProgress?: (index: number, progress: number) => void
  ) => Promise<ImageData[]>;
  preserveQuality: boolean;
}

export const useUploadModalState = ({
  preUploadAllImages,
  preserveQuality,
}: UseUploadModalStateProps) => {
  const { settings } = useSiteSettings();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagesData, setImagesData] = useState<ImageData[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInProgressRef = useRef(false);

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
          error: 'File must be an image or video',
        };
      }

      return { valid: true };
    },
    [settings]
  );

  // Initialize imagesData when files are selected - use requestAnimationFrame to prevent blocking
  useEffect(() => {
    if (selectedFiles.length > 0) {
      // Defer state update to prevent blocking UI
      requestAnimationFrame(() => {
        setImagesData((prev) => {
          // Initialize or update imagesData array
          const newImagesData: ImageData[] = selectedFiles.map(
            (file, index) => {
              // If image data already exists for this file at this index, keep it; otherwise create new
              if (prev[index]?.file === file) {
                return prev[index];
              }
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
            }
          );
          return newImagesData;
        });
      });
    } else {
      setImagesData([]);
    }
  }, [selectedFiles]);

  // Auto-start pre-upload when imagesData is initialized with files - DEFERRED for performance
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

        // DEFER pre-upload to prevent blocking UI - use requestIdleCallback or setTimeout
        const startPreUpload = () => {
          // Set isUploading immediately for all images that need upload
          const updatedImagesData = imagesData.map((img) => {
            if (!img.preUploadData && !img.isUploading && !img.uploadError) {
              return {
                ...img,
                isUploading: true,
                uploadProgress: 0,
              };
            }
            return img;
          });

          // Update state first to show overlay immediately
          setImagesData(updatedImagesData);

          // Throttle frequent progress updates to reduce re-renders and input lag
          const lastUpdateRef = { time: 0 };
          const minIntervalMs = 300; // ~3 updates/sec (further reduced for better performance)

          // Use requestAnimationFrame to batch the initial state update
          requestAnimationFrame(() => {
            // Start pre-uploading after a delay to let UI render first
            setTimeout(() => {
              preUploadAllImages(
                updatedImagesData,
                preserveQuality,
                (index, progress) => {
                  const now = performance.now();
                  // Skip too-frequent intermediate updates
                  if (
                    now - lastUpdateRef.time < minIntervalMs &&
                    progress < 100
                  ) {
                    return;
                  }
                  lastUpdateRef.time = now;

                  // Batch state updates using requestAnimationFrame
                  requestAnimationFrame(() => {
                    setImagesData((prev) => {
                      const updated = [...prev];
                      if (updated[index]) {
                        updated[index] = {
                          ...updated[index],
                          uploadProgress: Math.min(100, Math.max(0, progress)),
                          isUploading: true,
                        };
                      }
                      return updated;
                    });
                  });
                }
              )
                .then((finalImagesData) => {
                  // Merge upload results with existing form data to preserve user input
                  requestAnimationFrame(() => {
                    setImagesData((prev) => {
                      return finalImagesData.map((finalImg, index) => {
                        const existingImg = prev[index];
                        if (!existingImg) return finalImg;

                        // Preserve all form fields from existing data (user input takes priority)
                        return {
                          ...finalImg, // Upload results (preUploadData, uploadProgress, isUploading, uploadError)
                          // Always preserve form fields from existing data if they exist
                          title: existingImg.title.trim()
                            ? existingImg.title
                            : finalImg.title,
                          category: existingImg.category.trim()
                            ? existingImg.category
                            : finalImg.category,
                          location: existingImg.location.trim()
                            ? existingImg.location
                            : finalImg.location,
                          coordinates:
                            existingImg.coordinates || finalImg.coordinates,
                          cameraModel: existingImg.cameraModel.trim()
                            ? existingImg.cameraModel
                            : finalImg.cameraModel,
                          tags:
                            existingImg.tags && existingImg.tags.length > 0
                              ? existingImg.tags
                              : finalImg.tags,
                          errors: existingImg.errors || finalImg.errors,
                        };
                      });
                    });

                    // Check if all uploads succeeded
                    const allSucceeded = finalImagesData.every(
                      (img) => img.preUploadData && !img.uploadError
                    );
                    if (allSucceeded) {
                      toast.success(
                        'Tất cả ảnh đã tải lên thành công! Bạn có thể gửi bây giờ.'
                      );
                    } else {
                      const failedCount = finalImagesData.filter(
                        (img) => img.uploadError
                      ).length;
                      if (failedCount > 0) {
                        toast.error(
                          `${failedCount} ảnh tải lên thất bại. Vui lòng thử lại.`
                        );
                      }
                    }
                  });
                })
                .catch((error) => {
                  console.error('Failed to pre-upload images:', error);
                  toast.error('Lỗi tải ảnh lên. Vui lòng thử lại.');
                })
                .finally(() => {
                  // Reset upload flag when done
                  uploadInProgressRef.current = false;
                });
            }, 300); // Delay to let UI render and prevent blocking
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
  }, [imagesData.length, preUploadAllImages]); // Only trigger when imagesData length changes (new files added)

  const handleDrag = useCallback((e: React.DragEvent) => {
    // Only handle file drags, ignore other drag operations
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      // Only handle file drops, ignore other drag operations
      if (!e.dataTransfer.types.includes('Files')) {
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
          toast.error(`Some files were rejected:\n${invalidFiles.join('\n')}`);
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
    [validateFile]
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
          toast.error(`Some files were rejected:\n${invalidFiles.join('\n')}`);
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
    [validateFile]
  );

  // Update image data when form fields change - optimized to prevent blocking
  const updateImageData = useCallback(
    (
      index: number,
      field: 'title' | 'category' | 'location' | 'cameraModel' | 'tags',
      value: string | string[]
    ) => {
      // Direct update without requestAnimationFrame for immediate feedback on input
      // The memoized components will prevent unnecessary re-renders
      setImagesData((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) return updated;
        const newErrors = { ...current.errors };
        if (field === 'title') {
          newErrors.title = undefined;
        } else if (field === 'category') {
          newErrors.category = undefined;
        }
        updated[index] = {
          ...current,
          [field]: value,
          errors: newErrors,
        };
        return updated;
      });
    },
    []
  );

  // Update coordinates for an image
  const updateImageCoordinates = useCallback(
    (
      index: number,
      coordinates: { latitude: number; longitude: number } | undefined
    ) => {
      setImagesData((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) return updated;
        updated[index] = {
          ...current,
          coordinates,
        };
        return updated;
      });
    },
    []
  );

  const resetState = useCallback(() => {
    setSelectedFiles([]);
    setImagesData([]);
    setDragActive(false);
    setShowTooltip(false);
    uploadInProgressRef.current = false;
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
