import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Image } from '@/types/image';
import { useInfiniteScroll } from './useInfiniteScroll';

interface UseRelatedImagesProps {
  image: Image;
  images: Image[];
  modalContentRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Calculate text similarity between two strings using Jaccard similarity
 * Returns a score between 0 and 1
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  // Normalize: lowercase, remove punctuation, split into words
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  // Calculate Jaccard similarity (intersection over union)
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Calculate location similarity
 * Handles exact matches, partial matches, and distance-based similarity
 */
function calculateLocationSimilarity(loc1?: string, loc2?: string): number {
  if (!loc1 || !loc2) return 0;

  const normalized1 = loc1.toLowerCase().trim();
  const normalized2 = loc2.toLowerCase().trim();

  // Exact match
  if (normalized1 === normalized2) return 1.0;

  // Check if one location contains the other (partial match)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.7;
  }

  // Check for common words in location names
  const words1 = normalized1.split(/[,\s]+/).filter(w => w.length > 2);
  const words2 = normalized2.split(/[,\s]+/).filter(w => w.length > 2);
  const commonWords = words1.filter(w => words2.includes(w));

  if (commonWords.length > 0) {
    return Math.min(commonWords.length / Math.max(words1.length, words2.length), 0.5);
  }

  return 0;
}

/**
 * Calculate tag overlap between two tag arrays
 * Returns a score between 0 and 1
 */
function calculateTagOverlap(tags1?: string[], tags2?: string[]): number {
  if (!tags1 || !tags2 || tags1.length === 0 || tags2.length === 0) return 0;

  const normalized1 = tags1.map(t => t.toLowerCase().trim()).filter(t => t.length > 0);
  const normalized2 = tags2.map(t => t.toLowerCase().trim()).filter(t => t.length > 0);

  if (normalized1.length === 0 || normalized2.length === 0) return 0;

  const set1 = new Set(normalized1);
  const set2 = new Set(normalized2);

  const intersection = new Set([...set1].filter(t => set2.has(t)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate color overlap between two dominant color arrays
 */
function calculateColorOverlap(colors1?: string[], colors2?: string[]): number {
  if (!colors1 || !colors2 || colors1.length === 0 || colors2.length === 0) return 0;

  const set1 = new Set(colors1);
  const set2 = new Set(colors2);

  const intersection = new Set([...set1].filter(c => set2.has(c)));
  
  // Return ratio of matching colors
  return intersection.size / Math.max(colors1.length, colors2.length);
}

/**
 * Calculate date proximity score
 * More recent images get a slight boost, images from similar time periods are more related
 */
function calculateDateProximity(date1?: string, date2?: string): number {
  if (!date1 || !date2) return 0;

  try {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();

    if (isNaN(d1) || isNaN(d2)) return 0;

    // Calculate difference in days
    const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

    // Images within 30 days get higher score, decays over time
    if (diffDays <= 30) return Math.max(0.5 - diffDays / 60, 0.1);
    if (diffDays <= 90) return 0.05;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate popularity score based on views and downloads
 * Normalized to 0-1 range
 */
function calculatePopularityScore(image: Image, maxViews: number, maxDownloads: number): number {
  const views = image.views || 0;
  const downloads = image.downloads || 0;

  if (maxViews === 0 && maxDownloads === 0) return 0;

  // Weight views and downloads equally
  const viewsScore = maxViews > 0 ? views / maxViews : 0;
  const downloadsScore = maxDownloads > 0 ? downloads / maxDownloads : 0;

  return (viewsScore + downloadsScore) / 2;
}

interface ScoredImage {
  image: Image;
  score: number;
  reasons: string[];
}

export const useRelatedImages = ({
  image,
  images,
  modalContentRef,
}: UseRelatedImagesProps) => {
  const [relatedImagesLimit, setRelatedImagesLimit] = useState(12);
  const [isLoadingRelatedImages, setIsLoadingRelatedImages] = useState(false);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);

  // Get related images with improved multi-factor scoring algorithm
  const { relatedImages, hasMoreRelatedImages } = useMemo(() => {
    if (!image || images.length === 0) {
      return { relatedImages: [], hasMoreRelatedImages: false };
    }

    // Get current image properties
    const currentCategoryId =
      typeof image.imageCategory === 'string'
        ? image.imageCategory
        : image.imageCategory?._id;
    const currentPhotographerId = image.uploadedBy?._id || image.uploadedBy;
    const currentLocation = image.location?.trim();
    const currentTitle = image.imageTitle?.trim() || '';
    const currentDescription = image.description?.trim() || '';
    const currentTags = image.tags || [];
    const currentColors = image.dominantColors || [];
    const currentDate = image.createdAt;

    // Calculate max views and downloads for normalization
    const maxViews = Math.max(...images.map(img => img.views || 0), 1);
    const maxDownloads = Math.max(...images.map(img => img.downloads || 0), 1);

    // Calculate relevance score for each image using multi-factor algorithm
    const scoredImages: ScoredImage[] = images
      .filter(img => img._id !== image._id) // Exclude current image
      .map(img => {
        let score = 0;
        const reasons: string[] = [];

        // Factor 1: Same photographer (highest priority - 120 points)
        const imgPhotographerId = img.uploadedBy?._id || img.uploadedBy;
        if (
          currentPhotographerId &&
          imgPhotographerId &&
          String(currentPhotographerId) === String(imgPhotographerId)
        ) {
          score += 120;
          reasons.push('same photographer');
        }

        // Factor 2: Location similarity (high priority - up to 80 points)
        const imgLocation = img.location?.trim();
        if (currentLocation && imgLocation) {
          const locationScore = calculateLocationSimilarity(currentLocation, imgLocation);
          if (locationScore > 0) {
            score += locationScore * 80;
            reasons.push(
              locationScore === 1.0
                ? 'same location'
                : `location similarity (${Math.round(locationScore * 100)}%)`
            );
          }
        }

        // Factor 3: Tag overlap (high priority - up to 70 points)
        const imgTags = img.tags || [];
        const tagOverlap = calculateTagOverlap(currentTags, imgTags);
        if (tagOverlap > 0) {
          score += tagOverlap * 70;
          reasons.push(`tag overlap (${Math.round(tagOverlap * 100)}%)`);
        }

        // Factor 4: Same category (medium-high priority - 40 points)
        const imgCategoryId =
          typeof img.imageCategory === 'string'
            ? img.imageCategory
            : img.imageCategory?._id;
        if (
          currentCategoryId &&
          imgCategoryId &&
          String(currentCategoryId) === String(imgCategoryId)
        ) {
          score += 40;
          reasons.push('same category');
        }

        // Factor 5: Title similarity (medium priority - up to 35 points)
        const imgTitle = img.imageTitle?.trim() || '';
        if (currentTitle && imgTitle) {
          const titleSimilarity = calculateTextSimilarity(currentTitle, imgTitle);
          if (titleSimilarity > 0) {
            score += titleSimilarity * 35;
            reasons.push(`title similarity (${Math.round(titleSimilarity * 100)}%)`);
          }
        }

        // Factor 6: Description similarity (medium priority - up to 30 points)
        const imgDescription = img.description?.trim() || '';
        if (currentDescription && imgDescription) {
          const descSimilarity = calculateTextSimilarity(currentDescription, imgDescription);
          if (descSimilarity > 0) {
            score += descSimilarity * 30;
            reasons.push(`description similarity (${Math.round(descSimilarity * 100)}%)`);
          }
        }

        // Factor 7: Color overlap (low-medium priority - up to 25 points)
        const imgColors = img.dominantColors || [];
        const colorOverlap = calculateColorOverlap(currentColors, imgColors);
        if (colorOverlap > 0) {
          score += colorOverlap * 25;
          reasons.push(`color match (${Math.round(colorOverlap * 100)}%)`);
        }

        // Factor 8: Date proximity (low priority - up to 15 points)
        const imgDate = img.createdAt;
        if (currentDate && imgDate) {
          const dateScore = calculateDateProximity(currentDate, imgDate);
          if (dateScore > 0) {
            score += dateScore * 15;
            reasons.push('recent upload');
          }
        }

        // Factor 9: Popularity boost (low priority - up to 10 points)
        // Only apply if we already have some relevance (score > 0)
        if (score > 0) {
          const popularityScore = calculatePopularityScore(img, maxViews, maxDownloads);
          score += popularityScore * 10;
        }

        return { image: img, score, reasons };
      })
      .filter(item => item.score >= 20); // Minimum threshold: require meaningful relevance

    // Sort by score descending, then by popularity if scores are close
    scoredImages.sort((a, b) => {
      // Primary sort: by score
      if (Math.abs(a.score - b.score) > 5) {
        return b.score - a.score;
      }
      // Secondary sort: by popularity if scores are very close
      const aPopularity = ((a.image.views || 0) + (a.image.downloads || 0)) / 2;
      const bPopularity = ((b.image.views || 0) + (b.image.downloads || 0)) / 2;
      return bPopularity - aPopularity;
    });

    // Extract just the images
    const filtered = scoredImages.map(item => item.image);

    // Return limited images for infinite scroll and check if more available
    return {
      relatedImages: filtered.slice(0, relatedImagesLimit),
      hasMoreRelatedImages: filtered.length > relatedImagesLimit,
    };
  }, [image, images, relatedImagesLimit]);

  // Load more related images handler
  const handleLoadMoreRelatedImages = useCallback(async () => {
    setIsLoadingRelatedImages(true);
    setRelatedImagesLimit(prev => prev + 12);
    // Reset loading state after a delay
    setTimeout(() => setIsLoadingRelatedImages(false), 300);
  }, []);

  // Update root element when ref becomes available (avoid accessing ref during render)
  useEffect(() => {
    setRootElement(modalContentRef.current);
  }, [modalContentRef]);

  // Infinite scroll for related images (modal content scrolling)
  const { loadMoreRef } = useInfiniteScroll({
    hasMore: hasMoreRelatedImages,
    isLoading: isLoadingRelatedImages,
    onLoadMore: handleLoadMoreRelatedImages,
    root: rootElement,
    rootMargin: '200px',
    delay: 300,
  });

  return {
    relatedImages,
    hasMoreRelatedImages,
    isLoadingRelatedImages,
    loadMoreRef,
  };
};
