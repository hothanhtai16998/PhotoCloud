import { useEffect, useState, useRef, useCallback } from 'react';
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

/**
 * Custom hook for tracking image views and downloads
 * Handles view increment on mount and download increment on download
 */
export const useImageStats = ({
  image,
  onImageUpdate,
}: UseImageStatsProps): UseImageStatsReturn => {
  const [views, setViews] = useState<number>(image.views || 0);
  const [downloads, setDownloads] = useState<number>(image.downloads || 0);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);

  // Reset stats when image changes
  useEffect(() => {
    setViews(image.views || 0);
    setDownloads(image.downloads || 0);
    currentImageIdRef.current = image._id;
  }, [image._id, image.views, image.downloads]);

  // Increment view count when image is displayed (only once per image)
  useEffect(() => {
    const imageId = image._id;
    // Only increment if we haven't incremented for this image ID before
    if (imageId && !incrementedViewIds.current.has(imageId)) {
      incrementedViewIds.current.add(imageId);
      imageService.incrementView(imageId)
        .then((response) => {
          setViews(response.views);
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
        .catch((error) => {
          console.error('Failed to increment view:', error);
          // Remove from set on error so it can be retried
          incrementedViewIds.current.delete(imageId);
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
      setDownloads(response.downloads);
      // Update the image in the parent component if callback provided
      if (onImageUpdate) {
        onImageUpdate({
          ...image,
          downloads: response.downloads,
          dailyDownloads: response.dailyDownloads || image.dailyDownloads
        });
      }
    } catch (error) {
      console.error('Failed to increment download:', error);
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

