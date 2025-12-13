import { useMemo, useLayoutEffect, useRef } from 'react';
import type { Location } from 'react-router-dom';
import {
  isPageRefresh,
  clearModalStateOnRefresh,
  validateModalState,
  clearHistoryState,
  isModalActive,
} from '@/utils/modalNavigation';

interface UseModalNavigationResult {
  backgroundLocation: Location | undefined;
  shouldRenderModalRoutes: boolean;
}

export function useModalNavigation(location: Location): UseModalNavigationResult {
  // Check if this is a refresh - do this synchronously before render logic
  // Cache the result so we only check once per actual page load
  const isRefresh = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return isPageRefresh();
  }, []);

  // Clear modal state on refresh - MUST be done synchronously BEFORE validation
  // On refresh, ALWAYS clear modal state, even if location.state has modal flags
  // (location.state persists in browser history on refresh, but we should still clear)
  const hasClearedOnRefreshRef = useRef(false);
  
  // Clear flag synchronously during render (before useMemo runs)
  // This is safe because clearModalStateOnRefresh() only modifies sessionStorage
  if (isRefresh && !hasClearedOnRefreshRef.current) {
    clearModalStateOnRefresh();
    hasClearedOnRefreshRef.current = true;
    // Clear any persisted state from browser history to ensure clean state
    // NOTE: This clears window.history.state, but React Router's location.state
    // may not update immediately, so we force validation to return invalid on refresh
    if (location.state != null) {
      clearHistoryState();
    }
  }

  // Validate modal state using unified utility
  // CRITICAL: Check if flag is missing but location.state has modal data (refresh scenario)
  // On refresh, flag is cleared but location.state persists from browser history
  // If location.state has modal data but flag is missing → refresh scenario → invalid
  const modalValidation = useMemo(() => {
    const state = location.state as { inlineModal?: boolean; background?: unknown } | undefined;
    const hasModalStateInLocation = state?.inlineModal === true && Boolean(state?.background);
    const hasFlag = isModalActive();
    
    // If location.state has modal data but flag is missing → refresh scenario → invalid
    // This detects refresh even if isPageRefresh() is cached incorrectly
    if (hasModalStateInLocation && !hasFlag) {
      return { isValid: false, isModal: false };
    }
    
    // Normal validation
    return validateModalState(location.state);
  }, [location.state]);

  // Clean up invalid modal state (state exists but flag doesn't, or vice versa)
  useLayoutEffect(() => {
    if (isRefresh) return; // Already handled above

    const state = location.state as { background?: Location; inlineModal?: boolean } | undefined;
    
    // If state has inlineModal but validation failed, clean it up
    if (state?.inlineModal && !modalValidation.isValid) {
      const cleanedState = { ...state };
      delete cleanedState.inlineModal;
      delete cleanedState.background;
      clearHistoryState();
    }
  }, [isRefresh, location.state, modalValidation.isValid]);

  // Use validated background location
  // DON'T use isRefresh here - it's cached and can be wrong during navigation
  // Instead, rely on modalValidation.isValid which checks the flag (cleared on refresh)
  const backgroundLocation = modalValidation.background;
  
  // Validate backgroundLocation is a proper Location object
  const hasValidBackground = Boolean(
    backgroundLocation && 
    typeof backgroundLocation === 'object' &&
    'pathname' in backgroundLocation &&
    backgroundLocation.pathname
  );
  
  // Render modal routes only when:
  // 1. Modal state is valid (flag + location.state check)
  // 2. We have a valid background location with pathname
  // NOTE: We don't check isRefresh here because:
  // - On refresh, the flag is cleared by clearModalStateOnRefresh() above
  // - So modalValidation.isValid will be false if flag is missing
  // - This way, navigation works even if initial load was a refresh
  const shouldRenderModalRoutes = Boolean(modalValidation.isValid && hasValidBackground);

  return {
    backgroundLocation,
    shouldRenderModalRoutes,
  };
}

