import type { Image, FetchImagesParams } from '@/types/image';

/**
 * Constants for image store configuration
 */
export const IMAGE_STORE_CONFIG = {
  /** Time threshold for considering an image as "recently uploaded" (15 minutes) */
  RECENT_UPLOAD_THRESHOLD_MS: 15 * 60 * 1000,
  /** Maximum number of deleted image IDs to cache */
  MAX_DELETED_IDS_CACHE: 1000,
} as const;

/**
 * Check if query parameters indicate a new search/filter change
 */
export function isNewQuery(params?: FetchImagesParams): boolean {
  return (
    params?.search !== undefined ||
    params?.category !== undefined ||
    params?.location !== undefined ||
    params?.page === 1 ||
    !params?.page
  );
}

/**
 * Check if category, search, or location changed compared to current state
 */
export function hasFiltersChanged(
  params: FetchImagesParams | undefined,
  currentCategory: string | undefined,
  currentSearch: string | undefined,
  currentLocation: string | undefined
): {
  categoryChanged: boolean;
  searchChanged: boolean;
  locationChanged: boolean;
} {
  return {
    categoryChanged:
      params?.category !== undefined && params.category !== currentCategory,
    searchChanged:
      params?.search !== undefined && params.search !== currentSearch,
    locationChanged:
      params?.location !== undefined && params.location !== currentLocation,
  };
}

/**
 * Check if an image was uploaded recently (within threshold)
 */
function isRecentUpload(image: Image, now: number): boolean {
  if (!image.createdAt) return false;

  try {
    const uploadTime = new Date(image.createdAt).getTime();
    if (isNaN(uploadTime)) return false;
    return now - uploadTime < IMAGE_STORE_CONFIG.RECENT_UPLOAD_THRESHOLD_MS;
  } catch {
    return false;
  }
}

/**
 * Check if image category matches the current filter
 */
function matchesCategoryFilter(
  image: Image,
  categoryFilter: string | undefined
): boolean {
  if (categoryFilter === undefined) return true;

  const imgCategoryName =
    typeof image.imageCategory === 'string'
      ? image.imageCategory
      : image.imageCategory?.name;

  return imgCategoryName?.toLowerCase() === categoryFilter.toLowerCase();
}

/**
 * Filter recent uploads that should be preserved during a new query
 */
export function filterRecentUploads(
  existingImages: Image[],
  params: FetchImagesParams | undefined,
  isRefresh: boolean
): Image[] {
  const now = Date.now();
  const currentCategory = params?.category;

  return existingImages.filter((img) => {
    const isRecent = isRecentUpload(img, now);

    if (isRecent) {
      // Check if category matches current filter
      if (currentCategory !== undefined) {
        return matchesCategoryFilter(img, currentCategory);
      }
      // If no category filter, preserve all recent uploads
      return true;
    }

    // During refresh after deletion without category filter
    if (isRefresh && currentCategory === undefined && img.createdAt) {
      return true;
    }

    return false;
  });
}

/**
 * Merge new images with existing ones, avoiding duplicates
 */
export function mergeImages(
  _existingImages: Image[],
  newImages: Image[],
  recentUploads: Image[]
): Image[] {
  const fetchedIds = new Set(newImages.map((img) => img._id));

  // Keep recent uploads that aren't in the fetched response
  const uniqueRecentUploads = recentUploads.filter(
    (img) => !fetchedIds.has(img._id)
  );

  // Combine and sort by createdAt descending (newest first)
  const combined = [...uniqueRecentUploads, ...newImages];

  combined.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    // If dates are equal or very close (within 1 second), preserve recent uploads first
    if (Math.abs(dateB - dateA) < 1000) {
      const aIsRecent = uniqueRecentUploads.some((ru) => ru._id === a._id);
      const bIsRecent = uniqueRecentUploads.some((ru) => ru._id === b._id);
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
    }

    return dateB - dateA;
  });

  return combined;
}

/**
 * Append new images for pagination, avoiding duplicates
 */
export function appendImages(
  existingImages: Image[],
  newImages: Image[]
): Image[] {
  const existingIds = new Set(existingImages.map((img) => img._id));
  const uniqueNewImages = newImages.filter((img) => !existingIds.has(img._id));
  return [...existingImages, ...uniqueNewImages];
}

/**
 * Filter out deleted images from a list
 */
export function filterDeletedImages(
  images: Image[],
  deletedIds: string[]
): Image[] {
  const deletedIdsSet = new Set(deletedIds);
  return images.filter((img) => !deletedIdsSet.has(img._id));
}

/**
 * Trim deleted IDs array to prevent memory leak
 */
export function trimDeletedIds(deletedIds: string[]): string[] {
  if (deletedIds.length > IMAGE_STORE_CONFIG.MAX_DELETED_IDS_CACHE) {
    return deletedIds.slice(-IMAGE_STORE_CONFIG.MAX_DELETED_IDS_CACHE);
  }
  return deletedIds;
}
