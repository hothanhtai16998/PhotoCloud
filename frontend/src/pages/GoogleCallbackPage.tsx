import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";

function GoogleCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAccessToken } = useAuthStore();
    const { fetchMe } = useUserStore();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // Set the access token
            setAccessToken(token);

            // Fetch user data
            fetchMe().then(() => {
                // Redirect to home page
                navigate('/');
            }).catch(() => {
                // If fetch fails, still redirect but token might be invalid
                navigate('/signin');
            });
        } else {
            // No token, redirect to signin
            navigate('/signin');
        }
    }, [searchParams, navigate, setAccessToken, fetchMe]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            fontSize: '1.125rem',
            color: '#767676'
        }}>
            Completing sign in...
        </div>
    );
}

export default GoogleCallbackPage;

