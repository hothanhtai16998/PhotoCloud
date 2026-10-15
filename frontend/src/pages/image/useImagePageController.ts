import { loadedImages,preloadImage } from '@/components/NoFlashGrid/utils/imagePreloader';
import { ActualLocationContext,BackgroundRouteContext,ImagePresentationContext } from '@/contexts/ActualLocationContext';
import { updateFavoriteCache,useBatchedFavoriteCheck } from '@/hooks/useBatchedFavoriteCheck';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { useImageDialogFocus } from '@/hooks/useImageDialogFocus';
import { useImagePageScrollRestore } from '@/hooks/useImagePageScrollRestore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getLocale,t } from '@/i18n';
import api from '@/lib/axios';
import { extractIdFromSlug,generateImageSlug } from '@/lib/utils';
import { favoriteService } from '@/services/favoriteService';
import { imageFetchService } from '@/services/imageFetchService';
import { imageStatsService } from '@/services/imageStatsService';
import { syncGlobalLoading } from '@/stores/helpers/syncGlobalLoading';
import '@/stores/useDownloadHistoryStore';
import { useImageFavoriteCountStore } from '@/stores/useImageFavoriteCountStore';
import { useImageStatsStore } from '@/stores/useImageStatsStore';
import { useUserStore } from '@/stores/useUserStore';
import type { Image } from '@/types/image';
import { detectAvifSupport } from '@/utils/avifSupport';
import { captureImageActionSession } from '@/utils/imageActionSession';
import { getImagePageScroll,saveImagePageScroll } from '@/utils/imagePageScroll';
import { getOriginalDisplayUrl,getRegularDisplayUrl } from '@/utils/imageUrlUtils';
import { clearModalActive,getImageNavigationBackground,restoreScrollPosition,setModalActive,validateModalState } from '@/utils/modalNavigation';
import { sharePhotoLink } from '@/utils/sharePhotoLink';
import { translateTags } from '@/utils/tagTranslations';
import { useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { useLocation,useNavigate,useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useImagePageData } from './useImagePageData';
const apiStatsCache = new Map<string, { views?: number; downloads?: number }>();

export function useImagePageController() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore(state => state.user);
  
  // IMPORTANT: Use ActualLocationContext to get the REAL location (not background location)
  // When rendered as modal route, location from useLocation() is the background location
  // We need the actual location with modal state
  const actualLocation = useContext(ActualLocationContext);
  const isBackgroundRoute = useContext(BackgroundRouteContext);
  const locationWithState = actualLocation || location;

  // Ref to capture initial location.state (prevents re-fetching when React Router clears it)
  // Use locationWithState (actual location) to capture the real state
  const initialLocationStateRef = useRef(locationWithState.state);
  
  // Update initialLocationStateRef when location.state changes (for replace navigation)
  useEffect(() => {
    if (locationWithState.state) {
      initialLocationStateRef.current = locationWithState.state;
    }
  }, [locationWithState.state]);

  // Core state
  const [initialImage] = useState<Image | null>(() => {
    const candidate = locationWithState.state?.image as Image | undefined;
    const id = slug ? extractIdFromSlug(slug) : null;
    if (!candidate?._id || !id) return null;
    return (id.length === 24 ? candidate._id : candidate._id.slice(-12)).toLowerCase() === id.toLowerCase() ? candidate : null;
  });
  const [image, setImage] = useState<Image | null>(initialImage);
  const [images, setImages] = useState<Image[]>(() => initialImage
    ? (Array.isArray(locationWithState.state?.images) ? locationWithState.state.images : [initialImage]) : []);
  const [loading, setLoading] = useState(!initialImage);
  const [error, setError] = useState<string | null>(null);
  const [imageAttempt, setImageAttempt] = useState(0);
  const retryImage = useCallback(() => setImageAttempt(value => value + 1), []);
  const [supportsAvif, setSupportsAvif] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (window as any).avifSupport ?? false;
  });

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const imageDialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const scrollAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isImageChangingRef = useRef(false);
  const topInfoRef = useRef<HTMLDivElement>(null);
  const authorAreaRef = useRef<HTMLDivElement>(null);

  const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authorHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authorFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAuthorTimers = useCallback(() => {
    for (const timer of [authorTooltipTimeoutRef, authorHideTimeoutRef, authorFadeTimeoutRef]) {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);
  const pageActiveRef = useRef(true);
  // Track container height to maintain it during transitions

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [displayHeight, setDisplayHeight] = useState(400);

  // Detect AVIF support once, cache globally on window, and use for modal URLs
  useEffect(() => {
    let isMounted = true;
    detectAvifSupport()
      .then((result) => {
        if (isMounted) {
          setSupportsAvif(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSupportsAvif(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Detect mobile
  const isMobile = useIsMobile();

  // Extract image ID from slug
  const imageId = useMemo(() => {
    if (!slug) return null;
    return extractIdFromSlug(slug);
  }, [slug]);

  // Find current image index
  const currentImageIndex = useMemo(() => {
    if (!image || images.length === 0) return -1;
    return images.findIndex((img) => img._id === image._id);
  }, [image, images]);

  const presentation = useContext(ImagePresentationContext);
  const showModalStyle = presentation === 'modal' && !isMobile && Boolean(slug);

  // Scroll state for container styling
  const [isScrolled, setIsScrolled] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isImageChanging, setIsImageChanging] = useState(false);

  // Helpers to choose best display URLs (prefer AVIF when supported)
  // Use shared utility functions with AVIF support
  const getRegularUrl = useCallback((img: Image | null): string => {
    return getRegularDisplayUrl(img, supportsAvif);
  }, [supportsAvif]);

  const getOriginalUrl = useCallback((img: Image | null): string => {
    return getOriginalDisplayUrl(img, supportsAvif);
  }, [supportsAvif]);

  useEffect(() => {
    pageActiveRef.current = true;
    return () => {
      pageActiveRef.current = false;
      if (scrollAnimationTimerRef.current) clearTimeout(scrollAnimationTimerRef.current);
      clearAuthorTimers();

    };
  }, [clearAuthorTimers]);

  // Stats state
  const getInitialStats = useCallback(() => {
    if (!image?._id) return { views: 0, downloads: 0 };
    const apiStats = apiStatsCache.get(image._id);
    return {
      views: apiStats?.views ?? (image.views || 0),
      downloads: apiStats?.downloads ?? (image.downloads || 0),
    };
  }, [image]);

  const [views, setViews] = useState<number>(getInitialStats().views);
  const [downloads, setDownloads] = useState<number>(getInitialStats().downloads);

  // Favorite state
  const isFavorited = useBatchedFavoriteCheck(image?._id || '');
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const favoritePendingRef = useRef(false);
  const downloadPendingRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const sharePendingRef = useRef(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Favorite count state
  const updateFavoriteCount = useImageFavoriteCountStore(state => state.updateFavoriteCount);
  const storedFavoriteCount = useImageFavoriteCountStore(state => image?._id ? state.favoriteCounts.get(image._id) : undefined);
  const favoriteCount = storedFavoriteCount ?? image?.favoriteCount ?? 0;

  // Image stats store for real-time updates
  const updateStats = useImageStatsStore(state => state.updateStats);
  const getStats = useImageStatsStore(state => state.getStats);
  const liveStats = useImageStatsStore(state => image?._id ? state.imageStats.get(image._id) : undefined);
  const chartImage = useMemo(() => image ? {
    ...image, views, downloads,
    dailyViews: liveStats?.dailyViews ?? image.dailyViews,
    dailyDownloads: liveStats?.dailyDownloads ?? image.dailyDownloads,
  } : null, [image, views, downloads, liveStats]);

  // Download menu state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!showDownloadMenu) return;
    const positionMenu = () => {
      const menu = downloadMenuRef.current;
      const trigger = menu?.parentElement?.querySelector('button');
      if (!menu || !trigger) return;
      const rect = trigger.getBoundingClientRect();
      const below = Math.max(0, window.innerHeight - rect.bottom - 20);
      const above = Math.max(0, rect.top - 20);
      const openAbove = below < Math.min(menu.scrollHeight, 280) && above > below;
      menu.style.top = openAbove ? 'auto' : '100%';
      menu.style.bottom = openAbove ? 'calc(100% + 8px)' : 'auto';
      menu.style.maxHeight = `${openAbove ? above : below}px`;
    };
    positionMenu();
    downloadMenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    const observer = new ResizeObserver(positionMenu);
    const menu = downloadMenuRef.current;
    const trigger = menu?.parentElement?.querySelector('button');
    if (menu) observer.observe(menu);
    if (trigger) observer.observe(trigger);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [showDownloadMenu]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Collection modal state
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Author tooltip state
  const [showAuthorTooltip, setShowAuthorTooltip] = useState(false);
  const [tooltipAnimating, setTooltipAnimating] = useState(false);
  const [authorTooltipPosition, setAuthorTooltipPosition] = useState({ top: 12, left: 12, maxHeight: 300 });
  const authorTooltipRef = useRef<HTMLDivElement>(null);
  const [authorImages, setAuthorImages] = useState<Image[]>([]);
  const [loadingAuthorImages, setLoadingAuthorImages] = useState(false);

  // Related images - filter out current image
  const relatedImages = useMemo(() => {
    if (!image || images.length === 0) return [];
    return images.filter((img) => img._id !== image._id).slice(0, 20);
  }, [image, images]);

  useImagePageData({ imageId, attempt: imageAttempt, navigationState: locationWithState.state, initialLocationStateRef, setImage, setImages, setLoading, setError });

  // WebSocket for real-time updates
  const { isConnected, joinImageRoom, leaveImageRoom } = useWebSocket({
    onImageFavoriteUpdate: useCallback((update) => {
      if (!image?._id || update.imageId !== image._id) return;
      
      // Don't update if the change was made by the current user (optimistic update already handled)
      if (update.actorId === user?._id) return;

      // Update favorite count
      updateFavoriteCount(update.imageId, update.favoriteCount);
    }, [image, user, updateFavoriteCount]),
    onImageStatsUpdate: useCallback((update) => {
      if (!image?._id || update.imageId !== image._id) return;

      // Update stats in store
      updateStats(update.imageId, {
        views: update.views,
        downloads: update.downloads,
        dailyViews: update.dailyViews,
        dailyDownloads: update.dailyDownloads,
      });

      // Update local state for immediate UI update
      setViews(update.views);
      setDownloads(update.downloads);
      
      // Update API cache
      const stats = apiStatsCache.get(update.imageId) || {};
      stats.views = update.views;
      stats.downloads = update.downloads;
      apiStatsCache.set(update.imageId, stats);
    }, [image, updateStats]),
  });

  // Join/leave image room for real-time updates
  useEffect(() => {
    if (!image?._id || !isConnected) return;

    // Initialize favorite count from image data
    if (image.favoriteCount !== undefined) {
      updateFavoriteCount(image._id, image.favoriteCount);
    }

    // Initialize stats from image data
    updateStats(image._id, {
      views: image.views || 0,
      downloads: image.downloads || 0,
    });

    joinImageRoom(image._id);

    return () => {
      leaveImageRoom(image._id);
    };
  }, [image?._id, image?.favoriteCount, image?.views, image?.downloads, isConnected, joinImageRoom, leaveImageRoom, updateFavoriteCount, updateStats]);

  // Update stats when image changes
  useLayoutEffect(() => {
    if (!image?._id) return;

    const imageId = image._id;
    const isNewImage = currentImageIdRef.current !== imageId;

    if (isNewImage) {
      currentImageIdRef.current = imageId;
      incrementedViewIds.current.delete(imageId);
    }

    // Check store first, then API cache, then image data
    const storeStats = getStats(imageId);
    const apiStats = apiStatsCache.get(imageId);
    if (!storeStats) {
      updateStats(imageId, {
        views: apiStats?.views ?? image.views ?? 0,
        downloads: apiStats?.downloads ?? image.downloads ?? 0,
        dailyViews: image.dailyViews,
        dailyDownloads: image.dailyDownloads,
      });
    }
    
    if (storeStats) {
      // Use store stats (most up-to-date, includes real-time updates)
      setViews(storeStats.views);
      setDownloads(storeStats.downloads);
    } else if (apiStats) {
      if (apiStats.views !== undefined) {
        setViews(apiStats.views);
      } else if (isNewImage) {
        setViews(image.views || 0);
      }
      if (apiStats.downloads !== undefined) {
        setDownloads(apiStats.downloads);
      } else if (isNewImage) {
        setDownloads(image.downloads || 0);
      }
    } else if (isNewImage) {
      setViews(image.views || 0);
      setDownloads(image.downloads || 0);
    }
  }, [image?._id, image?.views, image?.downloads, image?.dailyViews, image?.dailyDownloads, getStats, updateStats]);

  // Increment view count when image is viewed
  useEffect(() => {
    if (!image?._id) return;

    let active = true;
    const imageId = image._id;
    if (!incrementedViewIds.current.has(imageId)) {
      incrementedViewIds.current.add(imageId);
      imageStatsService.incrementView(imageId)
        .then((response) => {
          if (active) setViews(response.views);
          const stats = apiStatsCache.get(imageId) || {};
          stats.views = response.views;
          apiStatsCache.set(imageId, stats);
          
          // Update stats store (optimistic update)
          updateStats(imageId, {
            views: response.views,
            dailyViews: response.dailyViews,
          });
        })
        .catch((error: any) => {
          if (error.response?.status === 429) {
            const rateLimitData = error.response.data;
            if (rateLimitData.views !== undefined) {
              if (active) setViews(rateLimitData.views);
              const stats = apiStatsCache.get(imageId) || {};
              stats.views = rateLimitData.views;
              apiStatsCache.set(imageId, stats);
            }
          } else {
            // Silently fail - view tracking is non-critical
            incrementedViewIds.current.delete(imageId);
          }
        });
    }
    return () => { active = false; };
  }, [image?._id, updateStats]);

  // Image loading logic now lives in ImagePagePhoto. Only reset scroll/menus here.
  useLayoutEffect(() => {
    if (loading || !image?._id) return;
    const scroller = scrollRef.current;
    const restoredTop = getImagePageScroll(locationWithState)?.contentY || 0;
    const previousOverflow = scroller?.style.overflow || '';
    let firstFrame = 0;
    let secondFrame = 0;
    isImageChangingRef.current = true;
    setIsImageChanging(true);
    setIsScrolled(showModalStyle ? restoredTop >= 16 : restoredTop > 0);
    setShouldAnimate(false);
    scrollPosRef.current = restoredTop;
    setShowDownloadMenu(false);
    setShowAuthorTooltip(false);
    setLoadingAuthorImages(false);
    setAuthorImages([]);
    setShowCollectionModal(false);
    setShowEditModal(false);
    clearAuthorTimers();
    if (scroller) {
      scroller.scrollTop = restoredTop;
      scroller.style.overflow = 'hidden';
    }
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (scroller) scroller.style.overflow = previousOverflow;
        isImageChangingRef.current = false;
        setIsImageChanging(false);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      if (scroller) scroller.style.overflow = previousOverflow;
      isImageChangingRef.current = false;
    };
  }, [loading, image?._id, locationWithState, clearAuthorTimers, showModalStyle]);
  useImagePageScrollRestore(locationWithState, scrollRef, !loading && Boolean(image), isBackgroundRoute, image?._id, images.length);
  useImageDialogFocus(imageDialogRef, showModalStyle && !loading && Boolean(image) && !isBackgroundRoute, showEditModal || showCollectionModal);
  // Measure the actual frame, including toolbar wrapping and viewport changes.
  useLayoutEffect(() => {
    if (loading || !image || !imageContainerRef.current) return;
    let frame = 0;
    const measure = () => {
      const container = imageContainerRef.current;
      if (!container) return;
      const width = container.clientWidth;
      const toolbarHeight = topInfoRef.current?.offsetHeight || 60;
      const headerHeight = showModalStyle ? 16 : (isMobile ? 96 : 66);
      const available = Math.max(80, window.innerHeight - toolbarHeight - headerHeight - 72);
      const proportional = image.width > 0 && image.height > 0
        ? width * image.height / image.width : available;
      const height = Math.round(Math.min(available, Math.max(80, proportional)));

      setDisplayHeight(previous => previous === height ? previous : height);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(imageContainerRef.current);
    if (topInfoRef.current) observer.observe(topInfoRef.current);
    window.addEventListener('resize', schedule);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [loading, image?._id, image?.width, image?.height, showModalStyle, isMobile]);
  // Locale and date formatting
  const locale = getLocale();
  const formattedDate = useFormattedDate(image?.createdAt, {
    locale: locale === 'vi' ? 'vi-VN' : 'en-US',
    format: 'long',
  });

  // Display tags - already translated to Vietnamese on backend (or translate if needed)
  const displayTags = useMemo(() => {
    if (!image?.tags || image.tags.length === 0) return [];
    
    // If English locale, check if we have English tags stored separately
    if (locale === 'en' && image.tagsEnglish && image.tagsEnglish.length > 0) {
      return image.tagsEnglish; // Use English tags if available
    }
    
    // If Vietnamese locale and tags are already in Vietnamese (from backend translation)
    // Just return them - no translation needed!
    if (locale === 'vi') {
      return image.tags; // Already in Vietnamese (automatically translated on backend)
    }
    
    // Fallback: translate using dictionary (for other languages or if translation failed)
    return translateTags(image.tags, locale);
  }, [image, locale]);

  // Author name
  const authorName = useMemo(() => {
    if (!image) return 'Author';
    return (image.uploadedBy as any)?.username ||
      (image.uploadedBy as any)?.displayName ||
      (image.uploadedBy as any)?.author ||
      'Author';
  }, [image]);

  // Handlers
  const handleClose = useCallback(() => {
    const background = validateModalState(locationWithState.state).background;
    clearModalActive();
    restoreScrollPosition();
    if (background?.pathname) {
      if (locationWithState.state?.returnToBackgroundInHistory) {
        navigate(-1);
        return;
      }
      if (background.pathname === locationWithState.pathname) {
        navigate(-1);
        return;
      }

      // Replace the modal entry so browser Back cannot reopen the closed photo.
      navigate(background.pathname + background.search + background.hash, {
        replace: true,
        state: background.state,
      });
      return;
    }

    navigate(-1);
  }, [navigate, locationWithState]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleImageSelect = useCallback((selectedImage: Image) => {
    const nextImages = images.some(item => item._id === selectedImage._id)
      ? images : [...images, selectedImage];
    const currentState = locationWithState.state || {};
    const isCurrentModal = validateModalState(currentState).isValid;
    if (!isCurrentModal) saveImagePageScroll(locationWithState, scrollRef.current);

    const background = getImageNavigationBackground(locationWithState);

    const navigationState = {
      ...currentState,
      background,
      inlineModal: true,
      returnToBackgroundInHistory: isCurrentModal
        ? currentState.returnToBackgroundInHistory : true,
      images: nextImages,
      image: selectedImage,
      fromGrid: false,
    };

    setModalActive();

    // Preserve a standalone photo's history entry; subsequent modal changes replace.
    navigate(`/photos/${generateImageSlug(selectedImage.imageTitle || '', selectedImage._id)}`, {
      replace: isCurrentModal,
      state: navigationState
    });
  }, [navigate, images, locationWithState]);

  const handleDownload = useCallback(async (size: 'small' | 'medium' | 'large' | 'original') => {
    if (!image?._id || downloadPendingRef.current) return;
    downloadPendingRef.current = true;
    setIsDownloading(true);
    setShowDownloadMenu(false);
    const session = captureImageActionSession();
    const isCurrentPhoto = () => pageActiveRef.current && currentImageIdRef.current === image._id;
    try {
      const response = await api.get('/images/' + image._id + '/download?size=' + size, {
        responseType: 'blob', withCredentials: true,
      });
      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: typeof contentType === 'string' ? contentType : 'image/webp' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers['content-disposition'];
      const serverName = typeof disposition === 'string' ? disposition.match(/filename="([^"\r\n]+)"|filename=([^;\r\n]+)/i) : null;
      const sanitizedTitle = (image.imageTitle || t('image.photo')).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const extension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
      link.href = blobUrl;
      link.download = (serverName?.[1] || serverName?.[2]?.trim() || sanitizedTitle + '.' + extension).replace(/[\\/]/g, '_');
      try {
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
      // Count only a completed transfer handed to the browser, in its original session.
      // Browser APIs cannot confirm whether the user ultimately saves the file.
      if (session.isCurrent()) {
        if (session.authenticated) {
          // The history store already listens to this event; do not add it twice.
          window.dispatchEvent(new CustomEvent('downloadCompleted', { detail: { image } }));
        }
        if (isCurrentPhoto()) toast.success(t('image.downloadSuccess'));
        try {
          const stats = await imageStatsService.incrementDownload(image._id);
          apiStatsCache.set(image._id, { ...apiStatsCache.get(image._id), downloads: stats.downloads });
          updateStats(image._id, { downloads: stats.downloads, dailyDownloads: stats.dailyDownloads });
          if (session.isCurrent() && isCurrentPhoto()) setDownloads(stats.downloads);
        } catch (error: unknown) {
          const limited = error as { response?: { status?: number; data?: { downloads?: number } } };
          const count = limited.response?.data?.downloads;
          if (limited.response?.status === 429 && count !== undefined) {
            apiStatsCache.set(image._id, { ...apiStatsCache.get(image._id), downloads: count });
            updateStats(image._id, { downloads: count });
            if (session.isCurrent() && isCurrentPhoto()) setDownloads(count);
          }
          // A statistics failure does not turn a delivered file into a failed download.
        }
      }
    } catch {
      if (session.isCurrent() && isCurrentPhoto()) toast.error(t('image.downloadFailed'));
    } finally {
      session.dispose();
      downloadPendingRef.current = false;
      if (pageActiveRef.current) setIsDownloading(false);
    }
  }, [image, updateStats]);

  const handleToggleFavorite = useCallback(async () => {
    if (!image?._id || favoritePendingRef.current) return;
    if (!user) {
      navigate('/signin');
      return;
    }
    // Lock before any await. Axios owns CSRF fetching and its specific CSRF retry.
    favoritePendingRef.current = true;
    setIsTogglingFavorite(true);
    const session = captureImageActionSession();
    const imageId = image._id;
    const previousState = isFavorited;
    const publish = (favorited: boolean) => {
      updateFavoriteCache(imageId, favorited);
      window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
        detail: { imageId, isFavorited: favorited, image: favorited ? image : undefined },
      }));
    };
    publish(!previousState);
    try {
      const response = await favoriteService.toggleFavorite(imageId);
      if (!session.isCurrent()) return;
      publish(response.isFavorited);
      if (response.favoriteCount !== undefined) updateFavoriteCount(imageId, response.favoriteCount);
      const { useFavoriteStore } = await import('@/stores/useFavoriteStore');
      if (!session.isCurrent()) return;
      const store = useFavoriteStore.getState();
      if (!store.pagination && store.images.length === 0) {
        void store.fetchFavorites(1, true).catch(() => {});
      }
      if (pageActiveRef.current && currentImageIdRef.current === imageId) {
        toast.success(t(response.isFavorited ? 'favorites.added' : 'favorites.removed'));
      }
    } catch {
      if (session.isCurrent()) {
        publish(previousState);
        if (pageActiveRef.current && currentImageIdRef.current === imageId) toast.error(t('favorites.updateFailed'));
      }
    } finally {
      session.dispose();
      favoritePendingRef.current = false;
      if (pageActiveRef.current) setIsTogglingFavorite(false);
    }
  }, [user, image, updateFavoriteCount, isFavorited, navigate]);

  const handleShare = useCallback(async () => {
    if (!image?._id || sharePendingRef.current) return;
    sharePendingRef.current = true;
    setIsSharing(true);
    const selectedId = image._id;
    const slug = generateImageSlug(image.imageTitle || t('image.untitled'), selectedId);
    try {
      const result = await sharePhotoLink({
        title: image.imageTitle || t('image.photo'),
        text: t('imagePage.shareText', { title: image.imageTitle || t('image.untitled') }),
        url: window.location.origin + '/photos/' + slug,
      });
      if (!pageActiveRef.current || currentImageIdRef.current !== selectedId) return;
      if (result === 'copied') toast.success(t('share.linkCopied'));
      if (result === 'failed') toast.error(t('share.linkCopyFailed'));
    } finally {
      sharePendingRef.current = false;
      if (pageActiveRef.current) setIsSharing(false);
    }
  }, [image]);

  const handleDownloadMenuKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % buttons.length;
    if (event.key === 'ArrowUp') nextIndex = (index - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = buttons.length - 1;
    if (nextIndex !== undefined && buttons.length) {
      event.preventDefault();
      event.stopPropagation();
      buttons[nextIndex]?.focus();
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      event.stopPropagation();
      setShowDownloadMenu(false);
      downloadButtonRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const handleViewProfile = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!image) return;
    const userId = (image.uploadedBy as any)?._id || image.uploadedBy;
    const username = (image.uploadedBy as any)?.username;
    clearModalActive();
    if (username) {
      navigate(`/@${username}`);
    } else if (userId) {
      navigate(`/profile/user/${userId}`);
    }
  }, [navigate, image]);

  // Lock body scroll when modal-style is shown
  useEffect(() => {
    if (showModalStyle && !isBackgroundRoute) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('image-modal-open');

      // Body overflow alone does not lock a background page's own scroll area.
      const preventBackgroundScroll = (event: WheelEvent | TouchEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (scrollRef.current?.contains(target)) return;
        // Nested dialogs own their scroll lock; their portalled content is allowed.
        if (target.closest('.edit-image-modal, [role="dialog"][aria-modal="true"]') &&
            !imageDialogRef.current?.contains(target)) return;
        // Preserve browser zoom and let nested dialogs handle their own gestures.
        if (event.type === 'wheel' && (event as WheelEvent).ctrlKey) return;
        event.preventDefault();
      };
      document.addEventListener('wheel', preventBackgroundScroll, { passive: false, capture: true });
      document.addEventListener('touchmove', preventBackgroundScroll, { passive: false, capture: true });
      return () => {
        document.removeEventListener('wheel', preventBackgroundScroll, true);
        document.removeEventListener('touchmove', preventBackgroundScroll, true);
        document.body.style.overflow = prev;
        document.body.classList.remove('image-modal-open');
      };
    }
    return undefined;
  }, [showModalStyle, isBackgroundRoute]);

  // Keyboard navigation
  useEffect(() => {
    if (isBackgroundRoute) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || showEditModal || showCollectionModal) return;
      if (showDownloadMenu) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowDownloadMenu(false);
          downloadButtonRef.current?.focus({ preventScroll: true });
        }
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      // Don't handle navigation if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      const nestedDialog = target.closest('[role="dialog"]');
      const isInputElement = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input, textarea, select, [contenteditable="true"]') ||
        (nestedDialog && nestedDialog !== imageDialogRef.current);

      if (isInputElement) {
        return; // Let the input handle the key event
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentImageIndex < images.length - 1) {
          const nextImage = images[currentImageIndex + 1];
          if (nextImage) {
            handleImageSelect(nextImage);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentImageIndex > 0) {
          const prevImage = images[currentImageIndex - 1];
          if (prevImage) {
            handleImageSelect(prevImage);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        void handleToggleFavorite();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBackgroundRoute, currentImageIndex, images, handleImageSelect, handleClose, handleToggleFavorite, showEditModal, showCollectionModal, showDownloadMenu]);

  // Handle related image hover - preload on hover for instant click
  // This is like PHOTOCLOUD: preload when user hovers, so click is instant
  // Preload AVIF URL (getRegularUrl already prefers AVIF)
  const handleRelatedImageHover = useCallback((relatedImage: Image) => {
    // Get AVIF URL (getRegularUrl prefers AVIF when supported)
    const regular = getRegularUrl(relatedImage);
    if (regular && !loadedImages.has(regular)) {
      // Preload with decode (skipDecode=false) to ensure it's ready
      // Don't await - just start loading in background
      preloadImage(regular, false).catch(() => {});
    }
    
  }, [getRegularUrl]);

  const cancelAuthorHide = useCallback(() => {
    clearAuthorTimers();
    setTooltipAnimating(true);
  }, [clearAuthorTimers]);

  const scheduleAuthorHide = useCallback(() => {
    clearAuthorTimers();
    authorHideTimeoutRef.current = setTimeout(() => {
      authorHideTimeoutRef.current = null;
      if (!pageActiveRef.current || authorAreaRef.current?.matches(':hover, :focus-within') || authorTooltipRef.current?.matches(':hover, :focus-within')) return;
      setTooltipAnimating(false);
      authorFadeTimeoutRef.current = setTimeout(() => {
        authorFadeTimeoutRef.current = null;
        if (pageActiveRef.current) setShowAuthorTooltip(false);
      }, 200);
    }, 150);
  }, [clearAuthorTimers]);

  const openAuthorPopup = (delay = 1000) => {
    if (!image) return;
    cancelAuthorHide();
    authorTooltipTimeoutRef.current = setTimeout(async () => {
      authorTooltipTimeoutRef.current = null;
      if (!pageActiveRef.current || currentImageIdRef.current !== image._id) return;
      setShowAuthorTooltip(true);
      const userId = (image.uploadedBy as any)?._id || image.uploadedBy;
      if (userId && !loadingAuthorImages) {
        setLoadingAuthorImages(true);
        try {
          const response = await imageFetchService.fetchUserImages(userId, { page: 1, limit: 3 });
          if (pageActiveRef.current && currentImageIdRef.current === image._id) setAuthorImages(response.images || []);
        } catch {
          // Silently fail - author images are optional
          if (pageActiveRef.current && currentImageIdRef.current === image._id) setAuthorImages([]);
        } finally {
          if (pageActiveRef.current && currentImageIdRef.current === image._id) setLoadingAuthorImages(false);
        }
      }
    }, delay);
  };

  useEffect(() => {
    if (!showAuthorTooltip) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !authorAreaRef.current?.contains(event.target)) {
        clearAuthorTimers();
        setShowAuthorTooltip(false);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [showAuthorTooltip, clearAuthorTimers]);

  // Keep the author popup inside the viewport after resize/scroll.
  useLayoutEffect(() => {
    if (!showAuthorTooltip) return;
    let frame = 0;
    const measure = () => {
      const anchor = authorAreaRef.current;
      const popup = authorTooltipRef.current;
      if (!anchor || !popup) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      const height = Math.min(popup.scrollHeight, window.innerHeight - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12));
      const next = { top, left, maxHeight: window.innerHeight - top - 12 };
      setAuthorTooltipPosition(previous => previous.top === next.top && previous.left === next.left && previous.maxHeight === next.maxHeight ? previous : next);
      setTooltipAnimating(true);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    if (authorTooltipRef.current) observer.observe(authorTooltipRef.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      cancelAnimationFrame(frame);
    };
  }, [showAuthorTooltip]);
  // Close download menu when clicking outside
  useEffect(() => {
    if (!showDownloadMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-download-menu]')) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu]);

  // Close collection modal when clicking outside
  useEffect(() => {
    if (!showCollectionModal) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-collection-menu]')) {
        setShowCollectionModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCollectionModal]);

  // Sync loading state to global loading store
  useEffect(() => {
    syncGlobalLoading('imagePage', loading);
    return () => {
      syncGlobalLoading('imagePage', false);
    };
  }, [loading]);

  return {
    loading, error, image, navigate,
    scrollRef, isImageChangingRef, scrollPosRef, showModalStyle,
    setShouldAnimate, setIsScrolled, scrollAnimationTimerRef, modalRef,
    topInfoRef, isImageChanging, handleClose, authorAreaRef,
    openAuthorPopup, scheduleAuthorHide, authorName, showAuthorTooltip,
    clearAuthorTimers, setShowAuthorTooltip, handleViewProfile, authorTooltipRef,
    tooltipAnimating, authorTooltipPosition, cancelAuthorHide, authorImages,
    handleImageSelect, handleToggleFavorite, isTogglingFavorite, isFavorited,
    favoriteCount, user, setShowCollectionModal, showCollectionModal,
    downloadButtonRef, setShowDownloadMenu, showDownloadMenu, isDownloading,
    downloadMenuRef, handleDownloadMenuKeyDown, handleDownload, imageContainerRef,
    displayHeight, getRegularUrl, getOriginalUrl, views,
    downloads, handleShare, isSharing, chartImage,
    setShowEditModal, formattedDate, displayTags, relatedImages,
    images, handleRelatedImageHover, imageDialogRef, handleOverlayClick,
    isScrolled, shouldAnimate, currentImageIndex, showEditModal,
    setImage, setImages, retryImage,
  };
}
