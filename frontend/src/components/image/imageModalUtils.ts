// import type { User } from '@/types/user';

/**
 * Get display name for a user, with fallback to username
 */
export const getDisplayName = (user?: {
  displayName?: string | null;
  username?: string;
}): string => {
  if (!user) return '';
  return user.displayName?.trim() || user.username || '';
};

/**
 * Avatar size constants for consistency across the app
 */
export const AVATAR_SIZE = {
  SMALL: 32,
  MEDIUM: 40,
  LARGE: 48,
  XLARGE: 64,
} as const;

/**
 * Icon size constants
 */
export const ICON_SIZE = {
  SMALL: 16,
  MEDIUM: 20,
  LARGE: 24,
  XLARGE: 48,
} as const;

/**
 * Modal image constants
 */
export const MODAL_IMAGE = {
  HEADER_HEIGHT_PX: 240,
  ZOOM_ICON_SIZE: 18,
  MAX_ZOOM: 5,
  ZOOM_PERCENTAGE_MULTIPLIER: 100,
} as const;

/**
 * Image width descriptors for srcset
 */
export const IMAGE_WIDTH = {
  THUMBNAIL: '200w',
  SMALL: '800w',
  REGULAR: '1080w',
  ORIGINAL: '1920w',
} as const;

/**
 * Get image className based on load state and orientation
 */
export const getImageClassName = (
  isLoaded: boolean,
  imageType: 'portrait' | 'landscape'
): string => {
  const loadState = isLoaded ? 'loaded' : 'loading';
  return `modal-image ${loadState} ${imageType}`;
};

/**
 * Generate srcSet string for responsive images
 */
export const generateModalSrcSet = (
  thumbnail: string | null | undefined,
  small: string | null | undefined,
  regular: string | null | undefined,
  original: string | null | undefined
): string | undefined => {
  const parts: string[] = [];

  if (thumbnail) parts.push(`${thumbnail} ${IMAGE_WIDTH.THUMBNAIL}`);
  if (small && small !== thumbnail) parts.push(`${small} ${IMAGE_WIDTH.SMALL}`);
  if (regular && regular !== small && regular !== thumbnail) {
    parts.push(`${regular} ${IMAGE_WIDTH.REGULAR}`);
  }
  if (
    original &&
    original !== regular &&
    original !== small &&
    original !== thumbnail
  ) {
    parts.push(`${original} ${IMAGE_WIDTH.ORIGINAL}`);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
};

/**
 * Get inline styles for modal image
 */
export const getModalImageStyles = (
  placeholderSrc: string | null
): React.CSSProperties => ({
  backgroundImage: placeholderSrc ? `url("${placeholderSrc}")` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: '#f0f0f0',
  maxWidth: '100%',
  maxHeight: `calc(100vh - ${MODAL_IMAGE.HEADER_HEIGHT_PX}px)`,
  width: 'auto',
  height: 'auto',
});
