
/**
 * Unsplash-style Grid Configuration
 * Matches Unsplash's exact grid behavior and styling
 */
export const UNSPLASH_GRID_CONFIG = {
  // Grid Layout
  columns: {
    desktop: 3,
    tablet: 2,
    mobile: 1,
  },
  breakpoints: {
    desktop: 1280,
    tablet: 768,
    mobile: 0,
  },
  gap: 24,
  columnWidth: 400,

  // Loading Strategy
  loading: {
    initialBatch: 20,
    loadMoreBatch: 20,
    triggerOffset: 800,
    preloadViewports: 2,
  },

  // Image Sizes
  imageSizes: {
    thumb: 200,
    small: 400,
    regular: 1080,
    full: 'original' as const,
  },

  // Animations
  animations: {
    duration: 300,
    staggerDelay: 50,
    hoverTransition: 200,
    scaleOnHover: 1.02,
    fadeInDuration: 300,
  },

  // Progressive Loading
  progressive: {
    enabled: true,
    blurAmount: 20,
    transitionDuration: 300,
    placeholderQuality: 10,
  },

  // Overlay Settings
  overlay: {
    gradient: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)',
    hoverOpacity: 1,
    defaultOpacity: 0,
    transitionDuration: 200,
  },

  // Image Constraints
  constraints: {
    minHeight: 200,
    maxHeight: 800,
    minAspectRatio: 0.5,
    maxAspectRatio: 3,
  },

  // Lazy Loading
  lazyLoad: {
    rootMargin: '200px',
    threshold: 0.1,
  },

  // Performance
  performance: {
    debounceResize: 150,
    throttleScroll: 100,
    maxConcurrentLoads: 6,
  },

  // Accessibility
  accessibility: {
    altTextFallback: 'Unsplash image',
    ariaLabels: {
      downloadButton: 'Download image',
      likeButton: 'Like image',
      authorLink: 'View author profile',
    },
  },
} as const;

export type UnsplashGridConfig = typeof UNSPLASH_GRID_CONFIG;
export type ColumnConfig = typeof UNSPLASH_GRID_CONFIG.columns;
export type LoadingConfig = typeof UNSPLASH_GRID_CONFIG.loading;
export type AnimationConfig = typeof UNSPLASH_GRID_CONFIG.animations;

export default UNSPLASH_GRID_CONFIG;
