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
        withCredentials: true, // keep if your API needs cookies; otherwise your api client may use token
      }
    );

    const preUploadData: PreUploadResponse = metadataRes.data;

    // PUT to presigned URL must not include cookies/credentials
    await axios.put(preUploadData.uploadUrl, imageFile, {
      headers: {
        'Content-Type': imageFile.type || 'application/octet-stream',
      },
      timeout: 180000,
      withCredentials: false, // important for S3 presigned PUT
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
    const formData = new FormData();
    formData.append('image', data.image);
    formData.append('imageTitle', data.imageTitle);
    formData.append('imageCategory', data.imageCategory);

    if (data.location) {
      formData.append('location', data.location);
    }
    if (data.coordinates) {
      formData.append('coordinates', JSON.stringify(data.coordinates));
    }
    if (data.cameraModel) {
      formData.append('cameraModel', data.cameraModel);
    }

    const res = await api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
      timeout: 120000, // 2 minutes for uploads
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          // Calculate HTTP upload progress (uploading file to our backend)
          // Cap at 85% - the remaining 15% is for S3 upload and image processing on backend
          const httpProgress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // Show 0-85% during HTTP upload to backend
          const percentCompleted = Math.min(85, httpProgress);
          onUploadProgress(percentCompleted);
        }
      },
    });

    return res.data;
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
