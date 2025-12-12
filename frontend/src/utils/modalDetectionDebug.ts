/**
 * Debug utility to trace modal detection flow
 * Use this to understand why modal is or isn't opening
 */

import { INLINE_MODAL_FLAG_KEY } from '@/constants/modalKeys';
import type { Location } from 'react-router-dom';

// Cache to prevent duplicate logs
let lastLogKey: string | null = null;
let lastLogTime = 0;
const LOG_DEBOUNCE_MS = 100; // Only log once per 100ms for same input

export function debugModalDetection(locationState: unknown, context: string, isRefresh?: boolean): void {
  if (typeof window === 'undefined') return;
  
  // Create a key from the state to detect duplicates
  const stateKey = JSON.stringify(locationState);
  const logKey = `${context}-${stateKey}-${isRefresh}`;
  const now = Date.now();
  
  // Skip if same log within debounce window
  if (logKey === lastLogKey && (now - lastLogTime) < LOG_DEBOUNCE_MS) {
    return;
  }
  
  lastLogKey = logKey;
  lastLogTime = now;
  
  // Only log in development or when explicitly enabled
  if (process.env.NODE_ENV !== 'development') return;
  
  // Import isPageRefresh here to avoid circular dependency
  const checkRefresh = () => {
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navEntry?.type === 'reload';
    } catch {
      return false;
    }
  };
  
  const refreshStatus = isRefresh !== undefined ? isRefresh : checkRefresh();
  
  console.group(`[DEBUG] Modal Detection - ${context}${refreshStatus ? ' [REFRESH]' : ''}`);
  
  // Show refresh status first
  if (refreshStatus) {
    console.log('⚠️ Page Refresh Detected - Modal state will be invalid', {
      isRefresh: refreshStatus,
      note: 'On refresh, modal state is cleared and modal will not render',
    });
  }
  
  // Check flag
  const flagValue = sessionStorage.getItem(INLINE_MODAL_FLAG_KEY);
  const hasFlag = flagValue === 'true';
  console.log('1. Flag check:', {
    hasFlag,
    flagValue,
    key: INLINE_MODAL_FLAG_KEY,
    ...(refreshStatus && hasFlag ? { warning: 'Flag exists but will be cleared on refresh' } : {}),
  });
  
  // Check location state
  const hasState = Boolean(locationState && typeof locationState === 'object');
  console.log('2. Location state check:', {
    hasState,
    locationStateType: typeof locationState,
    locationState,
  });
  
  if (hasState) {
    const state = locationState as { inlineModal?: boolean; background?: Location };
    
    // Check inlineModal
    const hasInlineModal = Boolean(state.inlineModal);
    console.log('3. InlineModal check:', {
      hasInlineModal,
      inlineModalValue: state.inlineModal,
    });
    
    // Check background
    const hasBackground = Boolean(state.background);
    const backgroundIsObject = state.background && typeof state.background === 'object';
    const backgroundHasPathname = backgroundIsObject && 'pathname' in state.background;
    const backgroundPathname = backgroundHasPathname 
      ? (state.background as { pathname?: string }).pathname 
      : 'N/A';
    
    console.log('4. Background check:', {
      hasBackground,
      backgroundIsObject,
      backgroundHasPathname,
      backgroundPathname,
      backgroundType: state.background ? typeof state.background : 'none',
      backgroundKeys: state.background && typeof state.background === 'object' 
        ? Object.keys(state.background) 
        : [],
    });
    
    // Final validation
    // On refresh, allChecksPass is always false
    const allChecksPass = !refreshStatus && hasFlag && hasInlineModal && hasBackground && backgroundHasPathname;
    console.log('5. Final validation:', {
      allChecksPass,
      isRefresh: refreshStatus,
      breakdown: {
        hasFlag,
        hasInlineModal,
        hasBackground,
        backgroundHasPathname,
        ...(refreshStatus ? { refreshBlocksModal: true } : {}),
      },
    });
  } else {
    // No state - show that too
    console.log('3-5. No location state - skipping inlineModal/background checks');
    console.log('5. Final validation:', {
      allChecksPass: false,
      isRefresh: refreshStatus,
      reason: refreshStatus ? 'Page refresh detected' : 'No location state',
    });
  }
  
  console.groupEnd();
}
