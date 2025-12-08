/**
 * Slider Component Configuration
 *
 * Edit this file to customize slider/carousel settings.
 */

export type TransitionType = 'fade' | 'slide' | 'zoom';

export const sliderConfig = {
  // Number of images to display in slider (daily random selection)
  imageCount: 10,

  // Maximum number of pages to fetch (to avoid infinite loops)
  maxPages: 10,

  // API limit per request
  apiLimit: 100,

  // Auto-play settings
  autoPlay: {
    // Interval between slides in milliseconds (6.2 seconds)
    intervalMs: 6200,

    // Progress bar update interval in milliseconds (60fps = ~16ms)
    progressUpdateIntervalMs: 16,
  },

  // Transition settings
  transition: {
    // Transition duration in milliseconds
    durationMs: 600,

    // Default transition type
    defaultType: 'fade' as TransitionType,

    // Available transition types
    availableTypes: ['fade', 'slide', 'zoom'] as TransitionType[],
  },

  // Loading settings
  loading: {
    // Enable progressive image loading
    enableProgressiveLoading: true,

    // Enable blur-up effect
    enableBlurUp: true,
  },
} as const;
