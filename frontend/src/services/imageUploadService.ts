import axios from 'axios';
import api from '@/lib/api';
import type { UploadImageData } from '@/types/store';
import type {
  PreUploadResponse,
  FinalizeImageData,
  FinalizeImageResponse,
} from '@/types/image';

/**
 * Upload file using XMLHttpRequest for better performance and progress tracking
 * This is more efficient than axios for large file uploads
 */
function uploadFileWithXHR(
  file: File,
  uploadUrl: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Use requestAnimationFrame to throttle progress updates and prevent UI blocking
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE_MS = 50; // Update progress max once per 50ms

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const now = Date.now();
        if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
          const percentCompleted = Math.round((e.loaded / e.total) * 100);
          // Use requestAnimationFrame to ensure UI updates don't block
          requestAnimationFrame(() => {
            onProgress(percentCompleted);
          });
          lastProgressUpdate = now;
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Set timeout (3 minutes for large files)
    xhr.timeout = 180000;
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    // Don't set withCredentials for presigned URLs (causes CORS issues)
    xhr.send(file);
  });
}

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

    // Use XMLHttpRequest for better performance and non-blocking progress updates
    // This is more efficient than axios for large file uploads
    await uploadFileWithXHR(
      imageFile,
      preUploadData.uploadUrl,
      imageFile.type || 'application/octet-stream',
      onUploadProgress
    );

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
