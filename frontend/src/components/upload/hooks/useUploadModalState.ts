import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import type { ImageData } from './useImageUpload';
import { useUploadTranslation } from '../UploadTranslationContext';
import { onLogout } from '@/utils/authEvents';

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
  const t = useUploadTranslation();
  const { settings } = useSiteSettings();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagesData, setImagesData] = useState<ImageData[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInProgressRef = useRef(false);
  const uploadGeneration = useRef(0);
  const mounted = useRef(true);
  const [uploadPass, setUploadPass] = useState(0);
  useEffect(() => { mounted.current = true;return () => { mounted.current = false; }; }, []);

  // Validate file based on settings
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      const maxSizeBytes = settings.maxUploadSize * 1024 * 1024; // Convert MB to bytes
      if (file.size > maxSizeBytes) {
        return {
          valid: false,
          error: t('upload.localSize', { size: settings.maxUploadSize }, 'File size exceeds maximum allowed size of {size} MB'),
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
          error: t('upload.localType', { types: settings.allowedFileTypes.join(', ') }, 'File type not allowed. Allowed types: {types}'),
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
    [settings, t]
  );

  // Initialize imagesData from selectedFiles
  useEffect(() => {
    if (selectedFiles.length > 0) {
      setImagesData((prev) => {
        // Create a map of existing images by file identity to preserve form data
        const existingMap = new Map<File, ImageData>();
        prev.forEach((img) => {
          const key = img.file;
          existingMap.set(key, img);
        });

        // Create new imagesData array
        const newImagesData = selectedFiles.map((file) => {
          const key = file;
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

  // Keep side effects outside state updaters; match File objects, never moving indices.
  useEffect(() => {
    if (uploadInProgressRef.current) return;
    const pending = imagesData.filter(img => !img.preUploadData && !img.isUploading && !img.uploadError);
    if (!pending.length) return;
    const generation = uploadGeneration.current;
    const current = () => mounted.current && generation === uploadGeneration.current;
    const files = new Set(pending.map(img => img.file));
    uploadInProgressRef.current = true;
    void preUploadAllImages(pending, preserveQuality, (index, progress) => {
      if (!current()) return;
      const file = pending[index]?.file;
      if (!file) return;
      setImagesData(previous => previous.map(img => img.file === file
        ? { ...img, isUploading: true, uploadProgress: Math.min(100, Math.max(0, progress)) } : img));
    }).then(results => {
      if (!current()) return;
      const uploaded = new Map(results.map(img => [img.file, img]));
      setImagesData(previous => previous.map(img => {
        const result = uploaded.get(img.file);
        return result ? { ...img, preUploadData: result.preUploadData, uploadProgress: result.uploadProgress,
          isUploading: false, uploadError: result.uploadError } : img;
      }));
      if (results.some(img => img.uploadError)) toast.error(t('upload.uploadFailed'));
      // Storage transfer is not publication; completion is shown only after processing.
    }).catch(error => {
      if (!current()) return;
      setImagesData(previous => previous.map(img => files.has(img.file)
        ? { ...img, isUploading: false, uploadError: error instanceof Error ? error.message : t('upload.uploadFailed') } : img));
    }).finally(() => {
      if (current()) {
        uploadInProgressRef.current = false;
        setUploadPass(pass => pass + 1);
      }
    });
  }, [imagesData, preUploadAllImages, preserveQuality, t, uploadPass]);

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
              t('upload.localAccepted', { accepted: validFiles.length, total: files.length }, '{accepted} of {total} files were accepted')
            );
          }
        }
      }
    },
    [validateFile, isAdmin, t]
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
              t('upload.localAccepted', { accepted: validFiles.length, total: files.length }, '{accepted} of {total} files were accepted')
            );
          }
        }

        // Reset the input so the same file can be selected again if needed
        e.target.value = '';
      }
    },
    [validateFile, isAdmin, t]
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
    uploadGeneration.current++;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  useEffect(() => onLogout(resetState), [resetState]);

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
