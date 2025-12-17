import axios from 'axios';
import api from '@/lib/api';
import type { UploadImageData } from '@/types/store';
import type {
  PreUploadResponse,
  FinalizeImageData,
  FinalizeImageResponse,
} from '@/types/image';

export const imageUploadService = {
  // Delete pre-uploaded file (before finalization)
  deletePreUploadedFile: async (uploadKey: string): Promise<void> => {
    await api.delete('/images/pre-upload', {
      data: { uploadKey },
      withCredentials: true,
    });
  },

  // Pre-upload: Upload image to R2 only (no database record)
  preUploadImage: async (
    imageFile: File,
    onUploadProgress?: (progress: number) => void
  ): Promise<PreUploadResponse> => {
    // NOTE: backend route is /api/images/preupload (no dash) so call '/images/preupload'
    const metadataRes = await api.post(
      '/images/pre-upload',
      {
        fileName: imageFile.name || 'upload.jpg',
        fileType: imageFile.type || 'application/octet-stream',
        fileSize: imageFile.size,
      },
      {
        withCredentials: true,
      }
    );

    const preUploadData: PreUploadResponse = metadataRes.data;

    // Simple retry wrapper for transient network errors
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      try {
        attempt += 1;

        // PUT to presigned URL must not include cookies/credentials
        await axios.put(preUploadData.uploadUrl, imageFile, {
          headers: {
            'Content-Type': imageFile.type || 'application/octet-stream',
          },
          timeout: 180000,
          withCredentials: false,
          onUploadProgress: (progressEvent) => {
            if (onUploadProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onUploadProgress(percentCompleted);
            }
          },
        });

        onUploadProgress?.(100);
        return preUploadData;
      } catch (error: any) {
        lastError = error;
        // For 4xx errors (bad URL, forbidden, etc.) don't retry
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) {
          break;
        }
        // Small backoff before next attempt
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('Failed to upload image to storage');
  },

  // Finalize: Link metadata to pre-uploaded image and create database record
  finalizeImageUpload: async (
    data: FinalizeImageData
  ): Promise<FinalizeImageResponse> => {
    const res = await api.post('/images/finalize', data, {
      withCredentials: true,
      timeout: 120000, // allow up to 2 minutes for Sharp processing
    });

    return res.data;
  },

  // Legacy upload method (kept for backward compatibility)
  uploadImage: async (
    data: UploadImageData,
    onUploadProgress?: (progress: number) => void
  ) => {
    // New implementation: route everything through pre-upload + finalize pipeline
    // to avoid long-running /images/upload requests.

    const file = data.image;

    // Step 1: Upload file to storage (scale 0–85% to keep compatibility with old callers)
    let preUpload: PreUploadResponse;
    preUpload = await imageUploadService.preUploadImage(file, (progress) => {
      if (onUploadProgress) {
        const scaled = Math.round((progress * 85) / 100);
        onUploadProgress(scaled);
      }
    });

    // Step 2: Finalize metadata (fast call)
    const finalizePayload: FinalizeImageData = {
      uploadId: preUpload.uploadId,
      uploadKey: preUpload.uploadKey,
      imageTitle: data.imageTitle?.trim() || undefined,
      imageCategory: data.imageCategory?.trim() || undefined,
      location: data.location?.trim() || undefined,
      cameraModel: data.cameraModel?.trim() || undefined,
      coordinates: data.coordinates,
      tags: data.tags,
    };

    const finalizeRes = await api.post<FinalizeImageResponse>(
      '/images/finalize',
      finalizePayload,
      {
        withCredentials: true,
        timeout: 60000,
      }
    );

    // Step 3: Simulate remaining 15% (processing) for old progress UIs
    if (onUploadProgress) {
      let progress = 85;
      const step = 3;
      while (progress < 100) {
        progress = Math.min(100, progress + step);
        onUploadProgress(progress);
        // short delay to show animation but not block too long
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    return finalizeRes.data;
  },

  /**
   * Create bulk upload notification
   */
  createBulkUploadNotification: async (
    successCount: number,
    totalCount: number,
    failedCount?: number
  ): Promise<void> => {
    try {
      await api.post(
        '/images/bulk-upload-notification',
        {
          successCount,
          totalCount,
          failedCount: failedCount || 0,
        },
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      // Silently fail - don't interrupt upload flow if notification fails
      console.error('Failed to create bulk upload notification:', error);
    }
  },
};
