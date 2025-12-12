import { useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useFavoriteStore } from "@/stores/useFavoriteStore";
import Header from "@/components/Header";
import { Heart } from "lucide-react";
import { NoFlashGrid } from "@/components/NoFlashGrid";
import { generateImageSlug } from "@/lib/utils";
import { saveScrollPosition, prepareModalNavigationState, setModalActive } from "@/utils/modalNavigation";
import { ActualLocationContext } from "@/contexts/ActualLocationContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Image } from "@/types/image";
import { t } from "@/i18n";
import "./FavoritesPage.css";


function FavoritesPage() {
    const navigate = useNavigate();
    const actualLocation = useContext(ActualLocationContext);
    const isMobile = useIsMobile();

    // Favorite store
    const {
        images,
        loading,
        pagination,
        currentPage,
        fetchFavorites,
    } = useFavoriteStore();

    useEffect(() => {
        // ProtectedRoute ensures user is authenticated
        fetchFavorites(1);
    }, [fetchFavorites]);

    // Load data callback for NoFlashGrid
    const loadData = useCallback(async () => {
        await fetchFavorites(currentPage);
    }, [fetchFavorites, currentPage]);

    // Handle image click - navigate to ImagePage
    const handleImageClick = useCallback((image: Image, _index: number) => {
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        const targetPath = `/photos/${slug}`;
        
        // Mobile: full page navigation
        if (isMobile) {
            navigate(targetPath, {
                state: { images, fromGrid: true }
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
            state: { ...modalState, images, fromGrid: true }
        });
    }, [navigate, images, actualLocation, isMobile]);


    return (
        <>
            <Header />
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
                            <p>{t('favorites.loading') || 'Loading favorites...'}</p>
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
                        />
                    )}

                </div>
            </main>

        </>
    );
}

export default FavoritesPage;

