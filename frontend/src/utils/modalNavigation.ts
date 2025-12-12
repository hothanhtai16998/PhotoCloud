/**
 * Unified utilities for image modal navigation
 * Handles state management, refresh detection, and navigation logic
 */

import type { Location } from 'react-router-dom';
import { INLINE_MODAL_FLAG_KEY } from '@/constants/modalKeys';

const GRID_SCROLL_POSITION_KEY = 'imageGridScrollPosition';

// Cache refresh check result - only check once per actual page load
// This persists across component remounts but resets on actual page reload
let cachedRefreshCheck: boolean | null = null;
let refreshCheckInitialized = false;

/**
 * Single source of truth for refresh detection
 * Uses Performance Navigation Timing API
 * 
 * IMPORTANT: This should only return true for actual page refreshes (F5, Ctrl+R),
 * NOT for React Router navigation. We cache the result on initial page load only.
 * 
 * The cache persists across component remounts during navigation, but a new page
 * load will reset it.
 */
export function isPageRefresh(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Return cached result if already checked (persists across navigation)
  if (refreshCheckInitialized) {
    return cachedRefreshCheck ?? false;
  }
  
  // Check once on initial page load only
  // This will be true if user pressed F5/Ctrl+R or page was reloaded
  // It will be false for normal React Router navigation
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isRefresh = navEntry?.type === 'reload';
    
    // Cache the result (persists until actual page reload)
    cachedRefreshCheck = isRefresh;
    refreshCheckInitialized = true;
    
    return isRefresh;
  } catch {
    // Fallback: not a refresh
    cachedRefreshCheck = false;
    refreshCheckInitialized = true;
    return false;
  }
}

/**
 * Clear modal state on refresh (should be called synchronously)
 * 
 * IMPORTANT: Only clear if it's actually a page refresh.
 * Don't clear during normal navigation - the flag should persist.
 */
export function clearModalStateOnRefresh(): void {
  if (typeof window === 'undefined') return;
  
  // Only clear if this is truly a page refresh (initial page load)
  // The refresh check is cached, so it only returns true on actual page reload
  const isRefresh = isPageRefresh();
  
  if (isRefresh) {
    sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
    sessionStorage.removeItem(GRID_SCROLL_POSITION_KEY);
  }
}

/**
 * Save scroll position before opening modal
 */
export function saveScrollPosition(): void {
  if (typeof window === 'undefined') return;
  
  // Only save if not already saved (prevent overwriting)
  if (!sessionStorage.getItem(GRID_SCROLL_POSITION_KEY)) {
    sessionStorage.setItem(GRID_SCROLL_POSITION_KEY, window.scrollY.toString());
  }
}

/**
 * Restore scroll position after closing modal
 */
export function restoreScrollPosition(): void {
  if (typeof window === 'undefined') return;
  
  const savedScroll = sessionStorage.getItem(GRID_SCROLL_POSITION_KEY);
  if (savedScroll) {
    const scrollY = parseInt(savedScroll, 10);
    
    // Use requestAnimationFrame for smooth restoration
    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollY,
        behavior: 'instant' as ScrollBehavior, // Use instant to avoid animation conflicts
      });
      sessionStorage.removeItem(GRID_SCROLL_POSITION_KEY);
    });
  }
}

/**
 * Set modal active flag
 */
export function setModalActive(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(INLINE_MODAL_FLAG_KEY, 'true');
  }
}

/**
 * Clear modal active flag
 */
export function clearModalActive(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
  }
}

/**
 * Check if modal is active (flag exists)
 */
export function isModalActive(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(INLINE_MODAL_FLAG_KEY) === 'true';
}

/**
 * Validate modal state - checks if all required state is present
 */
export function validateModalState(locationState: unknown): {
  isValid: boolean;
  isModal: boolean;
  background?: Location;
} {
  // SIMPLIFIED: Don't check isPageRefresh() here - it's cached and causes issues
  // We rely solely on the flag being cleared by App.tsx on refresh
  // If flag is missing, modal is invalid (whether due to refresh or other reasons)
  
  // Check if location state has modal indicators
  if (!locationState || typeof locationState !== 'object') {
    return { isValid: false, isModal: false };
  }

  const state = locationState as { background?: Location; inlineModal?: boolean };
  
  // Check if we have both the flag and the state
  const hasFlag = isModalActive();
  const hasInlineModal = Boolean(state.inlineModal);
  
  // Validate background is a proper Location object with pathname
  const hasBackground = Boolean(
    state.background && 
    typeof state.background === 'object' &&
    'pathname' in state.background &&
    state.background.pathname
  );
  
  // Modal is valid ONLY if we have ALL THREE: flag + inlineModal + background
  // CRITICAL: If flag is missing, modal is INVALID (even if location.state has modal data)
  // This handles:
  // - Refresh: flag cleared, but location.state persists from history → invalid
  // - Stale state: location.state has modal data but flag wasn't set → invalid
  // - Normal navigation: flag + location.state both set → valid
  const isValid = hasFlag && hasInlineModal && hasBackground;
  const isModal = isValid;

  return {
    isValid,
    isModal,
    background: isValid ? state.background : undefined,
  };
}

/**
 * Clear all modal-related state from history
 */
export function clearHistoryState(): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.history.replaceState(
      null,
      document.title,
      window.location.pathname + window.location.search + window.location.hash
    );
  } catch (error) {
    console.warn('Failed to clear history state:', error);
  }
}

/**
 * Prepare navigation state for opening modal
 */
export function prepareModalNavigationState(
  backgroundLocation: Location
): {
  background: Location;
  inlineModal: boolean;
  fromGrid?: boolean;
} {
  return {
    background: backgroundLocation,
    inlineModal: true,
    fromGrid: true,
  };
}
