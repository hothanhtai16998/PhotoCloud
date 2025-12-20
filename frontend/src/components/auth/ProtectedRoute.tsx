import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import { useEffect, useState } from "react";
import { syncGlobalLoading } from "@/stores/helpers/syncGlobalLoading";

const ProtectedRoute = () => {
    const { isInitializing, accessToken } = useAuthStore();
    const { user, fetchMe, loading: userLoading } = useUserStore();
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
    const [hasTimedOut, setHasTimedOut] = useState(false);

    useEffect(() => {
        // Only attempt to fetch if:
        // 1. Auth initialization is complete
        // 2. We have an access token (user might be authenticated)
        // 3. We don't have user data yet
        // 4. We haven't attempted to fetch yet
        if (!isInitializing && accessToken && !user && !hasAttemptedFetch) {
            setHasAttemptedFetch(true);
            fetchMe().catch(() => {
                // Error handled in fetchMe, just mark as attempted
            });
        }
    }, [isInitializing, accessToken, user, hasAttemptedFetch, fetchMe]);

    // Timeout fallback for poor connections (don't show skeleton forever)
    // After 15 seconds, assume connection is too slow and redirect to signin
    useEffect(() => {
        if (isInitializing || (accessToken && !user && userLoading)) {
            const timeout = setTimeout(() => {
                setHasTimedOut(true);
            }, 15000); // 15 second timeout for very poor connections
            
            return () => clearTimeout(timeout);
        } else {
            setHasTimedOut(false);
            return undefined;
        }
    }, [isInitializing, accessToken, user, userLoading]);

    // Sync loading state to global loading store
    const isAuthLoading = !hasTimedOut && (isInitializing || (accessToken && !user && !hasAttemptedFetch) || (accessToken && !user && userLoading));
    
    useEffect(() => {
        syncGlobalLoading('protectedRoute', isAuthLoading);
        return () => {
            syncGlobalLoading('protectedRoute', false);
        };
    }, [isAuthLoading]);

    // Show loading animation while auth is initializing or while fetching user data
    // BUT: Don't wait forever - timeout after 15s for poor connections
    // GlobalLoadingOverlay handles the spinner, so we return null to prevent duplicate
    if (!hasTimedOut && (isInitializing || (accessToken && !user && !hasAttemptedFetch) || (accessToken && !user && userLoading))) {
        return null; // GlobalLoadingOverlay handles the spinner
    }

    // Only redirect to signin if:
    // 1. We have no access token (definitely not authenticated)
    // 2. OR we've attempted to fetch and still have no user (fetch failed or user doesn't exist)
    if (!accessToken || (hasAttemptedFetch && !user)) {
        return (
            <Navigate
                to="/signin"
                replace
            />
        );
    }

    // If the token exists and user is loaded, show the protected content
    // This is the final return, ensuring all code paths return a value
    return <Outlet />;
};

export default ProtectedRoute;