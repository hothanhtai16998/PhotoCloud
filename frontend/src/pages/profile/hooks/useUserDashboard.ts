import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/useUserStore';

/**
 * Dashboard data for the current user.
 * These stats are fetched on mount and can be refreshed.
 */
export interface UserDashboardData {
    totalImages: number;
    totalCollections: number;
    totalFavorites: number;
    totalBookings: number;
    totalFollowers: number;
    totalFollowing: number;
    recentImages: Array<{
        _id: string;
        title: string;
        thumbnailUrl?: string;
        url?: string;
        createdAt: string;
        views: number;
    }>;
    recentBookings: Array<{
        _id: string;
        packageName: string;
        status: string;
        bookingDate: string;
    }>;
}

interface UseUserDashboardReturn {
    data: UserDashboardData | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useUserDashboard(): UseUserDashboardReturn {
    const { user } = useUserStore();
    const [data, setData] = useState<UserDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const requestRef = useRef(0);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const refresh = useCallback(async () => {
        const req = ++requestRef.current;
        setLoading(true);
        setError(null);

        try {
            // Parallel fetch for all stats — no single endpoint, so we hit multiple.
            const [imagesRes, collectionsRes, favoritesRes, bookingsRes, followersRes] = await Promise.allSettled([
                // Images count
                fetch('/api/images/me', { credentials: 'include' }),
                // Collections count
                fetch('/api/collections', { credentials: 'include' }),
                // Favorites count
                fetch('/api/favorites', { credentials: 'include' }),
                // Bookings count
                fetch('/api/bookings', { credentials: 'include' }),
                // Followers count (user's own stats)
                user?._id ? fetch(`/api/users/${user._id}`, { credentials: 'include' }) : Promise.resolve(null),
            ]);

            if (req !== requestRef.current || !mountedRef.current) return;

            // Parse responses
            let totalImages = 0;
            let totalCollections = 0;
            let totalFavorites = 0;
            let totalBookings = 0;
            let recentImages: UserDashboardData['recentImages'] = [];
            let recentBookings: UserDashboardData['recentBookings'] = [];

            if (imagesRes.status === 'fulfilled') {
                try {
                    const j = await imagesRes.value.json();
                    const imgs = j.images ?? j.data ?? [];
                    if (Array.isArray(imgs)) {
                        totalImages = j.pagination?.total ?? imgs.length;
                        recentImages = imgs.slice(0, 6).map((img: any) => ({
                            _id: img._id,
                            title: img.title,
                            thumbnailUrl: img.thumbnailUrl,
                            url: img.url,
                            createdAt: img.createdAt,
                            views: img.views ?? 0,
                        }));
                    }
                } catch (_) { /* non-JSON or error */ }
            }

            if (collectionsRes.status === 'fulfilled') {
                try {
                    const j = await collectionsRes.value.json();
                    const cols = j.collections ?? j.data ?? [];
                    if (Array.isArray(cols)) {
                        totalCollections = j.pagination?.total ?? cols.length;
                    }
                } catch (_) { /* non-JSON or error */ }
            }

            if (favoritesRes.status === 'fulfilled') {
                try {
                    const j = await favoritesRes.value.json();
                    const favs = j.favorites ?? j.data ?? [];
                    if (Array.isArray(favs)) {
                        totalFavorites = j.pagination?.total ?? favs.length;
                    }
                } catch (_) { /* non-JSON or error */ }
            }

            if (bookingsRes.status === 'fulfilled') {
                try {
                    const j = await bookingsRes.value.json();
                    const bks = j.bookings ?? j.data ?? [];
                    if (Array.isArray(bks)) {
                        totalBookings = j.pagination?.total ?? bks.length;
                        recentBookings = bks.slice(0, 5).map((bk: any) => ({
                            _id: bk._id,
                            packageName: bk.packageName ?? bk.package?.name ?? 'Booking',
                            status: bk.status,
                            bookingDate: bk.bookingDate ?? bk.date,
                        }));
                    }
                } catch (_) { /* non-JSON or error */ }
            }

            setData({
                totalImages,
                totalCollections,
                totalFavorites,
                totalBookings,
                totalFollowers: user?.followersCount ?? 0,
                totalFollowing: user?.followingCount ?? 0,
                recentImages,
                recentBookings,
            });
        } catch (err: any) {
            if (mountedRef.current) {
                setError(err?.message || 'Lỗi khi tải dữ liệu.');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [user?._id, user?.followersCount, user?.followingCount]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { data, loading, error, refresh };
}
