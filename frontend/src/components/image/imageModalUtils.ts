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
 * Get inline styles for modal image
 */
export const getModalImageStyles = (
  placeholderSrc: string | null,
  skipMaxHeight: boolean = false
): React.CSSProperties => {
  const styles: React.CSSProperties = {
    backgroundImage: placeholderSrc ? `url("${placeholderSrc}")` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#f0f0f0',
    maxWidth: '100%',
    width: 'auto',
    height: 'auto',
  };
  
  // Only add maxHeight if not skipping (for page mode on mobile)
  if (!skipMaxHeight) {
    styles.maxHeight = `calc(100vh - ${MODAL_IMAGE.HEADER_HEIGHT_PX}px)`;
  }
  
  return styles;
};
