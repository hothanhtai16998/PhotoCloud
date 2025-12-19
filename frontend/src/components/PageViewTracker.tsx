import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { adminService } from '@/services/adminService';

/**
 * Component to track page views for analytics
 * Automatically tracks page views when route changes
 * Implements Unsplash-style rate limiting with exponential backoff
 */
export function PageViewTracker() {
    const location = useLocation();
    const lastTrackedRef = useRef<string>('');
    const lastTrackTimeRef = useRef<number>(0);
    const retryCountRef = useRef<number>(0);
    const throttleDelay = 3000; // Minimum 3 seconds between tracking calls (Unsplash-style)
    const maxRetryDelay = 60000; // Maximum 60 seconds delay

    useEffect(() => {
        // Skip if same path was just tracked
        if (lastTrackedRef.current === location.pathname) {
            return;
        }

        // Throttle: Don't track if last track was less than throttleDelay ago
        const now = Date.now();
        if (now - lastTrackTimeRef.current < throttleDelay) {
            return;
        }

        // Track all page views (both authenticated and anonymous)
        // This allows us to track page views per second and most active pages
        // For "users online", we only count authenticated users (those with userId)
        // DEFERRED: Wait for page to be interactive before tracking to reduce critical path
        const trackView = async () => {
            try {
                // Update tracking state before making request
                lastTrackedRef.current = location.pathname;
                lastTrackTimeRef.current = Date.now();

                // Track page view - userId will be null for anonymous users
                // but the backend will still record the view
                const response = await adminService.trackPageView(location.pathname);
                
                // Reset retry count on success
                retryCountRef.current = 0;
                
                // Respect rate limit headers (Unsplash-style)
                const retryAfter = response?.headers?.['retry-after'];
                if (retryAfter) {
                    const delay = parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
                    lastTrackTimeRef.current = Date.now() + delay;
                }
            } catch (error: any) {
                // Silently fail - don't interrupt user experience
                // 429 (rate limit) and 401/403 errors are expected and should be silent
                const status = error?.response?.status;
                if (status === 429) {
                    // Unsplash-style: Exponential backoff with Retry-After header support
                    const retryAfter = error?.response?.headers?.['retry-after'];
                    let delay: number;
                    
                    if (retryAfter) {
                        // Respect server's Retry-After header
                        delay = parseInt(retryAfter, 10) * 1000;
                    } else {
                        // Exponential backoff: 2^retryCount seconds, max 60s
                        delay = Math.min(
                            Math.pow(2, retryCountRef.current) * 1000,
                            maxRetryDelay
                        );
                        retryCountRef.current += 1;
                    }
                    
                    // Reset tracking state and schedule retry
                    lastTrackedRef.current = '';
                    lastTrackTimeRef.current = Date.now() + delay;
                    
                    // Silently ignore - don't spam console
                    return;
                }
                
                if (status === 401 || status === 403) {
                    // Auth errors - silently ignore
                    return;
                }
                
                // Only log other errors in development
                if (import.meta.env.DEV) {
                    console.warn('Failed to track page view:', error);
                }
            }
        };

        // Defer analytics until after page is interactive (reduces critical path latency)
        // Use requestIdleCallback if available, otherwise setTimeout with longer delay
        const scheduleTracking = () => {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(trackView, { timeout: 2000 });
            } else {
                // Fallback: wait for page load + idle time
                setTimeout(trackView, 2000);
            }
        };

        // Wait for page to be interactive before scheduling
        if (document.readyState === 'complete') {
            scheduleTracking();
        } else {
            window.addEventListener('load', scheduleTracking, { once: true });
        }
    }, [location.pathname]);

    return null;
}

