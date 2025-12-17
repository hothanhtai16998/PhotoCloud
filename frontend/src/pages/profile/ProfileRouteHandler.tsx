import { useLocation, Navigate } from "react-router-dom";
import ProfilePage from "./ProfilePage";

/**
 * Route handler for /@username pattern
 * React Router may not match @ symbol directly, so we check the pathname here
 * This is used as a catch-all route that only handles /@username paths
 */
export function ProfileRouteHandler() {
    const location = useLocation();
    
    // Check if pathname matches /@username or /@username/tab pattern
    // Valid tabs: following, followers, collections, stats
    const matches = location.pathname.match(/^\/@([^/]+)(?:\/(following|followers|collections|stats))?$/);
    
    if (!matches) {
        // If it doesn't match /@username pattern, redirect to home (or show 404)
        // This prevents the catch-all from matching other unmatched routes
        return <Navigate to="/" replace />;
    }
    
    // Render ProfilePage - it will extract username and tab from pathname
    return <ProfilePage />;
}

