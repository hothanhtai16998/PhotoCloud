/**
 * Timing and Delay Configuration
 *
 * Edit this file to customize timing-related settings (delays, timeouts, debounces).
 */

export const timingConfig = {
  // UI refresh delays
  refresh: {
    // Delay after image upload before refreshing (to ensure backend processing)
    // Reduced from 500ms to 150ms for faster response (backend is fast enough)
    afterUploadMs: 150,

    // Small delay (50-100ms) to keep requests pending during page load
    // This ensures the stop button (X) appears even on fast connections
    // This keeps requests "pending" long enough for the browser's stop button (X) to appear
    // The delay is short enough to not feel slow, but long enough to keep requests pending during load
    requestDelayMs: 50, // 50ms delay - short enough to feel instant, long enough for stop button
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

} as const;
