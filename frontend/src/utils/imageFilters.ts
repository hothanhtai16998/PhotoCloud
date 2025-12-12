import type { Image } from '@/types/image';
import type { SearchFilters } from '@/components/SearchFilters';

/**
 * Filter images by date range
 */
export const filterByDateRange = (images: Image[], dateFrom: string, dateTo: string): Image[] => {
  if (!dateFrom && !dateTo) return images;

  return images.filter(img => {
    if (!img.createdAt) return false;
    
    const imgDate = new Date(img.createdAt);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null; // End of day

    if (fromDate && imgDate < fromDate) return false;
    if (toDate && imgDate > toDate) return false;
    
    return true;
  });
};

/**
 * Apply all filters to images
 * Note: Color and orientation filtering would ideally be done on backend
 * For now, we do date filtering on frontend
 */
export const applyImageFilters = (
  images: Image[],
  filters: SearchFilters,
  imageTypes: Map<string, 'portrait' | 'landscape' | 'square'>
): Image[] => {
  let filtered = [...images];

  // Filter by orientation (using imageTypes map)
  if (filters.orientation !== 'all') {
    filtered = filtered.filter(img => {
      const imgType = imageTypes.get(img._id);
      
      // If image type hasn't been determined yet, try to infer from image URL metadata
      // or exclude it to prevent showing wrong results
      if (!imgType) {
        // Try to preload image to determine type quickly
        // For now, we'll exclude undetermined images when filtering is active
        // This prevents showing wrong results (e.g., showing portrait as landscape)
        // In production, you'd want to store dimensions in backend metadata
        return false;
      }
      
      // Now filter based on determined type
      if (filters.orientation === 'portrait') {
        return imgType === 'portrait';
      } else if (filters.orientation === 'landscape') {
        return imgType === 'landscape';
      } else if (filters.orientation === 'square') {
        return imgType === 'square';
      }
      return true;
    });
  }

  // Filter by date range
  filtered = filterByDateRange(filtered, filters.dateFrom, filters.dateTo);

  // Note: Color filtering is now done on the backend for better performance
  // This frontend filter is kept as a fallback for client-side filtering
  // when backend filtering is not available
  if (filters.color !== 'all') {
    filtered = filtered.filter(img => {
      // If image doesn't have dominantColors, exclude it when filtering
      if (!img.dominantColors || img.dominantColors.length === 0) {
        return false;
      }
      
      // Check if the selected color is in the image's dominant colors
      return img.dominantColors.includes(filters.color);
    });
  }

  return filtered;
};

