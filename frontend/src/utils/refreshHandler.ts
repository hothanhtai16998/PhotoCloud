/**
 * Unsplash-style refresh handler
 * Implements all 4 recommendations:
 * 1. Visual feedback: show loading state
 * 2. Debounce/throttle: prevent multiple rapid refresh clicks
 * 3. Cancel pending requests: abort previous requests when new refresh starts
 * 4. Browser-style refresh: use window.location.reload() for true reload
 * 
 * Works in both development and production modes.
 */

import { cancelAllPendingRequests } from '@/lib/axios';

const isDev = import.meta.env.DEV;

// Track refresh state
let isRefreshing = false;
let refreshTimeout: NodeJS.Timeout | null = null;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 1000; // Minimum 1 second between refreshes

/**
 * Cancel all pending requests
 * Uses the exported function from axios.ts
 * Returns the number of cancelled requests
 */
const cancelPendingRequests = () => {
  return cancelAllPendingRequests();
};

/**
 * Debounced refresh handler
 * Prevents rapid refresh clicks and shows visual feedback
 */
export const handleRefresh = (force = false) => {
  const now = Date.now();
  const timeSinceLastRefresh = now - lastRefreshTime;

  // If already refreshing, ignore
  if (isRefreshing && !force) {
    return;
  }

  // Throttle: prevent refresh if called too soon after last refresh
  if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL && !force) {
    return;
  }

  // Clear any pending refresh timeout
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  // Set refreshing state
  isRefreshing = true;
  lastRefreshTime = now;

  if (isDev) {
    console.log('[RefreshHandler] Starting refresh...');
  }

  // Show visual feedback (add loading class to body)
  if (document.body) {
    document.body.classList.add('refreshing');
  }

  // Cancel all pending requests immediately
  const cancelledCount = cancelPendingRequests();
  if (isDev) {
    console.log(`[RefreshHandler] Cancelled ${cancelledCount} pending request(s)`);
  }

  // Debounce: wait a tiny bit before actual refresh (allows cancellation if needed)
  refreshTimeout = setTimeout(() => {
    // Browser-style refresh: use window.location.reload() for true reload
    window.location.reload();
  }, 50); // Very short delay to allow request cancellation to complete
};

/**
 * Check if page is currently refreshing
 */
export const isPageRefreshing = () => isRefreshing;

/**
 * Cancel a pending refresh (if user navigates away, etc.)
 */
export const cancelRefresh = () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  isRefreshing = false;
  document.body.classList.remove('refreshing');
};

/**
 * Initialize refresh handler
 * Intercepts F5/Ctrl+R to prevent rapid refresh and show visual feedback
 */
export const initRefreshHandler = () => {
  if (typeof window === 'undefined') return;

  // Intercept F5 and Ctrl+R / Cmd+R BEFORE browser processes them
  const handleKeyDown = (e: KeyboardEvent) => {
    // Detect F5 or Ctrl+R / Cmd+R
    const isRefreshKey = 
      e.key === 'F5' || 
      e.code === 'F5' ||
      (e.key === 'r' && (e.ctrlKey || e.metaKey)) ||
      (e.key === 'R' && (e.ctrlKey || e.metaKey));

    if (isRefreshKey) {
      if (isDev) {
        console.log('[RefreshHandler] F5/Ctrl+R detected!');
      }
      
      // Show visual feedback IMMEDIATELY (before page unloads)
      if (document.body) {
        document.body.classList.add('refreshing');
      }
      
      // Cancel requests immediately
      const cancelledCount = cancelPendingRequests();
      if (isDev) {
        console.log(`[RefreshHandler] Cancelled ${cancelledCount} requests`);
      }
      
      // Note: We can't actually prevent F5 in modern browsers
      // But we can show feedback and cancel requests before the page unloads
      // The beforeunload handler will also fire and do cleanup
    }
  };

  // Also handle beforeunload for other refresh methods (address bar refresh, F5, etc.)
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // Show visual feedback immediately (this happens synchronously)
    if (document.body) {
      document.body.classList.add('refreshing');
    }
    
    // Cancel all pending requests (also handled in axios.ts, but ensure it happens)
    const cancelledCount = cancelPendingRequests();
    
    if (isDev) {
      console.log(`[RefreshHandler] beforeunload fired - cancelled ${cancelledCount} pending request(s)`);
    }
    
    // Force a repaint to show the progress bar
    if (document.body) {
      // Trigger a reflow to ensure CSS is applied
      void document.body.offsetHeight;
    }
    
    // Note: We don't prevent the unload - we just cancel requests and show feedback
  };

  // Try to intercept F5/Ctrl+R (may not work in all browsers, but worth trying)
  // Use capture phase and non-capture to catch it early
  window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
  document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
  
  // Also try on document.body if it exists
  if (document.body) {
    document.body.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
  }

  // Also listen for beforeunload (for address bar refresh, F5, etc.)
  // This is the most reliable way to detect refresh
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Remove refreshing class on page load
  window.addEventListener('load', () => {
    document.body.classList.remove('refreshing');
    isRefreshing = false; // Reset state
  });

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('load', handleBeforeUnload);
  };
};

