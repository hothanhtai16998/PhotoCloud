import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useRef } from 'react';

/**
 * AuthInitializer - Optimized for better UX, especially poor connections
 * 
 * Strategy:
 * - Render children immediately (no blocking) - app works even if auth fails/times out
 * - Initialize auth in background - doesn't block public pages
 * - ProtectedRoute handles auth-gated content gracefully with timeout fallback
 * - Poor internet: Public pages work immediately, protected pages timeout gracefully after 15s
 * - This prevents blank screen flash and improves perceived performance
 */
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
	const { initializeApp, isInitializing } = useAuthStore();
	const hasInitialized = useRef(false);
	const initAbortControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		// Reset on mount to handle rapid refreshes
		hasInitialized.current = false;
		
		// Abort any pending initialization from previous mount
		if (initAbortControllerRef.current) {
			initAbortControllerRef.current.abort();
		}
		
		// Only initialize once per mount - non-blocking
		// Don't check isInitializing here - it starts as true and we need to call initializeApp to set it to false
		if (!hasInitialized.current) {
			hasInitialized.current = true;
			const abortController = new AbortController();
			initAbortControllerRef.current = abortController;
			
			// Initialize auth in background, don't block rendering
			initializeApp().catch(() => {
				// Silently handle - user might not be logged in
				// ProtectedRoute will handle redirect if needed
			}).finally(() => {
				if (abortController.signal.aborted) {
					// Don't clear ref if this was aborted
					return;
				}
				initAbortControllerRef.current = null;
			});
		}
		
		return () => {
			// Cleanup: abort pending initialization on unmount
			if (initAbortControllerRef.current) {
				initAbortControllerRef.current.abort();
				initAbortControllerRef.current = null;
			}
		};
	}, [initializeApp]); // Removed isInitializing from dependencies

	// Render children immediately - no blocking loader
	// Individual components handle their own loading states
	return <>{children}</>;
};

export default AuthInitializer;
