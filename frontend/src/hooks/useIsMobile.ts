import { useState, useEffect } from 'react';
import { appConfig } from '@/config/appConfig';

/**
 * Hook to detect if the current viewport is mobile-sized
 * Returns true if window width <= mobile breakpoint
 * Handles window resize events and SSR (returns false if window is undefined)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= appConfig.mobileBreakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
