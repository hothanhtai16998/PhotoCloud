/**
 * Image Grid Configuration
 * Contains settings for image grid layout, preloading, and performance optimization
 */
export const imageGridConfig = {
  // Grid layout breakpoints (matches CSS)
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1440,
  },

  // Column configuration for different screen sizes
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4,
  },

  // Gap between grid items (in pixels)
  gap: {
    mobile: 6,
    tablet: 8,
    desktop: 10,
    wide: 12,
  },

  // Preload configuration for IntersectionObserver
  preload: {
    // Root margin for normal connection speed
    normalConnectionMargin: '400px 0px',
    // Root margin for slow connection speed
    slowConnectionMargin: '200px 0px',
  },

  // Intersection threshold for lazy loading
  intersectionThreshold: 0.01,

  // Number of images to eagerly load (above the fold)
  eagerImageCount: 6,

  // Image sizing
  rowSpan: {
    portrait: {
      mobile: 'auto',
      tablet: 'auto',
      desktop: 32,
      wide: 35,
    },
    landscape: {
      mobile: 'auto',
      tablet: 'auto',
      desktop: 16,
      wide: 18,
    },
  },

  // Transition timing
  transitions: {
    categoryChange: 300, // ms
    imageLoad: 200, // ms
    hover: 200, // ms
  },

  // Pagination
  pagination: {
    initialLimit: 20,
    loadMoreLimit: 20,
  },
} as const;

export type ImageGridConfig = typeof imageGridConfig;