import { useEffect, useState, useRef } from 'react';
import { useGlobalLoadingStore } from '@/stores/useGlobalLoadingStore';
import LoadingSpinner from './LoadingSpinner';
import './GlobalLoadingOverlay.css';

/**
 * GlobalLoadingOverlay
 * 
 * Shows a single loading spinner overlay when ANY store/component is loading.
 * This provides a consistent loading experience across the entire app.
 * 
 * Features:
 * - Single spinner for all loading states
 * - Smooth fade in/out transitions
 * - Prevents layout shifts with fixed positioning
 * - Minimum display time to prevent flashing
 */
export function GlobalLoadingOverlay() {
  const isLoading = useGlobalLoadingStore((state) => state.isLoading());
  const [showSpinner, setShowSpinner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minDisplayTimeRef = useRef<number | null>(null);
  const hasShownRef = useRef(false);

  // Prevent flashing by using stable state management
  useEffect(() => {
    // Clear any pending timers
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isLoading) {
      // If we've shown before and it's been less than 300ms, keep showing (prevent flash)
      const now = Date.now();
      if (hasShownRef.current && minDisplayTimeRef.current && (now - minDisplayTimeRef.current) < 300) {
        // Keep showing - don't hide yet
        setShowSpinner(true);
        setIsVisible(true);
        return;
      }

      // Show spinner after a short delay (prevents flash on fast loads)
      showTimerRef.current = setTimeout(() => {
        setShowSpinner(true);
        hasShownRef.current = true;
        minDisplayTimeRef.current = Date.now();
        // Fade in after spinner is ready
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }, 50); // Reduced delay for faster response
    } else {
      // Only hide if we've shown for at least 300ms (prevents rapid flash)
      const now = Date.now();
      if (hasShownRef.current && minDisplayTimeRef.current && (now - minDisplayTimeRef.current) < 300) {
        // Wait until minimum display time has passed
        const remainingTime = 300 - (now - minDisplayTimeRef.current);
        hideTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          hideTimerRef.current = setTimeout(() => {
            setShowSpinner(false);
            hasShownRef.current = false;
            minDisplayTimeRef.current = null;
          }, 200); // Match CSS transition duration
        }, remainingTime);
        return;
      }

      // Fade out first, then hide spinner
      setIsVisible(false);
      hideTimerRef.current = setTimeout(() => {
        setShowSpinner(false);
        hasShownRef.current = false;
        minDisplayTimeRef.current = null;
      }, 200); // Match CSS transition duration
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isLoading]);

  if (!showSpinner) return null;

  return (
    <div 
      className={`global-loading-overlay ${isVisible ? 'visible' : ''}`}
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      <div className="global-loading-content">
        <LoadingSpinner size="large" />
      </div>
    </div>
  );
}

