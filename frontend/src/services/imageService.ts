/**
 * Image Service - Re-exports all image-related services for backward compatibility
 *
 * This file maintains backward compatibility by re-exporting all methods
 * from the split services. New code should import from the specific services:
 * - imageUploadService - upload operations
 * - imageFetchService - fetch operations
 * - imageUpdateService - update operations
 * - imageStatsService - stats operations
 */

import api from '@/lib/axios';
import type { Image } from '@/types/image';
import { imageUploadService } from './imageUploadService';
import { imageFetchService } from './imageFetchService';
import { imageUpdateService } from './imageUpdateService';
import { imageStatsService } from './imageStatsService';

interface GetImagesParams {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
  sortBy?: string;
  order?: 'asc' | 'desc';
}

interface GetImagesResponse {
  images: Image[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const imageService = {
  // Upload operations
  preUploadImage: imageUploadService.preUploadImage,
  deletePreUploadedFile: imageUploadService.deletePreUploadedFile,
  finalizeImageUpload: imageUploadService.finalizeImageUpload,
  uploadImage: imageUploadService.uploadImage,
  createBulkUploadNotification: imageUploadService.createBulkUploadNotification,

  // Fetch operations
  fetchImages: imageFetchService.fetchImages,
  fetchUserImages: imageFetchService.fetchUserImages,
  fetchLocations: imageFetchService.fetchLocations,

  // Update operations
  updateImage: imageUpdateService.updateImage,
  updateImageWithFile: imageUpdateService.updateImageWithFile,
  batchUpdateImages: imageUpdateService.batchUpdateImages,

  // Stats operations
  incrementView: imageStatsService.incrementView,
  incrementDownload: imageStatsService.incrementDownload,

  // Get images method
  async getImages(params: GetImagesParams = {}): Promise<GetImagesResponse> {
    const { page = 1, limit = 30, category, tags, sortBy, order } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (category) queryParams.append('category', category);
    if (tags && tags.length > 0) queryParams.append('tags', tags.join(','));
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (order) queryParams.append('order', order);

    const response = await api.get(`/images?${queryParams.toString()}`);
    return response.data;
  },
};

// Re-export individual services for direct imports
export { imageUploadService } from './imageUploadService';
export { imageFetchService } from './imageFetchService';
export { imageUpdateService } from './imageUpdateService';
export { imageStatsService } from './imageStatsService';
