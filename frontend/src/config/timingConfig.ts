/**
 * Timing and Delay Configuration
 *
 * Edit this file to customize timing-related settings (delays, timeouts, debounces).
 */

export const timingConfig = {
  // UI refresh delays
  refresh: {
    // Delay after image upload before refreshing (to ensure backend processing)
    afterUploadMs: 500,
  },

  // Resource cleanup delays
  cleanup: {
    // Delay before revoking blob URLs
    blobUrlRevokeMs: 100,
  },

  // Geolocation settings
  geolocation: {
    // Timeout for getting current position
    timeoutMs: 10000, // 10 seconds

    // Accept cached location up to this age (5 minutes)
    maximumAgeMs: 300000,
  },

  // Geocoding API rate limiting
  geocoding: {
    // Delay between geocoding requests to respect rate limits (1 request per second)
    rateLimitDelayMs: 1100,

    // Small delay for batch geocoding operations
    batchDelayMs: 200,
  },

  // UI debounce/throttle settings
  ui: {
    // Resize event debounce delay
    resizeDebounceMs: 100,

    // Initial check delay for UI components
    initCheckDelayMs: 150,

    // Location search debounce delay
    locationSearchDebounceMs: 500,

    // Initial delay before location search (to respect API rate limits)
    locationSearchInitialDelayMs: 300,
  },

  // Image loading and caching
  image: {
    // Timeout for checking if image is in browser cache
    cacheCheckTimeoutMs: 50,

    // Batch delay for favorite status checks
    favoriteBatchDelayMs: 100,
  },

  // Search and filtering
  search: {
    // Debounce delay for search input
    debounceMs: 300,
  },

  // Service Worker settings
  serviceWorker: {
    // Interval for checking service worker updates (1 hour)
    updateCheckIntervalMs: 60 * 60 * 1000,
  },

  // UI animation and interaction
  animation: {
    // Contact button shake interval (13 seconds)
    contactButtonShakeIntervalMs: 13000,
    
    // Contact button shake duration (3 seconds)
    contactButtonShakeDurationMs: 3000,
    
    // Common animation delays
    shortDelayMs: 100,
    mediumDelayMs: 200,
    longDelayMs: 500,
    
    // Image preload/viewport margin (500px before entering viewport)
    imagePreloadMarginPx: 500,
    
    // Blob URL cleanup delay
    blobUrlCleanupDelayMs: 100,
  },

  // Visibility and refresh
  visibility: {
    // Minimum time hidden before refreshing on visibility change (30 seconds)
    minHiddenTimeMs: 30000,
  },
} as const;
