import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";

/**
 * Redirects /profile to /@username
 * This ensures all profile URLs use the @username format
 */
export function ProfileRedirect() {
    const navigate = useNavigate();
    const { user } = useUserStore();

    useEffect(() => {
        if (user?.username) {
            navigate(`/@${user.username}`, { replace: true });
        } else {
            // Fallback: if username is not available, redirect to home
            navigate('/', { replace: true });
        }
    }, [navigate, user?.username]);

    return null;
}

