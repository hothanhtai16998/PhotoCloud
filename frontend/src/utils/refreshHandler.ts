/**
 * Unsplash-style refresh handler
 * Cancels all pending API requests when page refreshes
 * This prevents 429 errors from rapid refresh (like Unsplash)
 * 
 * The browser's refresh button automatically changes to "X" during loading
 * We can't control that, but we CAN cancel pending requests to prevent 429 errors
 */

import { cancelAllPendingRequests } from '@/lib/axios';

const isDev = import.meta.env.DEV;

/**
 * Cancel all pending requests
 * Uses the exported function from axios.ts
 * Returns the number of cancelled requests
 */
const cancelPendingRequests = () => {
  return cancelAllPendingRequests();
};

/**
 * Initialize refresh handler
 * Cancels pending requests when page refreshes (Unsplash-style)
 * The browser's refresh button automatically changes to "X" during loading
 * We just need to cancel pending requests to prevent 429 errors
 */
export const initRefreshHandler = () => {
  if (typeof window === 'undefined') return;

  // Handle beforeunload - cancel all pending requests when refresh happens
  // This is the key to preventing 429 errors (like Unsplash)
  const handleBeforeUnload = () => {
    cancelPendingRequests();
  };

  // Listen for beforeunload (fires on refresh, navigation, close)
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

