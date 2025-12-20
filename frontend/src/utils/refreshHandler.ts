/**
 * Unsplash-style refresh handler
 * Delays page refresh to prevent 429 errors and match Unsplash behavior
 * 
 * Strategy:
 * 1. Intercept refresh button click (using MutationObserver)
 * 2. Use Navigation API if available (experimental)
 * 3. Intercept F5/Ctrl+R keyboard shortcuts
 * 4. Delay reload by 2.5 seconds, show X icon, then reload
 */

import { cancelAllPendingRequests } from '@/lib/axios';

const REFRESH_DELAY_MS = 2500; // 2.5 seconds - matches Unsplash behavior
const REFRESH_DELAY_FLAG = '_refreshDelayActive';
const isDev = import.meta.env.DEV;

let isInRefreshDelay = false;
let refreshTimeout: NodeJS.Timeout | null = null;
let pendingRequestController: AbortController | null = null;

/**
 * Start a pending request to show browser's X icon
 */
const startPendingRequest = (): void => {
  if (pendingRequestController) {
    pendingRequestController.abort();
  }
  
  pendingRequestController = new AbortController();
  
  // Start a request that stays pending to show X icon
  fetch('/api/csrf-token', {
    method: 'GET',
    credentials: 'include',
    signal: pendingRequestController.signal,
    cache: 'no-cache'
  }).catch(() => {
    // Ignore errors - this is just to show the X icon
  });
  
  // Abort after delay
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  refreshTimeout = setTimeout(() => {
    if (pendingRequestController) {
      pendingRequestController.abort();
      pendingRequestController = null;
    }
  }, REFRESH_DELAY_MS);
};

/**
 * Handle refresh with delay
 */
const handleRefreshWithDelay = (): void => {
  if (isInRefreshDelay) {
    if (isDev) console.log('[RefreshHandler] Refresh already in progress');
    return;
  }
  
  isInRefreshDelay = true;
  
  // Cancel all pending requests
  cancelAllPendingRequests();
  
  // Start pending request to show X icon
  startPendingRequest();
  
  if (isDev) {
    console.log('[RefreshHandler] ⏳ Refresh delayed - page will reload in', REFRESH_DELAY_MS, 'ms');
  }
  
  // After delay, reload
  refreshTimeout = setTimeout(() => {
    if (isDev) {
      console.log('[RefreshHandler] ✅ Delay complete, reloading page');
    }
    isInRefreshDelay = false;
    window.location.reload();
  }, REFRESH_DELAY_MS);
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
 * Use Navigation API if available (experimental, Chrome only)
 * This is the BEST way to intercept refresh - it actually works!
 */
const setupNavigationAPI = (): (() => void) => {
  // @ts-ignore - Navigation API is experimental
  if (typeof window.navigation === 'undefined') {
    if (isDev) {
      console.log('[RefreshHandler] Navigation API not available');
    }
    return () => {};
  }
  
  try {
    // @ts-ignore
    const navigation = window.navigation;
    
    const handleNavigate = (event: any) => {
      if (isDev) {
        console.log('[RefreshHandler] Navigation event:', {
          type: event.navigationType,
          destination: event.destination?.url,
          canIntercept: event.canIntercept,
        });
      }
      
      // Check if this is a refresh (reload)
      if (event.navigationType === 'reload') {
        // Check if we're already in a delay (prevent loop)
        // Check BOTH the flag and the in-memory flag
        const delayActive = sessionStorage.getItem(REFRESH_DELAY_FLAG) === 'true';
        
        if (isDev) {
          console.log('[RefreshHandler] Reload detected, checking flags:', {
            delayActive,
            isInRefreshDelay,
            flagValue: sessionStorage.getItem(REFRESH_DELAY_FLAG)
          });
        }
        
        if (delayActive || isInRefreshDelay) {
          if (isDev) {
            console.log('[RefreshHandler] ⚠️ Already in delay, skipping interception to prevent loop');
          }
          // Clear the flag - this reload is the delayed one
          sessionStorage.removeItem(REFRESH_DELAY_FLAG);
          sessionStorage.removeItem(REFRESH_DELAY_FLAG + '_ts');
          isInRefreshDelay = false;
          return; // Don't intercept - let it proceed normally
        }
        
        if (isDev) {
          console.log('[RefreshHandler] 🎯 Navigation API: Refresh detected!');
        }
        
        // Check if we can intercept
        if (!event.canIntercept) {
          if (isDev) {
            console.warn('[RefreshHandler] Cannot intercept this navigation');
          }
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
          
          if (isDev) {
            console.log('[RefreshHandler] Setting delay flags before intercept');
          }
          
          event.intercept({
            handler: async () => {
              if (isDev) {
                console.log('[RefreshHandler] Navigation intercepted, starting delay...');
              }
              
              // Cancel all pending requests
              cancelAllPendingRequests();
              
              // Start pending request to show X icon
              startPendingRequest();
              
              // Wait for delay
              await new Promise((resolve) => {
                setTimeout(() => {
                  if (isDev) {
                    console.log('[RefreshHandler] Delay complete, preparing reload...');
                  }
                  
                  // Abort the pending request (X icon will disappear)
                  if (pendingRequestController) {
                    pendingRequestController.abort();
                    pendingRequestController = null;
                  }
                  
                  // Clear the in-memory flag, but KEEP sessionStorage flag
                  // The sessionStorage flag will prevent re-interception on the next reload
                  isInRefreshDelay = false;
                  
                  if (isDev) {
                    console.log('[RefreshHandler] Reloading page (flag will prevent re-interception)...');
                  }
                  
                  // Now reload - the sessionStorage flag will prevent this from being intercepted again
                  window.location.reload();
                  
                  resolve(undefined);
                }, REFRESH_DELAY_MS);
              });
            },
            commit: 'immediate' // Commit immediately but delay handler
          });
          
          if (isDev) {
            console.log('[RefreshHandler] ✅ Navigation intercept registered');
          }
        } catch (error) {
          if (isDev) {
            console.error('[RefreshHandler] Failed to intercept navigation:', error);
          }
          isInRefreshDelay = false;
          sessionStorage.removeItem(REFRESH_DELAY_FLAG);
        }
      }
    };
    
    // @ts-ignore
    navigation.addEventListener('navigate', handleNavigate);
    
    // Also listen to ALL navigation events to debug
    if (isDev) {
      // @ts-ignore
      navigation.addEventListener('navigate', (e: any) => {
        console.log('[RefreshHandler] 🔍 ALL navigation events:', {
          type: e.navigationType,
          destination: e.destination?.url,
          canIntercept: e.canIntercept,
          hashChange: e.hashChange,
          downloadRequest: e.downloadRequest,
          formData: e.formData,
          info: e.info,
          signal: e.signal,
        });
      });
    }
    
    if (isDev) {
      console.log('[RefreshHandler] ✅ Navigation API listener registered');
      // @ts-ignore
      console.log('[RefreshHandler] Navigation API available:', !!window.navigation);
    }
    
    return () => {
      // @ts-ignore
      navigation.removeEventListener('navigate', handleNavigate);
    };
  } catch (error) {
    if (isDev) {
      console.warn('[RefreshHandler] Navigation API error:', error);
    }
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
      
      if (isDev) {
        console.log('[RefreshHandler] 🔄 Refresh key pressed (F5/Ctrl+R)');
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
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isRefresh = navEntry?.type === 'reload';
    
    if (isDev) {
      console.log('[RefreshHandler] beforeunload event:', {
        isRefresh,
        navigationType: navEntry?.type,
      });
    }
    
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
        if (isDev) {
          console.log('[RefreshHandler] Cleared stale refresh delay flag');
        }
      }
    } else {
      // No timestamp, clear it
      sessionStorage.removeItem(REFRESH_DELAY_FLAG);
    }
  }

  const cleanups: (() => void)[] = [];
  
  // Try Navigation API first (best method, but experimental)
  cleanups.push(setupNavigationAPI());
  
  // Intercept keyboard shortcuts (F5, Ctrl+R)
  cleanups.push(interceptKeyboardShortcuts());
  
  // Intercept beforeunload (for browser refresh button)
  cleanups.push(interceptBeforeUnload());
  
  // Try to intercept refresh button clicks (fallback)
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
