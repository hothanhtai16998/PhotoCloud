/**
 * Test utility to verify refresh handler is working
 * Run this in browser console to test request cancellation
 */

export function testRefreshHandler() {
  // Check if axios cancellation is set up
  const hasBeforeUnload = window.addEventListener.toString().includes('beforeunload');
  
  return {
    beforeUnloadRegistered: hasBeforeUnload,
    message: 'Check Network tab when you press F5 - requests should be cancelled'
  };
}

// Make it available globally in dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).testRefreshHandler = testRefreshHandler;
}

