import { Home, Bookmark, Heart, Info, Download, Shield } from 'lucide-react';
import { WebSocketStatus } from './WebSocketStatus';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { t, getLocale, setLocale, type Locale } from '@/i18n';
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { favoriteService } from '@/services/favoriteService';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import type { Image } from '@/types/image';
import vietnamFlag from '@/assets/vietnam.svg';
import americaFlag from '@/assets/america.svg';
import './ImagePageSidebar.css';
import { timingConfig } from '@/config/timingConfig';

// NOTE: refreshToken cookie is httpOnly, so we can't check it from JavaScript
// Instead, we use optimistic rendering based on isInitializing and accessToken state

/**
 * Hybrid-style sidebar for all pages, inspired by Unsplash.
 * Icon-only with tooltips, active state indicators, and proper navigation.
 */
const ImagePageSidebar = () => {
  const location = useLocation();
  const { accessToken } = useAuthStore();
  const { user } = useUserStore();
  
  // CRITICAL: refreshToken cookie is httpOnly, so we can't check it from JavaScript
  // Instead, use sessionStorage to persist auth state across refreshes
  // This prevents icons from flashing on refresh
  const { isInitializing } = useAuthStore();
  
  // Initialize stableHasAuth from sessionStorage (persists across refreshes)
  // This ensures icons appear immediately on refresh if user was previously authenticated
  const getInitialHasAuth = (): boolean => {
    if (typeof window === 'undefined') return false;
    const persisted = sessionStorage.getItem('hasAuth');
    return persisted === 'true';
  };
  const hasAuthRef = useRef(getInitialHasAuth());
  
  // Update sessionStorage when accessToken changes
  useEffect(() => {
    if (accessToken) {
      hasAuthRef.current = true;
      sessionStorage.setItem('hasAuth', 'true');
    } else if (!isInitializing) {
      // Only clear on logout (when not initializing), not on initial load
      hasAuthRef.current = false;
      sessionStorage.removeItem('hasAuth');
    }
  }, [accessToken, isInitializing]);
  
  const stableHasAuth = hasAuthRef.current;
  
  // Unsplash-style: Show icons optimistically during initialization, then use actual state
  // Icons appear instantly on refresh (optimistic), then stay visible if authenticated
  // CRITICAL: Show icons if:
  // 1. We have accessToken (confirmed authenticated), OR
  // 2. We're still initializing (optimistic - user likely logged in), OR
  // 3. We've had auth before (stableHasAuth - prevents disappearing)
  const showAuthIcons = useMemo(() => {
    // During initialization, optimistically show icons (user likely logged in)
    // After initialization, only show if we have accessToken or had it before
    const result = accessToken || (isInitializing && stableHasAuth) || stableHasAuth;
    return Boolean(result);
  }, [accessToken, isInitializing, stableHasAuth]);
  
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
    if (!showAuthIcons) return;

    const handleFavoritesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ thumbnailImage: Image | null }>;
      const thumbnailImage = customEvent.detail?.thumbnailImage;
      setFavoriteThumbnail(thumbnailImage ?? null);
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
  }, [showAuthIcons]);

  // Clear state when logged out (consolidated logic)
  useEffect(() => {
    if (!showAuthIcons) {
      setFavoriteThumbnail(null);
      setFavoriteTotal(0);
    }
  }, [showAuthIcons]);

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
      
      // Silently fail - favorite thumbnail is optional
    }
  }, []);

  // Fetch on mount if store is empty (initial load/refresh)
  // CRITICAL: Wait for auth initialization before making authenticated requests
  // showAuthIcons can be true optimistically, but we need actual token for API calls
  useEffect(() => {
    // Don't fetch if auth is still initializing - wait for token to be available
    if (isInitializing) {
      return;
    }
    
    // Don't fetch if user is not authenticated (no accessToken)
    if (!accessToken) {
      return;
    }
    
    // Don't fetch if icons shouldn't be shown (user not authenticated)
    if (!showAuthIcons) {
      return;
    }
    
    const abortController = new AbortController();
    
    // Check store state at mount time - if empty, fetch thumbnail
    const hasStoreData = favoritePagination || favoriteImages.length > 0;
    if (!hasStoreData) {
      // Unsplash-style: Use requestIdleCallback to make requests after initial render
      // This naturally keeps requests pending during page load phase (like Unsplash)
      const scheduleFetch = () => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            if (!abortController.signal.aborted) {
              fetchInitialThumbnail(abortController.signal);
            }
          }, { timeout: 100 });
        } else {
          // Fallback for browsers without requestIdleCallback
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!abortController.signal.aborted) {
                fetchInitialThumbnail(abortController.signal);
              }
            });
          });
        }
      };
      
      scheduleFetch();
      
      return () => {
        abortController.abort();
      };
    }
    
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, accessToken, showAuthIcons, favoritePagination, favoriteImages.length, fetchInitialThumbnail]); // Wait for auth before fetching

  // Sync thumbnail and count from store (PRIMARY SOURCE OF TRUTH)
  // Takes over once store has data (e.g., after visiting favorites page)
  useEffect(() => {
    if (!showAuthIcons) return;
    
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

        {/* CRITICAL: Always render auth icons - show immediately if we have cookie/token */}
        {showAuthIcons && (
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

        {showAuthIcons && (
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

        {/* CRITICAL: Always render admin icon when user is admin */}
        {showAuthIcons && user?.isAdmin && (
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
        
        {/* WebSocket Status - Icon only, no text */}
        <div className="sidebar-nav-item" style={{ cursor: 'default' }}>
          <WebSocketStatus />
        </div>
        
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


