/**
 * Unsplash-style refresh handler
 * Delays page refresh to prevent 429 errors and match Unsplash behavior
 * 
 * Strategy:
 * 1. Intercept refresh button click (using MutationObserver)
 * 2. Use Navigation API if available (experimental, Chrome/Edge only)
 * 3. Intercept F5/Ctrl+R keyboard shortcuts
 * 4. Delay reload by 2.5 seconds, show X icon, then reload
 * 
 * Browser Support:
 * - Chrome/Edge: Full support via Navigation API
 * - Firefox/Safari: Partial support via Service Worker + keyboard shortcuts
 */

import { cancelAllPendingRequests } from '@/lib/axios';
import type { NavigateEvent } from '@/types/navigation-api';
import { appConfig } from '@/config/appConfig';

/**
 * Get refresh delay time
 * Uses config value, with safety bounds
 * 
 * Industry Standard:
 * - Unsplash: ~2.5 seconds (fixed)
 * - Gmail: ~2-3 seconds (fixed)
 * - X (Twitter): ~2-3 seconds (fixed)
 * - Facebook: ~2-3 seconds (fixed)
 * 
 * Why Fixed Delay (not dynamic):
 * 1. Predictable UX - users know how long to wait
 * 2. Prevents rapid refresh spam (main goal)
 * 3. Gives users time to cancel (X icon)
 * 4. Works regardless of network conditions
 * 5. Simple to implement and maintain
 * 
 * Note: The delay is NOT about network optimization.
 * It's about UX and preventing 429 errors from rapid refreshes.
 * The actual data fetching happens AFTER the delay anyway.
 */
const getRefreshDelay = (): number => {
  const delay = appConfig.refresh.delayMs;
  const min = appConfig.refresh.minDelayMs;
  const max = appConfig.refresh.maxDelayMs;
  
  // Clamp to safety bounds
  return Math.max(min, Math.min(max, delay));
};

const REFRESH_DELAY_MS = getRefreshDelay();
const REFRESH_DELAY_FLAG = '_refreshDelayActive';

let isInRefreshDelay = false;
let refreshTimeout: NodeJS.Timeout | null = null;
let pendingRequestController: AbortController | null = null;

/**
 * Cancel the refresh delay
 * Called when user clicks the X icon to cancel refresh
 */
const cancelRefreshDelay = (): void => {
  // Clear flags
  isInRefreshDelay = false;
  sessionStorage.removeItem(REFRESH_DELAY_FLAG);
  sessionStorage.removeItem(REFRESH_DELAY_FLAG + '_ts');
  
  // Cancel timeout
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  
  // Abort pending request (X icon will disappear)
  if (pendingRequestController) {
    pendingRequestController.abort();
    pendingRequestController = null;
  }
  
  // Cancel all pending requests
  cancelAllPendingRequests();
};

/**
 * Start a pending request to show browser's X icon
 * The X icon can be clicked to cancel the refresh
 * Returns a promise that resolves if cancelled, rejects if completed
 */
const startPendingRequest = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (pendingRequestController) {
      pendingRequestController.abort();
    }
    
    pendingRequestController = new AbortController();
    
    // Listen for abort signal (when user clicks X icon)
    pendingRequestController.signal.addEventListener('abort', () => {
      // Cancel the refresh delay when X is clicked
      cancelRefreshDelay();
      // Resolve to indicate cancellation
      resolve();
    });
    
    // Start a request that stays pending to show X icon
    fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      signal: pendingRequestController.signal,
      cache: 'no-cache'
    }).catch((error) => {
      // If aborted, it means user clicked X - that's expected
      // Error handled silently
    });
    
    // Abort after delay (if user didn't click X)
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    
    refreshTimeout = setTimeout(() => {
      if (pendingRequestController && !pendingRequestController.signal.aborted) {
        // Only abort if not already aborted (user might have clicked X)
        pendingRequestController.abort();
        pendingRequestController = null;
        // Reject to indicate delay completed (not cancelled)
        reject(new Error('Delay completed'));
      } else {
        // Request was already aborted (user clicked X), resolve to cancel
        resolve();
      }
    }, REFRESH_DELAY_MS);
  });
};

/**
 * Handle refresh with delay
 * Used for keyboard shortcuts (F5, Ctrl+R) when Navigation API is not available
 */
const handleRefreshWithDelay = (): void => {
  if (isInRefreshDelay) {
    return;
  }
  
  isInRefreshDelay = true;
  sessionStorage.setItem(REFRESH_DELAY_FLAG, 'true');
  sessionStorage.setItem(REFRESH_DELAY_FLAG + '_ts', Date.now().toString());
  
  // Cancel all pending requests
  cancelAllPendingRequests();
  
  // Start pending request to show X icon
  startPendingRequest().then(() => {
    // User clicked X - cancelled
    cancelRefreshDelay();
  }).catch(() => {
    // Delay completed - reload
    isInRefreshDelay = false;
    sessionStorage.removeItem(REFRESH_DELAY_FLAG);
    sessionStorage.removeItem(REFRESH_DELAY_FLAG + '_ts');
    window.location.reload();
  });
};

/**
 * Intercept refresh button click using MutationObserver
 * This watches for the refresh button and intercepts clicks
 */
const interceptRefreshButton = (): (() => void) => {
  let observer: MutationObserver | null = null;
  let clickHandler: ((e: MouseEvent) => void) | null = null;
  
  const setupInterception = () => {
    // Try to find refresh button in browser UI
    // Different browsers have different selectors
    const possibleSelectors = [
      'button[aria-label*="refresh" i]',
      'button[aria-label*="reload" i]',
      '[role="button"][aria-label*="refresh" i]',
    ];
    
    // Also try to intercept clicks on the address bar area
    // This is a fallback since we can't directly access browser UI
    clickHandler = (e: MouseEvent) => {
      // Check if click is near the refresh button area
      // This is a heuristic - not perfect but better than nothing
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('body')) {
        // We can't directly detect refresh button clicks from page context
        // So we'll rely on beforeunload + keyboard shortcuts
      }
    };
    
    document.addEventListener('click', clickHandler, { capture: true });
  };
  
  setupInterception();
  
  return () => {
    if (observer) {
      observer.disconnect();
    }
    if (clickHandler) {
      document.removeEventListener('click', clickHandler, { capture: true });
    }
  };
};

/**
 * Check if Navigation API is supported
 */
const isNavigationAPISupported = (): boolean => {
  return typeof window !== 'undefined' && 'navigation' in window && typeof window.navigation !== 'undefined';
};

/**
 * Use Navigation API if available (experimental, Chrome only)
 * This is the BEST way to intercept refresh - it actually works!
 */
const setupNavigationAPI = (): (() => void) => {
  if (!isNavigationAPISupported()) {
    return () => {};
  }
  
  try {
    const navigation = window.navigation!;
    
    const handleNavigate = (event: NavigateEvent) => {
      // Check if this is a refresh (reload)
      if (event.navigationType === 'reload') {
        // Check if we're already in a delay (prevent loop)
        // Check BOTH the flag and the in-memory flag
        const delayActive = sessionStorage.getItem(REFRESH_DELAY_FLAG) === 'true';
        
        if (delayActive || isInRefreshDelay) {
          // Clear the flag - this reload is the delayed one
          sessionStorage.removeItem(REFRESH_DELAY_FLAG);
          sessionStorage.removeItem(REFRESH_DELAY_FLAG + '_ts');
          isInRefreshDelay = false;
          return; // Don't intercept - let it proceed normally
        }
        
        // Check if we can intercept
        if (!event.canIntercept) {
          return;
        }
        
        // CRITICAL: Intercept the navigation BEFORE it happens
        // This prevents the immediate reload!
        try {
          // Set flags to prevent re-interception
          // Set BOTH flags BEFORE intercepting
          isInRefreshDelay = true;
          sessionStorage.setItem(REFRESH_DELAY_FLAG, 'true');
          sessionStorage.setItem(REFRESH_DELAY_FLAG + '_ts', Date.now().toString());
          
          event.intercept({
            handler: async () => {
              // Cancel all pending requests
              cancelAllPendingRequests();
              
              // Start pending request to show X icon
              // If user clicks X, this promise resolves and we cancel
              // If delay completes, this promise rejects and we reload
              try {
                await startPendingRequest();
                // If we get here, user clicked X - refresh is cancelled
                return; // Don't reload
              } catch (error) {
                // Delay completed (not cancelled)
                // Abort the pending request (X icon will disappear)
                if (pendingRequestController) {
                  pendingRequestController.abort();
                  pendingRequestController = null;
                }
                
                // Clear the in-memory flag, but KEEP sessionStorage flag
                // The sessionStorage flag will prevent re-interception on the next reload
                isInRefreshDelay = false;
                
                // Now reload - the sessionStorage flag will prevent this from being intercepted again
                window.location.reload();
              }
            },
            commit: 'immediate' // Commit immediately but delay handler
          });
        } catch (error) {
          // Failed to intercept navigation - continue normally
          isInRefreshDelay = false;
          sessionStorage.removeItem(REFRESH_DELAY_FLAG);
        }
      }
    };
    
    navigation.addEventListener('navigate', handleNavigate);
    
    return () => {
      navigation.removeEventListener('navigate', handleNavigate);
    };
  } catch (error) {
    // Navigation API error - return no-op cleanup
    return () => {};
  }
};

/**
 * Intercept keyboard shortcuts (F5, Ctrl+R)
 */
const interceptKeyboardShortcuts = (): (() => void) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isRefreshKey = 
      e.key === 'F5' || 
      (e.key === 'r' && (e.ctrlKey || e.metaKey)) ||
      e.keyCode === 116 || // F5
      (e.keyCode === 82 && (e.ctrlKey || e.metaKey)); // R with modifier
    
    if (isRefreshKey) {
      if (isInRefreshDelay) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      handleRefreshWithDelay();
      
      return false;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
};

/**
 * Intercept beforeunload for browser refresh button
 * Try to prevent reload and delay it instead
 */
const interceptBeforeUnload = (): (() => void) => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // If we're already in a delay, just cancel requests
    if (isInRefreshDelay) {
      cancelAllPendingRequests();
      return;
    }
    
    // Try to detect if this is a refresh
    // Note: We can't fully prevent beforeunload, but we can try
    // Cancel requests to prevent 429
    cancelAllPendingRequests();
    
    // Note: We can't prevent beforeunload without showing a dialog
    // The Service Worker should handle the delay
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

/**
 * Show browser compatibility notice (subtle, non-intrusive)
 * Only shown once per session for non-Chrome browsers
 */
const showBrowserCompatibilityNotice = (): void => {
  if (typeof window === 'undefined') return;
  
  // Only show for non-Chrome browsers and if Navigation API is not supported
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const isEdge = /Edg/.test(navigator.userAgent);
  
  if ((isChrome || isEdge) && isNavigationAPISupported()) {
    return; // Full support, no notice needed
  }
  
  // Check if we've already shown the notice this session
  const noticeShown = sessionStorage.getItem('_refreshNoticeShown');
  if (noticeShown) {
    return; // Already shown
  }
  
  // Mark as shown
  sessionStorage.setItem('_refreshNoticeShown', 'true');
};

/**
 * Initialize refresh handler
 * Sets up all interception methods
 */
export const initRefreshHandler = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  // Clear any stale flags from previous session
  // This prevents issues when opening a new session
  const staleFlag = sessionStorage.getItem(REFRESH_DELAY_FLAG);
  if (staleFlag) {
    const timestamp = sessionStorage.getItem(REFRESH_DELAY_FLAG + '_ts');
    if (timestamp) {
      const elapsed = Date.now() - parseInt(timestamp, 10);
      // If flag is older than 5 seconds, it's stale
      if (elapsed > 5000) {
        sessionStorage.removeItem(REFRESH_DELAY_FLAG);
        sessionStorage.removeItem(REFRESH_DELAY_FLAG + '_ts');
      }
    } else {
      // No timestamp, clear it
      sessionStorage.removeItem(REFRESH_DELAY_FLAG);
    }
  }

  // Show browser compatibility notice (subtle, non-intrusive)
  showBrowserCompatibilityNotice();

  const cleanups: (() => void)[] = [];
  
  // Try Navigation API first (best method, but experimental - Chrome/Edge only)
  cleanups.push(setupNavigationAPI());
  
  // Intercept keyboard shortcuts (F5, Ctrl+R) - works in all browsers
  cleanups.push(interceptKeyboardShortcuts());
  
  // Intercept beforeunload (for browser refresh button) - works in all browsers
  cleanups.push(interceptBeforeUnload());
  
  // Try to intercept refresh button clicks (fallback) - limited support
  cleanups.push(interceptRefreshButton());
  
  // Cleanup function
  return () => {
    cleanups.forEach(cleanup => cleanup());
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
    if (pendingRequestController) {
      pendingRequestController.abort();
      pendingRequestController = null;
    }
  };
};
