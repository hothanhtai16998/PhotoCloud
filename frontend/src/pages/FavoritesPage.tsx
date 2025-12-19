import { useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useFavoriteStore } from "@/stores/useFavoriteStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { Heart } from "lucide-react";
import { NoFlashGrid } from "@/components/NoFlashGrid";
import { generateImageSlug } from "@/lib/utils";
import { saveScrollPosition, prepareModalNavigationState, setModalActive, isPageRefresh } from "@/utils/modalNavigation";
import { ActualLocationContext } from "@/contexts/ActualLocationContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Image } from "@/types/image";
import { t } from "@/i18n";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import "./FavoritesPage.css";
import { timingConfig } from '@/config/timingConfig';


function FavoritesPage() {
    const navigate = useNavigate();
    const actualLocation = useContext(ActualLocationContext);
    const isMobile = useIsMobile();

    // Auth store - need to check if auth is initialized before fetching
    const { isInitializing, accessToken } = useAuthStore();

    // Favorite store
    const {
        images,
        loading,
        pagination,
        currentPage,
        hasLoaded,
        fetchFavorites,
        resetLoading,
        checkAndRefreshIfStale,
        addImageToFavorites,
        removeImageFromFavorites,
    } = useFavoriteStore();

    useEffect(() => {
        // ProtectedRoute ensures user is authenticated
        // CRITICAL: Wait for auth initialization before fetching favorites
        // On refresh, auth store needs to initialize (load token) before we can make authenticated requests
        if (isInitializing) {
            // Auth is still initializing, wait for it to complete
            return;
        }

        // If no access token after initialization, user is not authenticated
        // ProtectedRoute should handle redirect, but don't try to fetch favorites
        if (!accessToken) {
            return;
        }

        // On page refresh, always fetch fresh data to ensure we have the latest favorites
        const isRefresh = isPageRefresh();
        
        if (isRefresh) {
            // On refresh, always fetch fresh data (don't use cached store data)
            // This ensures we get the latest favorites from the server
            // Pass _refresh flag to bypass cache
            fetchFavorites(1, true);
        } else {
            // Normal navigation: Use cached data if available (no flash on navigation)
            // CRITICAL: Ensure loading is false if we have loaded data (even if empty)
            // This prevents flash when navigating with cached data
            if (hasLoaded) {
                resetLoading();
            }

            // Only fetch if we haven't loaded yet
            // Don't check for stale data on mount - use cached data immediately
            // Stale data will be refreshed via visibility change or periodic checks
            if (!hasLoaded) {
                // Unsplash-style: Use requestIdleCallback to make requests after initial render
                // This naturally keeps requests pending during page load phase (like Unsplash)
                const scheduleFetch = () => {
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(() => {
                            fetchFavorites(1);
                        }, { timeout: 100 });
                    } else {
                        // Fallback for browsers without requestIdleCallback
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                fetchFavorites(1);
                            });
                        });
                    }
                };
                
                scheduleFetch();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitializing, accessToken]); // Re-run when auth state changes

    // Unsplash-style: Refresh when tab becomes visible after being away for 1+ minute
    useEffect(() => {
        if (!hasLoaded) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Check if data is stale (1+ minute old, matches store threshold)
                const lastFetched = useFavoriteStore.getState().lastFetchedAt;
                if (lastFetched) {
                    const age = Date.now() - lastFetched;
                    const STALE_THRESHOLD = 1 * 60 * 1000; // 1 minute
                    if (age > STALE_THRESHOLD) {
                        // Refresh silently in background
                        checkAndRefreshIfStale();
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLoaded]);

    // Note: Optimistic updates are handled globally in the store
    // No need for local listener here - the store listens globally

    // Load data callback for NoFlashGrid
    const loadData = useCallback(async () => {
        await fetchFavorites(1);
    }, [fetchFavorites]);

    // Load more images (infinite scroll)
    const loadMore = useCallback(async () => {
        if (!pagination || currentPage >= pagination.pages) return;
        await fetchFavorites(currentPage + 1);
    }, [fetchFavorites, pagination, currentPage]);

    // Handle image click - navigate to ImagePage
    const handleImageClick = useCallback((image: Image, _index: number) => {
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        const targetPath = `/photos/${slug}`;
        
    // Mobile: full page navigation
        if (isMobile) {
            navigate(targetPath, {
        // Pass favorites list + clicked image
        state: { images, image, fromGrid: true }
            });
            return;
        }
        
        // Desktop: modal-style with background
        // 1. Save scroll position using unified utility
        saveScrollPosition();
        
        // 2. Set modal active flag (required for validation)
        setModalActive();
        
        // 3. Prepare modal navigation state
        // CRITICAL: backgroundLocation must be a proper Location object
        const backgroundLocation = {
            pathname: actualLocation?.pathname || '/favorites',
            search: actualLocation?.search || '',
            hash: actualLocation?.hash || '',
            state: null,
            key: actualLocation?.key || 'default', // Use 'default' instead of empty string
        };
        const modalState = prepareModalNavigationState(backgroundLocation);
        
        // 4. Navigate with modal state
        navigate(targetPath, {
      // Include clicked image so ImagePage can skip extra fetch
      state: { ...modalState, images, image, fromGrid: true }
        });
    }, [navigate, images, actualLocation, isMobile]);


    return (
        <>
            <main className="favorites-page">
                <div className="favorites-container">
                    {/* Page Header */}
                    <div className="favorites-header">
                        <div className="favorites-header-icon">
                            <Heart size={32} fill="currentColor" className="favorite-icon-filled" />
                        </div>
                        <div className="favorites-header-info">
                            <h1 className="favorites-title">{t('favorites.title')}</h1>
                            <p className="favorites-subtitle">
                                {pagination?.total
                                    ? t('favorites.count', { count: pagination.total })
                                    : t('favorites.noFavorites')}
                            </p>
                        </div>
                    </div>

                    {/* Favorites Content */}
                    {loading && images.length === 0 ? (
                        <div className="favorites-empty" role="status" aria-live="polite">
                            <div className="flex items-center justify-center py-12">
                                <LoadingSpinner size="large" />
                            </div>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="favorites-empty" role="status" aria-live="polite">
                            <Heart size={64} className="empty-icon" />
                            <h2>{t('favorites.empty')}</h2>
                            <p>{t('favorites.emptyHint')}</p>
                            <button
                                className="browse-button"
                                onClick={() => navigate('/')}
                            >
                                {t('favorites.explore')}
                            </button>
                        </div>
                    ) : (
                        <NoFlashGrid
                            images={images}
                            loading={loading}
                            onLoadData={loadData}
                            onImageClick={handleImageClick}
                            pagination={pagination}
                            onLoadMore={loadMore}
                        />
                    )}

                </div>
            </main>

        </>
    );
}

export default FavoritesPage;

