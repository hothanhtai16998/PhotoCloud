import { Home, Bookmark, Heart, Info, Download, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { t, getLocale, setLocale, type Locale } from '@/i18n';
import { useState, useEffect, useRef, useCallback } from 'react';
import { favoriteService } from '@/services/favoriteService';
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
  const prevPathnameRef = useRef<string>(location.pathname);

  // Listen for locale changes
  useEffect(() => {
    const handleLocaleChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ locale: Locale }>;
      setCurrentLocale(customEvent.detail.locale);
    };

    window.addEventListener('localeChange', handleLocaleChange);
    return () => window.removeEventListener('localeChange', handleLocaleChange);
  }, []);

  // Fetch favorite thumbnail and total count
  const fetchFavoriteThumbnail = useCallback(async () => {
    if (!accessToken) {
      setFavoriteThumbnail(null);
      setFavoriteTotal(0);
      return;
    }

    try {
      // Fetch first page to get thumbnail and total count
      // Note: Backend filters out images with inactive categories, so we fetch limit: 5
      // to increase chance of finding at least one valid image
      const response = await favoriteService.getFavorites({ page: 1, limit: 5 });
      if (response.success) {
        const total = response.pagination?.total || 0;
        setFavoriteTotal(total);
        
        // Use the first available image as thumbnail (most recent)
        if (response.images && response.images.length > 0 && total > 0) {
          setFavoriteThumbnail(response.images[0]);
        } else {
          setFavoriteThumbnail(null);
        }
      } else {
        setFavoriteThumbnail(null);
        setFavoriteTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch favorite thumbnail:', error);
      setFavoriteThumbnail(null);
      setFavoriteTotal(0);
    }
  }, [accessToken]);

  // Listen for favorites updates to update thumbnail and count immediately
  useEffect(() => {
    if (!accessToken) return;

    const handleFavoritesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ 
        thumbnailImage: Image | null; 
        total: number;
      }>;
      const { thumbnailImage, total } = customEvent.detail || {};
      
      setFavoriteThumbnail(thumbnailImage || null);
      setFavoriteTotal(total || 0);
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, [accessToken]);

  // Fetch when user logs in/out
  useEffect(() => {
    fetchFavoriteThumbnail();
  }, [fetchFavoriteThumbnail]);

  // Refresh thumbnail when navigating to/from favorites page (user might have added/removed favorites)
  useEffect(() => {
    if (!accessToken) return;
    
    const prevPathname = prevPathnameRef.current;
    const isFavoritesPage = location.pathname === '/favorites';
    const wasFavoritesPage = prevPathname === '/favorites';
    
    // Refresh if navigating to/from favorites page
    if (isFavoritesPage || wasFavoritesPage) {
      fetchFavoriteThumbnail();
    }
    
    // Update previous pathname
    prevPathnameRef.current = location.pathname;
  }, [location.pathname, accessToken, fetchFavoriteThumbnail]);

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


