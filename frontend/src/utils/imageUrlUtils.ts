/**
 * Shared utilities for getting image URLs with AVIF support
 * Consolidates duplicate image URL logic across components
 */

import type { Image } from '@/types/image';

/**
 * Get the best image URL based on AVIF support and size preference
 * @param image - Image object
 * @param size - Preferred size: 'thumbnail' | 'small' | 'regular' | 'original'
 * @param supportsAvif - Whether browser supports AVIF
 * @returns Best URL or null if no image
 */
export function getImageUrl(
  image: Image | null,
  size: 'thumbnail' | 'small' | 'regular' | 'original' = 'regular',
  supportsAvif: boolean = false
): string | null {
  if (!image) return null;

  if (supportsAvif) {
    switch (size) {
      case 'thumbnail':
        return image.thumbnailAvifUrl || image.thumbnailUrl || image.smallAvifUrl || image.smallUrl || null;
      case 'small':
        return image.smallAvifUrl || image.smallUrl || image.thumbnailAvifUrl || image.thumbnailUrl || null;
      case 'regular':
        return image.regularAvifUrl || image.regularUrl || image.imageAvifUrl || image.imageUrl || null;
      case 'original':
        return image.imageAvifUrl || image.imageUrl || image.regularAvifUrl || image.regularUrl || null;
      default:
        return image.regularAvifUrl || image.regularUrl || image.imageAvifUrl || image.imageUrl || null;
    }
  }

  // Fallback to non-AVIF URLs
  switch (size) {
    case 'thumbnail':
      return image.thumbnailUrl || image.smallUrl || null;
    case 'small':
      return image.smallUrl || image.thumbnailUrl || null;
    case 'regular':
      return image.regularUrl || image.imageUrl || null;
    case 'original':
      return image.imageUrl || image.regularUrl || null;
    default:
      return image.regularUrl || image.imageUrl || null;
  }
}

/**
 * Get regular display URL (for detail views)
 * Prefers AVIF when supported, falls back to regular/original
 */
export function getRegularDisplayUrl(
  image: Image | null,
  supportsAvif: boolean = false
): string {
  return getImageUrl(image, 'regular', supportsAvif) || 
         getImageUrl(image, 'original', supportsAvif) || 
         '';
}

/**
 * Get original/full size URL
 * Prefers AVIF when supported
 */
export function getOriginalDisplayUrl(
  image: Image | null,
  supportsAvif: boolean = false
): string {
  return getImageUrl(image, 'original', supportsAvif) || 
         getImageUrl(image, 'regular', supportsAvif) || 
         '';
}

/**
 * Get thumbnail URL (for previews)
 * Prefers AVIF when supported
 */
export function getThumbnailUrl(
  image: Image | null,
  supportsAvif: boolean = false
): string | null {
  return getImageUrl(image, 'thumbnail', supportsAvif);
}

