import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ProtectedRoute = () => {
    const { isInitializing, accessToken } = useAuthStore();
    const { user, fetchMe, loading: userLoading } = useUserStore();
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

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

    // Show loading while auth is initializing or while fetching user data
    if (isInitializing || (accessToken && !user && !hasAttemptedFetch) || (accessToken && !user && userLoading)) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-64 w-full max-w-4xl" />
                </div>
            </div>
        );
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
    return <Outlet />;
};

export default ProtectedRoute;