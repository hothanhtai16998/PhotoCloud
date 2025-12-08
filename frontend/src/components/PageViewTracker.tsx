import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { adminService } from '@/services/adminService';

/**
 * Component to track page views for analytics
 * Automatically tracks page views when route changes
 */
export function PageViewTracker() {
    const location = useLocation();

    useEffect(() => {
        // Track all page views (both authenticated and anonymous)
        // This allows us to track page views per second and most active pages
        // For "users online", we only count authenticated users (those with userId)
        const trackView = async () => {
            try {
                // Track page view - userId will be null for anonymous users
                // but the backend will still record the view
                await adminService.trackPageView(location.pathname);
            } catch (error) {
                // Silently fail - don't interrupt user experience
                // Only log in development
                if (import.meta.env.DEV) {
                    console.warn('Failed to track page view:', error);
                }
            }
        };

        // Small delay to ensure route is fully loaded
        const timeoutId = setTimeout(trackView, 100);

        return () => clearTimeout(timeoutId);
    }, [location.pathname]);

    return null;
}

