import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';

interface UseImageStatsProps {
  image: Image;
  onImageUpdate?: (updatedImage: Image) => void;
}

interface UseImageStatsReturn {
  views: number;
  downloads: number;
  handleDownload: (e: React.MouseEvent, onDownload?: (image: Image, e: React.MouseEvent) => void) => Promise<void>;
}

// Module-level cache to persist API stats across component unmounts
// This ensures stats persist when modal closes and reopens
const apiStatsCache = new Map<string, { views?: number; downloads?: number }>();

/**
 * Custom hook for tracking image views and downloads
 * Handles view increment on mount and download increment on download
 */
export const useImageStats = ({
  image,
  onImageUpdate,
}: UseImageStatsProps): UseImageStatsReturn => {
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);
  
  // Initialize state - use API stats from cache if available, otherwise use img data as fallback
  const getInitialStats = () => {
        if (!image?._id) return { views: 0, downloads: 0 };
        const apiStats = apiStatsCache.get(image._id);
        return {
            // Views: prefer API stats from cache, but use img data as initial value (will update when API responds)
            views: apiStats?.views ?? (image.views || 0),
            // Downloads: prefer API stats from cache, but use img data as initial value (usually accurate)
            downloads: apiStats?.downloads ?? (image.downloads || 0),
        };
    };
    
  const [views, setViews] = useState<number>(getInitialStats().views);
  const [downloads, setDownloads] = useState<number>(getInitialStats().downloads);

  // Update stats when image changes - prioritize API stats, fallback to img data
  // Use useLayoutEffect to update synchronously before browser paint to prevent flash
  useLayoutEffect(() => {
    if (!image?._id) return;
    
    const imageId = image._id;
    const isNewImage = currentImageIdRef.current !== imageId;
    
    if (isNewImage) {
      currentImageIdRef.current = imageId;
      // Reset the incremented set for the new image
      incrementedViewIds.current.delete(imageId);
    }
    
    // Check if we have API-updated stats for this image from cache (highest priority)
    const apiStats = apiStatsCache.get(imageId);
    
    // Always update to the correct value immediately (before paint)
    if (apiStats) {
      // Use API-updated values if available (they're the most accurate)
      if (apiStats.views !== undefined) {
        setViews(apiStats.views);
      } else if (isNewImage) {
        // New image, no API views yet - use img data as initial value
        setViews(image.views || 0);
      }
      
      if (apiStats.downloads !== undefined) {
        setDownloads(apiStats.downloads);
      } else if (isNewImage) {
        // New image, no API downloads yet - use img data as initial value
        setDownloads(image.downloads || 0);
      }
    } else if (isNewImage) {
      // New image, no API stats - use img data as initial value
      // Views will update when API responds, downloads usually stay the same
      setViews(image.views || 0);
      setDownloads(image.downloads || 0);
    }
    // If same image and no API stats, keep current state (don't reset from stale img)
  }, [image._id]);

  // Increment view count when image is displayed (only once per image)
  // This also fetches the current stats, so we use the response to update our state
  useEffect(() => {
    const imageId = image._id;
    // Only increment if we haven't incremented for this image ID before
    if (imageId && !incrementedViewIds.current.has(imageId)) {
      incrementedViewIds.current.add(imageId);
      imageService.incrementView(imageId)
        .then((response) => {
          // Update state with API response (this is the correct value)
          setViews(response.views);
          // Track that this stat was updated via API in module-level cache
          const stats = apiStatsCache.get(imageId) || {};
          stats.views = response.views;
          apiStatsCache.set(imageId, stats);
          
          // Update the image in the parent component if callback provided
          if (onImageUpdate && currentImageIdRef.current === imageId) {
            const mergedDailyViews = {
              ...(image.dailyViews || {}),
              ...(response.dailyViews || {})
            };
            onImageUpdate({
              ...image,
              views: response.views,
              dailyViews: mergedDailyViews
            });
          }
        })
        .catch((error: any) => {
          // Handle rate limiting gracefully
          if (error.response?.status === 429) {
            const rateLimitData = error.response.data;
            if (rateLimitData.views !== undefined) {
              // Even if rate limited, we got the current view count
              setViews(rateLimitData.views);
              // Track that this stat was updated via API in module-level cache (even if rate limited)
              const stats = apiStatsCache.get(imageId) || {};
              stats.views = rateLimitData.views;
              apiStatsCache.set(imageId, stats);
            }
          } else {
            console.error('Failed to increment view:', error);
            // Remove from set on error so it can be retried
            incrementedViewIds.current.delete(imageId);
          }
        });
    }
    // Only depend on image._id to avoid re-running when image object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id]);

  // Handle download with increment
  const handleDownload = useCallback(async (
    e: React.MouseEvent,
    onDownload?: (image: Image, e: React.MouseEvent) => void
  ) => {
    e.stopPropagation();
    // Increment download count
    try {
      const response = await imageService.incrementDownload(image._id);
      // Update state with API response (this is the correct value)
      setDownloads(response.downloads);
      // Track that this stat was updated via API in module-level cache
      const stats = apiStatsCache.get(image._id) || {};
      stats.downloads = response.downloads;
      apiStatsCache.set(image._id, stats);
      
      // Update the image in the parent component if callback provided
      if (onImageUpdate) {
        onImageUpdate({
          ...image,
          downloads: response.downloads,
          dailyDownloads: response.dailyDownloads || image.dailyDownloads
        });
      }
    } catch (error: any) {
      // Handle rate limiting gracefully
      if (error.response?.status === 429) {
        const rateLimitData = error.response.data;
        if (rateLimitData.downloads !== undefined) {
          // Even if rate limited, we got the current download count
          setDownloads(rateLimitData.downloads);
          // Track that this stat was updated via API in module-level cache (even if rate limited)
          const stats = apiStatsCache.get(image._id) || {};
          stats.downloads = rateLimitData.downloads;
          apiStatsCache.set(image._id, stats);
        }
      } else {
        console.error('Failed to increment download:', error);
      }
    }
    // Then trigger the download callback if provided
    if (onDownload) {
      onDownload(image, e);
    }
  }, [image, onImageUpdate]);

  return {
    views,
    downloads,
    handleDownload,
  };
};

