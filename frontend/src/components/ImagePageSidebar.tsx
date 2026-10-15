import { Bookmark, Heart, Info, Download, Shield, Compass, Camera, BookOpen, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { generateImageSlug } from '@/lib/utils';
import { WebSocketStatus } from './WebSocketStatus';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { t, getLocale, setLocale, type Locale } from '@/i18n';
import { useState, useEffect, useCallback, useRef, memo, startTransition } from 'react';
import { favoriteService } from '@/services/favoriteService';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import type { Image } from '@/types/image';
import { readFavoritePreview, saveFavoritePreview, clearFavoritePreview, toFavoriteThumbnail, EMPTY_PREVIEW } from '@/utils/sidebarFavoriteCache';
import vietnamFlag from '@/assets/vietnam.svg';
import americaFlag from '@/assets/america.svg';
import './ImagePageSidebar.css';
import { getSessionItem, setSessionItem, removeSessionItem } from '@/utils/safeStorage';
import { LANGUAGE_SWITCHER_ENABLED } from '@/config/features';
import { validateModalState } from '@/utils/modalNavigation';
import { getImagePageScroll } from '@/utils/imagePageScroll';
import { useIsMobile } from '@/hooks/useIsMobile';

// NOTE: refreshToken cookie is httpOnly, so we can't check it from JavaScript
// Instead, we use optimistic rendering based on isInitializing and accessToken state

/**
 * Hybrid-style sidebar for all pages, inspired by PHOTOCLOUD.
 * Icon-only with tooltips, active state indicators, and proper navigation.
 */
const ImagePageSidebar = memo(function ImagePageSidebar({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  useEffect(() => {
    if (!libraryOpen) return;
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
    const timer = window.setTimeout(() => startTransition(() => setLibraryReady(true)), delay);
    return () => window.clearTimeout(timer);
  }, [libraryOpen]);
  const changeLibraryOpen = (open: boolean) => {
    setLibraryReady(false);
    setLibraryOpen(open);
  };
  const [libraryError, setLibraryError] = useState(false);
  const favoriteImages = useFavoriteStore(state => state.images);
  const favoritesLoading = useFavoriteStore(state => state.loading);
  useEffect(() => {
    if (!libraryOpen) return;
    let active = true;
    setLibraryError(false);
    const store = useFavoriteStore.getState();
    const fetch = store.hasLoaded ? store.checkAndRefreshIfStale() : store.fetchFavorites();
    void fetch.catch(() => { if (active) setLibraryError(true); });
    return () => { active = false; };
  }, [libraryOpen]);
  const isMobile = useIsMobile();
  const location = useLocation();
  const accessToken = useAuthStore(state => state.accessToken);
  const userId = useUserStore(state => state.user?._id);
  const isAdmin = useUserStore(state => Boolean(state.user?.isAdmin));
  
  const isInitializing = useAuthStore(state => state.isInitializing);
  const [preview, setPreview] = useState(readFavoritePreview);
  const [hadAuthOnMount] = useState(() => getSessionItem('hasAuth') === 'true' || Boolean(preview.ownerId));
  useEffect(() => {
    if (accessToken) setSessionItem('hasAuth', 'true');
    else if (!isInitializing) removeSessionItem('hasAuth');
  }, [accessToken, isInitializing]);
  const showAuthIcons = Boolean(accessToken) || (isInitializing && hadAuthOnMount);

  const [currentLocale, setCurrentLocale] = useState<Locale>(getLocale);
  const previewMatchesUser = !userId || preview.ownerId === userId;
  const favoriteThumbnail = previewMatchesUser ? preview.thumbnail : null;
  const favoriteTotal = previewMatchesUser ? preview.total : 0;
  useEffect(() => {
    if (!showAuthIcons) {
      clearFavoritePreview();
      setPreview(EMPTY_PREVIEW);
    } else if (userId && preview.ownerId === userId) {
      saveFavoritePreview(preview);
    }
  }, [showAuthIcons, userId, preview]);
  // Subscribe to store values separately to ensure reactivity
  const firstFavorite = useFavoriteStore(state => state.images[0] ?? null);
  const storedFavoriteTotal = useFavoriteStore(state => state.pagination?.total);
  const hasStoreData = useFavoriteStore(state => Boolean(state.pagination || state.images.length));

  // Listen for locale changes
  useEffect(() => {
    if (!LANGUAGE_SWITCHER_ENABLED) return;
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
      const customEvent = event as CustomEvent<{ 
        thumbnailImage: Image | null;
        total?: number | null;
      }>;
      const thumbnailImage = customEvent.detail?.thumbnailImage;
      const total = customEvent.detail?.total;
      
      if (!userId) return;
      setPreview(previous => ({ ownerId: userId, thumbnail: toFavoriteThumbnail(thumbnailImage ?? null), total: total ?? (previous.ownerId === userId ? previous.total : 0) }));
      
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
  }, [showAuthIcons, userId]);

  // Fetch thumbnail on initial load (for new sessions/refresh) - like PHOTOCLOUD
  // Only runs if store has no data yet
  const fetchInitialThumbnail = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await favoriteService.getFavorites({ page: 1, limit: 1 }, signal);
      if (signal?.aborted) return;
      
      if (response.success && response.pagination) {
        const total = response.pagination.total || 0;
        // Share the known total without marking the full library as loaded.
        if (!useFavoriteStore.getState().pagination) {
          useFavoriteStore.setState({ pagination: { ...response.pagination, limit: 20, pages: Math.ceil(total / 20) } });
        }
        setPreview({ ownerId: userId ?? null, total, thumbnail: toFavoriteThumbnail(total > 0 ? response.images?.[0] ?? null : null) });
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
  }, [userId]);

  // Start as soon as authentication and the owner are confirmed.
  useEffect(() => {
    if (isInitializing || !accessToken || !userId || hasStoreData) return;
    const controller = new AbortController();
    void fetchInitialThumbnail(controller.signal);
    return () => controller.abort();
  }, [isInitializing, accessToken, userId, hasStoreData, fetchInitialThumbnail]);

  // Only the first image and total matter to this icon.
  useEffect(() => {
    if (!showAuthIcons || !userId || !hasStoreData) return;
    setPreview(previous => ({ ownerId: userId, thumbnail: firstFavorite ? toFavoriteThumbnail(firstFavorite) : storedFavoriteTotal === 0 ? null : previous.ownerId === userId ? previous.thumbnail : null, total: storedFavoriteTotal ?? (previous.ownerId === userId ? previous.total : 0) }));
  }, [showAuthIcons, userId, hasStoreData, firstFavorite, storedFavoriteTotal]);

  // Scroll to top immediately when navigating via sidebar (not smooth scroll)
  // Track previous pathname to detect route changes
  const previousPathnameRef = useRef<string>(location.pathname);
  useEffect(() => {
    let frame = 0;
    // Only scroll if pathname actually changed (not just a re-render)
    if (previousPathnameRef.current !== location.pathname) {
      // Don't scroll if this is modal navigation (ImagePage)
      // Modal navigation has location.state with modal flag
      const isModalNavigation = !isMobile && validateModalState(location.state).isValid;
      
      // Don't scroll if scroll restoration is in progress (when closing ImagePage modal)
      const scrollRestoreInProgress = getSessionItem('scrollRestoreInProgress') === 'true';
      
      // Don't scroll if there's a saved scroll position (modal was just closed)
      const hasSavedScroll = getSessionItem('imageGridScrollPosition') !== null;
      
      if (!isModalNavigation && !scrollRestoreInProgress && !hasSavedScroll && !getImagePageScroll(location)) {
        // Use requestAnimationFrame to ensure it happens after scroll restoration
        frame = requestAnimationFrame(() => {
          // Double-check scroll restoration didn't just complete
          const stillRestoring = getSessionItem('scrollRestoreInProgress') === 'true';
          const stillHasScroll = getSessionItem('imageGridScrollPosition') !== null;
          if (!stillRestoring && !stillHasScroll && !getImagePageScroll(location)) {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        });
      }
      
      previousPathnameRef.current = location.pathname;
    }
    return () => cancelAnimationFrame(frame);
  }, [location, isMobile]);


  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/t/');
    }

    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavItemClass = (path: string) => {
    const baseClass = 'sidebar-nav-item';
    return isActive(path) ? `${baseClass} active` : baseClass;
  };

  const handleLanguageToggle = () => {
    const newLocale: Locale = getLocale() === 'vi' ? 'en' : 'vi';
    setLocale(newLocale, { reload: true });
  };

  const LANGUAGE_LABELS: Record<Locale, string> = {
    vi: 'Tiếng Việt',
    en: 'English',
  };

  const nextLocale: Locale = currentLocale === 'vi' ? 'en' : 'vi';

  if (variant === 'header') return showAuthIcons ? (
    <div className="header-library-actions">
      <Dialog.Root modal={false} open={libraryOpen} onOpenChange={changeLibraryOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="header-library-action" title={t('header.favorites')} aria-label={`${t('header.favorites')} (${favoriteTotal})`}>
            <Heart size={19} /><span className="header-library-count">{favoriteTotal}</span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <div className="header-library-overlay" aria-hidden="true" onClick={() => setLibraryOpen(false)} />
          <Dialog.Content className="header-library-panel" aria-describedby={undefined}>
            <div className="header-library-heading">
              <Dialog.Title>{t('header.favorites')}</Dialog.Title>
              <Dialog.Close className="header-library-action" aria-label="Đóng" title="Đóng"><X size={20} /></Dialog.Close>
            </div>
            <div className="header-library-grid">
              {(favoritesLoading || !libraryReady) && <p role="status">Đang tải ảnh…</p>}
              {libraryError && <p role="alert">Không tải được ảnh. Vui lòng mở lại để thử lại.</p>}
              {libraryReady && !favoritesLoading && !libraryError && favoriteImages.length === 0 && <p>Chưa có ảnh yêu thích.</p>}
              {libraryReady && favoriteImages.slice(0, 20).map(image => <Link key={image._id} to={`/photos/${generateImageSlug(image.imageTitle || 'Untitled', image._id)}`} onClick={() => setLibraryOpen(false)}>
                <img src={image.thumbnailAvifUrl || image.thumbnailUrl || image.smallAvifUrl || image.smallUrl || image.imageUrl} alt={image.imageTitle || 'Ảnh yêu thích'} loading="lazy" decoding="async" width={160} height={160} />
              </Link>)}
            </div>
            <Link className="header-library-view-all" to="/favorites" onClick={() => setLibraryOpen(false)}>Xem tất cả ảnh yêu thích</Link>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Link to="/downloads" className="header-library-action" title={t('profile.downloadHistory')} aria-label={t('profile.downloadHistory')}><Download size={19} /></Link>
    </div>
  ) : null;

  return (
    <aside className="image-page-sidebar">
      {/* Middle section - Main Navigation */}
      <div className="sidebar-section sidebar-section-middle">
        <Link
          to="/explore"
          className={getNavItemClass('/explore')}
          aria-label={currentLocale === 'vi' ? 'Khám phá' : 'Explore'}
          data-tooltip={currentLocale === 'vi' ? 'Khám phá' : 'Explore'}
          aria-current={isActive('/explore') ? 'page' : undefined}
        >
          <Compass className="sidebar-icon" />
        </Link>

        <Link
          to="/packages"
          className={getNavItemClass('/packages')}
          aria-label={currentLocale === 'vi' ? 'Gói chụp' : 'Packages'}
          data-tooltip={currentLocale === 'vi' ? 'Gói chụp' : 'Packages'}
          aria-current={isActive('/packages') ? 'page' : undefined}
        >
          <Camera className="sidebar-icon" />
        </Link>

        <Link
          to="/blog"
          className={getNavItemClass('/blog')}
          aria-label={currentLocale === 'vi' ? 'Blog' : 'Blog'}
          data-tooltip={currentLocale === 'vi' ? 'Blog' : 'Blog'}
          aria-current={isActive('/blog') ? 'page' : undefined}
        >
          <BookOpen className="sidebar-icon" />
        </Link>

        <div className="sidebar-separator" />

        <Link
          to="/collections"
          className={getNavItemClass('/collections')}
          aria-label={t('collections.title')}
          data-tooltip={t('collections.title')}
          aria-current={isActive('/collections') ? 'page' : undefined}
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
              data-tooltip={`${t('header.favorites')} · ${favoriteTotal}`}
              aria-current={isActive('/favorites') ? 'page' : undefined}
            >
              {favoriteThumbnail ? (
                <div className="sidebar-favorite-thumbnail">
                  <img
                    src={favoriteThumbnail.imageUrl}
                    alt={favoriteThumbnail.imageTitle || 'Favorite'}
                    className="sidebar-favorite-thumbnail-img"
                    width={40}
                    height={40}
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
              data-tooltip={t('profile.downloadHistory')}
              aria-current={isActive('/downloads') ? 'page' : undefined}
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
          data-tooltip={currentLocale === 'vi' ? 'Giới thiệu PhotoCloud' : 'About PhotoCloud'}
          aria-current={isActive('/about') ? 'page' : undefined}
        >
          <Info className="sidebar-icon" />
        </Link>

        {/* CRITICAL: Always render admin icon when user is admin */}
        {showAuthIcons && isAdmin && (
          <>
            <div className="sidebar-separator" />
            <Link
              to="/admin"
              className={getNavItemClass('/admin')}
              aria-label="Admin"
              data-tooltip={currentLocale === 'vi' ? 'Quản lý studio' : 'Studio management'}
              aria-current={isActive('/admin') ? 'page' : undefined}
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
        
        {LANGUAGE_SWITCHER_ENABLED && <>
        <div className="sidebar-separator" />
        <button
          type="button"
          className="sidebar-nav-item sidebar-language-toggle"
          onClick={handleLanguageToggle}
          aria-label={`Switch to ${LANGUAGE_LABELS[nextLocale]}`}
          data-tooltip={`Switch to ${LANGUAGE_LABELS[nextLocale]}`}
        >
          <img 
            src={nextLocale === 'vi' ? vietnamFlag : americaFlag} 
            alt={LANGUAGE_LABELS[nextLocale]} 
            className="sidebar-icon sidebar-language-icon" 
          />
        </button>
        </>}
      </div>
    </aside>
  );
});

export default ImagePageSidebar;


