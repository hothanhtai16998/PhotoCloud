import { Home, Bookmark, Heart, Info, Download, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { t, getLocale, setLocale, type Locale } from '@/i18n';
import { useState, useEffect, useCallback } from 'react';
import { favoriteService } from '@/services/favoriteService';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import type { Image } from '@/types/image';
import vietnamFlag from '@/assets/vietnam.svg';
import americaFlag from '@/assets/america.svg';
import './ImagePageSidebar.css';

/**
 * Hybrid-style sidebar for all pages, inspired by Unsplash.
 * Icon-only with tooltips, active state indicators, and proper navigation.
 */
const ImagePageSidebar = () => {
  const location = useLocation();
  const { accessToken } = useAuthStore();
  const { user } = useUserStore();
  const [currentLocale, setCurrentLocale] = useState<Locale>(getLocale());
  const [favoriteThumbnail, setFavoriteThumbnail] = useState<Image | null>(null);
  const [favoriteTotal, setFavoriteTotal] = useState<number>(0);
  // Subscribe to store values separately to ensure reactivity
  const favoriteImages = useFavoriteStore((state) => state.images);
  const favoritePagination = useFavoriteStore((state) => state.pagination);

  // Listen for locale changes
  useEffect(() => {
    const handleLocaleChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ locale: Locale }>;
      setCurrentLocale(customEvent.detail.locale);
    };

    window.addEventListener('localeChange', handleLocaleChange);
    return () => window.removeEventListener('localeChange', handleLocaleChange);
  }, []);


  // Listen for favorites updates to update thumbnail immediately (optimistic updates)
  // Count is handled by store subscription below (more reliable)
  useEffect(() => {
    if (!accessToken) return;

    const handleFavoritesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ thumbnailImage: Image | null }>;
      const thumbnailImage = customEvent.detail?.thumbnailImage;
      setFavoriteThumbnail(thumbnailImage ?? null);
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
  }, [accessToken]);

  // Clear state when logged out (consolidated logic)
  useEffect(() => {
    if (!accessToken) {
      setFavoriteThumbnail(null);
      setFavoriteTotal(0);
    }
  }, [accessToken]);

  // Fetch thumbnail on initial load (for new sessions/refresh) - like Unsplash
  // Only runs if store has no data yet
  const fetchInitialThumbnail = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await favoriteService.getFavorites({ page: 1, limit: 1 }, signal);
      if (signal?.aborted) return;
      
      if (response.success && response.pagination) {
        const total = response.pagination.total || 0;
        setFavoriteTotal(total);
        setFavoriteThumbnail(total > 0 && response.images?.[0] ? response.images[0] : null);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
        return;
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_CANCELED') {
        return;
      }
      if (signal?.aborted) return;
      
      console.error('Failed to fetch initial favorite thumbnail:', error);
    }
  }, []);

  // Fetch on mount if store is empty (initial load/refresh)
  useEffect(() => {
    if (!accessToken) return;
    
    const abortController = new AbortController();
    
    // Check store state at mount time - if empty, fetch thumbnail
    const hasStoreData = favoritePagination || favoriteImages.length > 0;
    if (!hasStoreData) {
      fetchInitialThumbnail(abortController.signal);
    }
    
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]); // Only run on mount/accessToken change, intentionally not including store values

  // Sync thumbnail and count from store (PRIMARY SOURCE OF TRUTH)
  // Takes over once store has data (e.g., after visiting favorites page)
  useEffect(() => {
    if (!accessToken) return;
    
    // Skip if store is empty (initial fetch handles it)
    if (!favoritePagination && favoriteImages.length === 0) return;
    
    // Update count from pagination (most reliable)
    if (favoritePagination?.total !== undefined) {
      setFavoriteTotal(favoritePagination.total);
    } else if (favoriteImages.length > 0) {
      setFavoriteTotal(favoriteImages.length); // Fallback
    }
    
    // Update thumbnail from store (always more accurate than initial fetch)
    setFavoriteThumbnail(favoriteImages.length > 0 && favoriteImages[0] ? favoriteImages[0] : null);
  }, [favoriteImages, favoritePagination, accessToken]);


  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/t/');
    }
    if (path === '/profile') {
      // Match /profile/:username, /@:username, /@:username/tab, and /profile/user/:userId
      return location.pathname === path || 
             location.pathname.startsWith(path + '/') ||
             location.pathname.match(/^\/@[^/]+(\/(following|followers|collections|stats))?$/);
    }
    if (path === '/admin') {
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavItemClass = (path: string) => {
    const baseClass = 'sidebar-nav-item';
    return isActive(path) ? `${baseClass} active` : baseClass;
  };

  const handleLanguageToggle = () => {
    const newLocale: Locale = currentLocale === 'vi' ? 'en' : 'vi';
    setLocale(newLocale);
    setCurrentLocale(newLocale);
    // Reload to apply translations
    window.location.reload();
  };

  const LANGUAGE_LABELS: Record<Locale, string> = {
    vi: 'Tiếng Việt',
    en: 'English',
  };

  const nextLocale: Locale = currentLocale === 'vi' ? 'en' : 'vi';

  return (
    <aside className="image-page-sidebar">
      {/* Top section - Home */}
      <div className="sidebar-section sidebar-section-top">
        <Link
          to="/"
          className={getNavItemClass('/')}
          aria-label={t('common.all')}
          title={t('common.all')}
        >
          <Home className="sidebar-icon" />
        </Link>
      </div>

      {/* Middle section - Main Navigation */}
      <div className="sidebar-section sidebar-section-middle">
        <Link
          to="/collections"
          className={getNavItemClass('/collections')}
          aria-label={t('collections.title')}
          title={t('collections.title')}
        >
          <Bookmark className="sidebar-icon" />
        </Link>

        {accessToken && (
          <>
            <div className="sidebar-separator" />
            <Link
              to="/favorites"
              className={getNavItemClass('/favorites')}
              aria-label={t('header.favorites')}
              title={t('header.favorites')}
            >
              {favoriteThumbnail ? (
                <div className="sidebar-favorite-thumbnail">
                  <img
                    src={favoriteThumbnail.thumbnailUrl || favoriteThumbnail.smallUrl || favoriteThumbnail.imageUrl}
                    alt={favoriteThumbnail.imageTitle || 'Favorite'}
                    className="sidebar-favorite-thumbnail-img"
                  />
                  {favoriteTotal > 0 && (
                    <span className="sidebar-favorite-count">{favoriteTotal}</span>
                  )}
                </div>
              ) : (
                <Heart className="sidebar-icon" />
              )}
            </Link>
          </>
        )}

        {accessToken && (
          <>
            <div className="sidebar-separator" />
            <Link
              to="/downloads"
              className={getNavItemClass('/downloads')}
              aria-label={t('profile.downloadHistory')}
              title={t('profile.downloadHistory')}
            >
              <Download className="sidebar-icon" />
            </Link>
          </>
        )}
      </div>

      {/* Bottom section - About, Admin, and Language */}
      <div className="sidebar-section sidebar-section-bottom">
        <Link
          to="/about"
          className={getNavItemClass('/about')}
          aria-label={t('header.about')}
          title={t('header.about')}
        >
          <Info className="sidebar-icon" />
        </Link>

        {accessToken && user?.isAdmin && (
          <>
            <div className="sidebar-separator" />
            <Link
              to="/admin"
              className={getNavItemClass('/admin')}
              aria-label="Admin"
              title="Admin"
            >
              <Shield className="sidebar-icon" />
            </Link>
          </>
        )}

        <div className="sidebar-separator" />
        <button
          className="sidebar-nav-item sidebar-language-toggle"
          onClick={handleLanguageToggle}
          aria-label={`Switch to ${LANGUAGE_LABELS[nextLocale]}`}
          title={`Switch to ${LANGUAGE_LABELS[nextLocale]}`}
        >
          <img 
            src={nextLocale === 'vi' ? vietnamFlag : americaFlag} 
            alt={LANGUAGE_LABELS[nextLocale]} 
            className="sidebar-icon sidebar-language-icon" 
          />
        </button>
      </div>
    </aside>
  );
};

export default ImagePageSidebar;


