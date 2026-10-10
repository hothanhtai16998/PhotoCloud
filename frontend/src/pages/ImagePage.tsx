import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ActualLocationContext, BackgroundRouteContext } from '@/contexts/ActualLocationContext';
import { imageService } from '@/services/imageService';
import api from '@/lib/axios';
import { extractIdFromSlug, generateImageSlug } from '@/lib/utils';
import type { Image } from '@/types/image';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useImagePageScrollRestore } from '@/hooks/useImagePageScrollRestore';
import { saveImagePageScroll, getImagePageScroll } from '@/utils/imagePageScroll';
import { useUserStore } from '@/stores/useUserStore';
import { imageFetchService } from '@/services/imageFetchService';
import { imageStatsService } from '@/services/imageStatsService';
import { favoriteService } from '@/services/favoriteService';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useImageFavoriteCountStore } from '@/stores/useImageFavoriteCountStore';
import { useImageStatsStore } from '@/stores/useImageStatsStore';
import { useDownloadHistoryStore } from '@/stores/useDownloadHistoryStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { shareService } from '@/utils/shareService';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { t, getLocale } from '@/i18n';
import { translateTags } from '@/utils/tagTranslations';
import { toast } from 'sonner';
import { Heart, Share2, ChevronDown, MapPin, ExternalLink, Tag, Edit2, FolderPlus } from 'lucide-react';
import { ImageModalInfo } from '@/components/NoFlashGrid/components/ImageModalInfo';
import { preloadImage, loadedImages } from '@/components/NoFlashGrid/utils/imagePreloader';
import { ImagePagePhoto } from '@/components/ImagePagePhoto';
import { NoFlashGrid } from '@/components/NoFlashGrid';
import { syncGlobalLoading } from '@/stores/helpers/syncGlobalLoading';
import { validateModalState, clearModalActive, restoreScrollPosition, setModalActive, getImageNavigationBackground } from '@/utils/modalNavigation';
import { detectAvifSupport } from '@/utils/avifSupport';
import { getRegularDisplayUrl, getOriginalDisplayUrl } from '@/utils/imageUrlUtils';
import leftArrowIcon from '@/assets/left-arrow.svg';
import rightArrowIcon from '@/assets/right-arrow.svg';
import closeIcon from '@/assets/close.svg';
import cameraIcon from '@/assets/camera.svg';
import dateIcon from '@/assets/date.svg';
import './ImagePage.css';
// Import NoFlashGrid ImageModal CSS for 100% same UI
import '@/components/NoFlashGrid/components/ImageModal.css';
import '@/components/NoFlashGrid/components/modal-info.css';
import '@/components/NoFlashGrid/components/modal-footer.css';

// Import modals
import EditImageModal from '@/components/EditImageModal';
import CollectionModal from '@/components/collection/CollectionModal';

// Module-level cache to persist API stats across component unmounts
const apiStatsCache = new Map<string, { views?: number; downloads?: number }>();

function ImagePage() {
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
  const [image, setImage] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportsAvif, setSupportsAvif] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (window as any).avifSupport ?? false;
  });

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const scrollAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isImageChangingRef = useRef(false);
  const topInfoRef = useRef<HTMLDivElement>(null);
  const authorAreaRef = useRef<HTMLDivElement>(null);

  const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Validate modal state using unified utility
  // Use locationWithState (actual location) not background location
  const modalValidation = useMemo(() => {
    return validateModalState(locationWithState.state);
  }, [locationWithState.state]);

  // Modal-style logic: show modal-style when validated modal state exists
  // - On mobile → always regular page
  // - Valid modal state → modal-style
  // Relies on modalValidation.isModal which correctly handles refresh scenarios
  // by checking if the flag exists (flag is cleared on refresh by App.tsx)
  const showModalStyle = useMemo(() => {
    // Mobile: always regular page
    if (isMobile || !slug) {
      return false;
    }

    // Use validated modal state
    // modalValidation.isModal will be false on refresh because flag is cleared
    return modalValidation.isModal;
  }, [slug, isMobile, modalValidation.isModal]);

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
      if (authorTooltipTimeoutRef.current) clearTimeout(authorTooltipTimeoutRef.current);

    };
  }, []);

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


  // Fetch image
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (!imageId || !/^(?:[a-f\d]{12}|[a-f\d]{24})$/i.test(imageId)) {
      setError('Invalid image slug');
      setLoading(false);
      return;
    }
    const matchesId = (id: string) => (imageId.length === 24 ? id : id.slice(-12)).toLowerCase() === imageId.toLowerCase();

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);

        const initialState = initialLocationStateRef.current as
          | { images?: Image[]; image?: Image; fromGrid?: boolean }
          | undefined;

        // 1) Fast path: if a single image was passed in state, use it directly.
        const passedImage = initialState?.image;
        if (passedImage && passedImage._id) {
          if (matchesId(passedImage._id)) {
            const passedImages = Array.isArray(initialState?.images)
              ? (initialState!.images as Image[])
              : [passedImage];

            setImage(passedImage);
            setImages(passedImages);

            
            setLoading(false);
            return;
          }
        }

        // 2) Next: try passed images array (existing behavior)
        const passedImages = initialState?.images as Image[] | undefined;
        if (passedImages && passedImages.length > 0) {
          const foundImage = passedImages.find((img) => {
            return matchesId(img._id);
          });

          if (foundImage) {
            setImage(foundImage);
            setImages(passedImages);

            
            setLoading(false);
            return;
          }
        }

        // 3) Fallback: fetch from API (direct URL / refresh)
        const foundImage = await imageService.fetchImageById(imageId, controller.signal);
        if (!active) return;
        setImage(foundImage);
        setImages([foundImage]);
        setLoading(false);
        // Related photos are optional and must never block the selected photo.
        void imageService.fetchImages({ limit: 50 }, controller.signal).then(response => {
          if (!active) return;
          setImages([foundImage, ...response.images.filter(item => item._id !== foundImage._id)]);
        }).catch(() => { /* Keep the selected image usable if recommendations fail. */ });
      } catch (err: unknown) {
        if (!active) return;
        // Error handled by error boundary
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to load image');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchImage();
    return () => {
      active = false;
      controller.abort();
    };
  }, [imageId, locationWithState.state]);

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
    setIsScrolled(restoredTop > 0);
    setShouldAnimate(false);
    scrollPosRef.current = restoredTop;
    setShowDownloadMenu(false);
    setShowAuthorTooltip(false);
    setLoadingAuthorImages(false);
    setAuthorImages([]);
    setShowCollectionModal(false);
    setShowEditModal(false);
    if (authorTooltipTimeoutRef.current) {
      clearTimeout(authorTooltipTimeoutRef.current);
      authorTooltipTimeoutRef.current = null;
    }
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
  }, [loading, image?._id, locationWithState]);
  useImagePageScrollRestore(locationWithState, scrollRef, !loading && Boolean(image), isBackgroundRoute, image?._id, images.length);
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
    if (!image?._id) return;
    
    // Start download immediately (don't wait for increment API call)
    // Download image with selected size
    const downloadPromise = api.get(`/images/${image._id}/download?size=${size}`, {
      responseType: 'blob',
      withCredentials: true,
    });
    
    // Increment download count in background (fire and forget - don't block download)
    imageStatsService.incrementDownload(image._id)
      .then((statsResponse) => {
        if (pageActiveRef.current && currentImageIdRef.current === image._id) setDownloads(statsResponse.downloads);
        const stats = apiStatsCache.get(image._id) || {};
        stats.downloads = statsResponse.downloads;
        apiStatsCache.set(image._id, stats);
        
        // Update stats store
        updateStats(image._id, {
          downloads: statsResponse.downloads,
          dailyDownloads: statsResponse.dailyDownloads,
        });
      })
      .catch((error: any) => {
        if (error.response?.status === 429) {
          const rateLimitData = error.response.data;
          if (rateLimitData.downloads !== undefined) {
            if (pageActiveRef.current && currentImageIdRef.current === image._id) setDownloads(rateLimitData.downloads);
            const stats = apiStatsCache.get(image._id) || {};
            stats.downloads = rateLimitData.downloads;
            apiStatsCache.set(image._id, stats);
            
            // Update stats store
            updateStats(image._id, {
              downloads: rateLimitData.downloads,
            });
          }
        } else {
          // Silently fail - download already started, don't interrupt user
          if (import.meta.env.DEV) {
            // Silently fail - download already started
          }
        }
      });

    try {
      const response = await downloadPromise;

      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: typeof contentType === 'string' ? contentType : 'image/webp' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `${t('image.photo')}.webp`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      } else {
        const sanitizedTitle = (image.imageTitle || t('image.photo')).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        fileName = `${sanitizedTitle}.${urlExtension}`;
      }
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      // Optimistic update: Add to download history immediately (if authenticated)
      try {
        const { accessToken } = useAuthStore.getState();
        const { addDownloadToHistory } = useDownloadHistoryStore.getState();
        if (accessToken && image) {
          addDownloadToHistory(image);
          
          // Dispatch event for global download history update
          window.dispatchEvent(new CustomEvent('downloadCompleted', {
            detail: { image }
          }));
        }
      } catch {
        // Silently fail - download still succeeded
        // Silently fail - download already completed
      }

      toast.success(t('image.downloadSuccess'));
      setShowDownloadMenu(false);
    } catch {
      // Error handled by toast
      toast.error(t('image.downloadFailed'));
    }
  }, [image, updateStats]);

  // Helper to ensure CSRF token is ready
  const ensureCsrfToken = useCallback(async (): Promise<boolean> => {
    const getCsrfTokenFromCookie = (): string | null => {
      if (typeof document === 'undefined') return null;
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN' && value) {
          return decodeURIComponent(value);
        }
      }
      return null;
    };

    // Check if token already exists
    if (getCsrfTokenFromCookie()) {
      return true;
    }

    // Fetch CSRF token if missing
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
      const url = baseURL.startsWith('http') 
        ? `${baseURL}/csrf-token`
        : `${window.location.origin}${baseURL}/csrf-token`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        return !!(data.csrfToken || getCsrfTokenFromCookie());
      }
    } catch {
      // Will retry in API call
    }
    return false;
  }, []);

  const handleToggleFavorite = useCallback(async () => {
    if (!image?._id || isTogglingFavorite) return;

    // If user is not logged in, redirect to sign-in page
    if (!user) {
      navigate('/signin');
      return;
    }
    
    // Ensure CSRF token is ready before making request (critical for new sessions)
    await ensureCsrfToken();
    
    // Optimistic update: Update UI immediately before API call
    const imageId = String(image._id);
    const previousState = isFavorited;
    const newState = !previousState;
    
    // Update cache and UI immediately (like Unsplash)
    updateFavoriteCache(imageId, newState);
    setIsTogglingFavorite(true);
    
    // Don't do optimistic count update - wait for server response
    // This prevents incorrect counts when we don't have a reliable baseline
    // The server response will update the count correctly
    
    // Dispatch event immediately for instant UI updates
    window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
      detail: { 
        imageId: imageId.trim(),
        isFavorited: newState,
        image: newState ? image : undefined
      }
    }));

    // Make API call in background (non-blocking)
    // Retry once if CSRF error occurs
    let retryCount = 0;
    const makeRequest = async (): Promise<void> => {
      try {
        const response = await favoriteService.toggleFavorite(imageId);
        
        // Update with actual server response
        updateFavoriteCache(imageId, response.isFavorited);
        
        // Update favorite count with actual value from server
        if (response.favoriteCount !== undefined) {
          updateFavoriteCount(imageId, response.favoriteCount);
        }
        
        // If favorites store is empty (new session), fetch actual total to update sidebar badge
        const { useFavoriteStore } = await import('@/stores/useFavoriteStore');
        const favoriteStore = useFavoriteStore.getState();
        if (!favoriteStore.pagination && favoriteStore.images.length === 0) {
          // Store is empty - fetch actual favorites to get correct total
          favoriteStore.fetchFavorites(1, true).catch(() => {
            // Silently fail - will be corrected when user visits favorites page
          });
        }
        
        // Dispatch event with actual server state
        window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
          detail: { 
            imageId: imageId.trim(),
            isFavorited: response.isFavorited,
            image: response.isFavorited ? image : undefined
          }
        }));
        
        if (response.isFavorited) {
          toast.success(t('favorites.added'));
        } else {
          toast.success(t('favorites.removed'));
        }
      } catch (error: any) {
        // If CSRF error and we haven't retried, fetch token and retry once
        if (error?.response?.status === 403 && retryCount === 0) {
          retryCount++;
          await ensureCsrfToken();
          return makeRequest(); // Retry once
        }
        
        // Revert optimistic update on error
        updateFavoriteCache(imageId, previousState);
        
        // No need to revert count - we didn't do optimistic update
        
        // Dispatch event to revert UI
        window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
          detail: { 
            imageId: imageId.trim(),
            isFavorited: previousState,
            image: previousState ? image : undefined
          }
        }));
        
        // Error handled by toast
        toast.error(t('favorites.updateFailed'));
      }
    };

    makeRequest()
      .finally(() => {
        setIsTogglingFavorite(false);
      });
  }, [user, image, isTogglingFavorite, updateFavoriteCount, isFavorited, ensureCsrfToken, navigate]);

  const handleShare = useCallback(() => {
    if (!image?._id) return;
    const slug = generateImageSlug(image.imageTitle || t('image.untitled'), image._id);
    const shareUrl = `${window.location.origin}/photos/${slug}`;
    if (navigator.share) {
      navigator.share({
        title: image.imageTitle || t('image.photo'),
        text: t('imagePage.shareText', { title: image.imageTitle || t('image.untitled') }),
        url: shareUrl,
      }).catch(() => { });
    } else {
      shareService.copyToClipboard(shareUrl).then((success) => {
        if (success) {
          toast.success(t('share.linkCopied'));
        } else {
          toast.error(t('share.linkCopyFailed'));
        }
      });
    }
  }, [image]);

  const handleViewProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!image) return;
    const userId = (image.uploadedBy as any)?._id || image.uploadedBy;
    const username = (image.uploadedBy as any)?.username;
    if (username) {
      navigate(`/@${username}`);
      handleClose();
    } else if (userId) {
      navigate(`/profile/user/${userId}`);
      handleClose();
    }
  }, [navigate, image, handleClose]);

  // Lock body scroll when modal-style is shown
  useEffect(() => {
    if (showModalStyle) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('image-modal-open');
      return () => {
        document.body.style.overflow = prev;
        document.body.classList.remove('image-modal-open');
      };
    }
    return undefined;
  }, [showModalStyle]);

  // Keyboard navigation
  useEffect(() => {
    if (isBackgroundRoute) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || showEditModal || showCollectionModal) return;
      // Don't handle navigation if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]');

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBackgroundRoute, currentImageIndex, images, handleImageSelect, handleClose, showEditModal, showCollectionModal]);

  // Handle related image hover - preload on hover for instant click
  // This is like Unsplash: preload when user hovers, so click is instant
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

  // Loading state - check AFTER all hooks are called
  // GlobalLoadingOverlay handles the spinner, so we return null to prevent duplicate
  if (loading) {
    return (
      <>
        <div className="image-page">
          {/* GlobalLoadingOverlay handles the spinner */}
        </div>
      </>
    );
  }

  // Error state - check AFTER all hooks are called
  if (error || !image) {
    return (
      <>
        <div className="image-page-error">
          <p>{error || t('imagePage.notFound')}</p>
          <button onClick={() => navigate('/')}>{t('imagePage.backToHome')}</button>
        </div>
      </>
    );
  }

  // Shared content - extracted to avoid duplication
  const modalContent = (
    <div
      ref={scrollRef}
      className="image-modal-scroll-area"
      onScroll={(e) => {
        // Skip scroll handling during image change to prevent race conditions
        if (isImageChangingRef.current) {
          return;
        }
        
        const top = (e.currentTarget as HTMLDivElement).scrollTop;
        const prevTop = scrollPosRef.current;
        const wasScrolled = prevTop > 0;
        scrollPosRef.current = top;

        // Check if scrolled past the initial spacer (16px)
        const nowScrolled = top > 0;

        // Only update state if it actually changed
        if (nowScrolled !== wasScrolled) {
          setShouldAnimate(true);
          setIsScrolled(nowScrolled);

          if (scrollAnimationTimerRef.current) clearTimeout(scrollAnimationTimerRef.current);
          scrollAnimationTimerRef.current = setTimeout(() => {
            setShouldAnimate(false);
          }, 150);
        } else {
          setIsScrolled(nowScrolled);
        }
      }}
    >
      {/* Top info - Sticky: starts with space, sticks to viewport top when scrolling */}
      <div 
        ref={topInfoRef} 
        className={`image-modal-top-info ${isImageChanging ? 'no-transition' : ''}`}
        style={isImageChanging ? { transition: 'none' } : undefined}
      >
        <div
          ref={authorAreaRef}
          className="image-modal-author-area"
          onMouseEnter={() => {
            if ((authorAreaRef.current as any)?.hideTimeout) {
              clearTimeout((authorAreaRef.current as any).hideTimeout);
              (authorAreaRef.current as any).hideTimeout = null;
            }
            if (authorTooltipTimeoutRef.current) {
              clearTimeout(authorTooltipTimeoutRef.current);
            }
            authorTooltipTimeoutRef.current = setTimeout(async () => {
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
            }, 1000);
          }}
          onMouseLeave={(e) => {
            const hideTimeout = setTimeout(() => {
              const tooltipElement = document.querySelector('[data-author-tooltip]') as HTMLElement;
              if (!tooltipElement) {
                setShowAuthorTooltip(false);
                return;
              }
              const tooltipRect = tooltipElement.getBoundingClientRect();
              const mouseX = (e as any).clientX || 0;
              const mouseY = (e as any).clientY || 0;
              const isOverTooltip = (
                mouseX >= tooltipRect.left - 10 &&
                mouseX <= tooltipRect.right + 10 &&
                mouseY >= tooltipRect.top - 10 &&
                mouseY <= tooltipRect.bottom + 10
              );
              if (!isOverTooltip) {
                setTooltipAnimating(false);
                setTimeout(() => {
                  setShowAuthorTooltip(false);
                }, 200);
              }
              if (authorTooltipTimeoutRef.current) {
                clearTimeout(authorTooltipTimeoutRef.current);
                authorTooltipTimeoutRef.current = null;
              }
            }, 150);
            (authorAreaRef.current as any).hideTimeout = hideTimeout;
          }}
          onClick={handleViewProfile}
          style={{ cursor: 'pointer' }}
        >
          <div className="image-modal-author-avatar">
            {authorName ? authorName[0]?.toUpperCase() : 'A'}
          </div>
          <div>
            <div className="image-modal-author-name">{authorName}</div>
            <div className="image-modal-author-title">{image.imageTitle || t('imagePage.topInfo')}</div>
          </div>

          {/* Author tooltip/popup */}
          {showAuthorTooltip && (
              <div
                ref={authorTooltipRef}
                data-author-tooltip
                className={`image-modal-author-tooltip ${tooltipAnimating ? 'animating' : ''}`}
                style={authorTooltipPosition}
                onMouseEnter={() => {
                  if (authorAreaRef.current && (authorAreaRef.current as any).hideTimeout) {
                    clearTimeout((authorAreaRef.current as any).hideTimeout);
                    (authorAreaRef.current as any).hideTimeout = null;
                  }
                }}
                onMouseLeave={(e) => {
                  const hideTimeout = setTimeout(() => {
                    if (!authorAreaRef.current?.matches(':hover')) {
                      setTooltipAnimating(false);
                      setTimeout(() => {
                        setShowAuthorTooltip(false);
                      }, 200);
                    }
                  }, 150);
                  (e.currentTarget as any).hideTimeout = hideTimeout;
                }}
              >
                <div className="image-modal-author-tooltip-header">
                  <div className="image-modal-author-tooltip-avatar">
                    {authorName ? authorName[0]?.toUpperCase() : 'A'}
                  </div>
                  <div>
                    <div className="image-modal-author-tooltip-name">
                      {authorName}
                    </div>
                    <div className="image-modal-author-tooltip-bio">
                      {(image.uploadedBy as any)?.bio || t('image.photographer')}
                    </div>
                  </div>
                </div>
                <div className="image-modal-author-tooltip-location">
                  {(image.uploadedBy as any)?.location || t('imagePage.noLocation')}
                </div>
                {authorImages.length > 0 && (
                  <div className="image-modal-author-images-section">
                    <div className="image-modal-author-images-grid">
                      {authorImages.slice(0, 3).map((authorImg, idx) => (
                        <div
                          key={authorImg._id || idx}
                          className="image-modal-author-image-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageSelect(authorImg);
                          }}
                        >
                          {authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl ? (
                            <img
                              src={authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl}
                              alt={authorImg.imageTitle || t('image.photo')}
                              className="image-modal-author-image"
                            />
                          ) : (
                            <div className="image-modal-author-image-placeholder">
                              {t('image.noImage')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(e as any);
                    setShowAuthorTooltip(false);
                  }}
                  className="image-modal-view-profile-button"
                >
                  {t('image.viewProfile')}
                </button>
              </div>
          )}
        </div>
        <div className="image-modal-actions">
          {/* Save/Favorite button */}
          <button
            onClick={handleToggleFavorite}
            disabled={isTogglingFavorite}
            className="image-modal-favorite-button"
          >
            <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
            <span>{t('image.save')}</span>
            {favoriteCount > 0 && (
              <span className="image-modal-favorite-count">{favoriteCount.toLocaleString()}</span>
            )}
            <kbd className="image-modal-kbd">F</kbd>
          </button>

          {/* Add to Collection button with dropdown */}
          <div className="image-modal-collection-menu-wrapper" data-collection-menu>
            <button
              onClick={() => {
                // If user is not logged in, redirect to sign-in page
                if (!user) {
                  navigate('/signin');
                  return;
                }
                setShowCollectionModal(!showCollectionModal);
              }}
              className="image-modal-favorite-button"
              aria-label={t('image.addToCollection')}
              title={t('image.addToCollection')}
            >
              <FolderPlus size={16} />
              <span>{t('image.collection')}</span>
            </button>
            {showCollectionModal && image && (
              <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                imageId={image._id}
                onCollectionUpdate={() => {
                  // Optionally refresh data or show success message
                }}
              />
            )}
          </div>

          {/* Download button with dropdown */}
          <div className="image-modal-download-menu-wrapper" data-download-menu>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="image-modal-download-button"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              }}
            >
              <span>{t('image.download')}</span>
              <ChevronDown size={16} />
            </button>
            {showDownloadMenu && (
              <div
                className="image-modal-download-menu"
                onClick={(e) => e.stopPropagation()}
              >
                {[
                  { value: 'small' as const, label: t('image.small'), dimension: '640px' },
                  { value: 'medium' as const, label: t('image.medium'), dimension: '1920px' },
                  { value: 'large' as const, label: t('image.large'), dimension: '2400px' },
                  { value: 'original' as const, label: t('image.original'), dimension: t('imagePage.fullSize') },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleDownload(option.value);
                      setShowDownloadMenu(false);
                    }}
                    className="image-modal-download-menu-item"
                  >
                    <div>
                      <div className="image-modal-download-option-label">{option.label}</div>
                      <div className="image-modal-download-option-dimension">{option.dimension}</div>
                    </div>
                    {option.value === 'medium' && (
                      <span className="image-modal-download-option-default">{t('imagePage.default')}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle image with gutters */}
      <div className="image-modal-middle-container">
        <div className="image-modal-image-wrapper">
          <div
            ref={imageContainerRef}
            className={`image-modal-image-container ${image.width && image.height ? 'has-aspect-ratio' : 'no-aspect-ratio'}`}
            style={{
              height: displayHeight,
              minHeight: displayHeight,
              maxHeight: displayHeight,
              // Unsplash-style: background color with dominant color
              backgroundColor: (image as any).dominantColor || '#f3f4f6',
              overflow: 'hidden',
            }}
          >
            <ImagePagePhoto
              key={`${image._id}:${getRegularUrl(image)}:${getOriginalUrl(image)}`}
              src={getRegularUrl(image)}
              fallback={getOriginalUrl(image)}
              preview={image.base64Thumbnail || image.thumbnailUrl || image.smallUrl}
              alt={image.imageTitle || t('image.photo')}
            />
          </div>
        </div>
      </div>

      {/* Bottom info (scrolls with content) */}
      <div className="image-modal-bottom-info">
        <div className="image-modal-bottom-info-row">
          {/* Left: image info */}
          <div className="image-modal-image-info">
            {/* Views and Downloads Stats with Share/Info buttons */}
            <div className="image-modal-stats-row">
              <div className="image-modal-stats-header">
                <div className="image-modal-stat-item">
                  <div className="image-modal-stat-label">Views</div>
                  <div className="image-modal-stat-value">{views.toLocaleString()}</div>
                </div>
                <div className="image-modal-stat-item">
                  <div className="image-modal-stat-label">Downloads</div>
                  <div className="image-modal-stat-value">{downloads.toLocaleString()}</div>
                </div>
              </div>

              {/* Right: Share and Info buttons */}
              <div className="image-modal-actions-container">
                <button
                  onClick={handleShare}
                  className="image-modal-share-button"
                >
                  <Share2 size={16} />
                  <span>{t('share.share')}</span>
                </button>
                <ImageModalInfo image={chartImage || image} />
                {/* Edit button - only show if user is owner or admin */}
                {user && image && (
                  (user._id === (image.uploadedBy as any)?._id ||
                    (user as any)?.isAdmin ||
                    (user as any)?.isSuperAdmin) && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="image-modal-share-button"
                      aria-label="Edit image"
                      title="Edit image"
                    >
                      <Edit2 size={16} />
                      <span>Edit</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {image.imageTitle && (
              <div className="image-modal-image-title">
                {image.imageTitle}
              </div>
            )}

            {/* Location and Camera Info */}
            {(image.location || image.cameraModel) && (
              <div className="image-modal-image-details">
                {image.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    {image.coordinates ? (
                      <a
                        href={`https://www.google.com/maps?q=${image.coordinates.latitude},${image.coordinates.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'inherit',
                          textDecoration: 'none',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        {image.location}
                        <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
                      </a>
                    ) : (
                      <span>{image.location}</span>
                    )}
                  </span>
                )}
                {image.location && image.cameraModel && <span> • </span>}
                {image.cameraModel && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={cameraIcon} alt="Camera" style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                    {image.cameraModel}
                  </span>
                )}
              </div>
            )}

            {/* Camera EXIF Info */}
            {(image.focalLength || image.aperture || image.shutterSpeed || image.iso) && (
              <div className="image-modal-image-exif">
                {image.focalLength && <span>{image.focalLength}mm</span>}
                {image.focalLength && image.aperture && <span> • </span>}
                {image.aperture && <span>f/{image.aperture}</span>}
                {image.aperture && image.shutterSpeed && <span> • </span>}
                {image.shutterSpeed && <span>{image.shutterSpeed}</span>}
                {image.shutterSpeed && image.iso && <span> • </span>}
                {image.iso && <span>ISO {image.iso}</span>}
              </div>
            )}

            {/* Date */}
            {formattedDate && (
              <div className="image-modal-image-date">
                <img src={dateIcon} alt="Date" style={{ width: '14px', height: '14px', flexShrink: 0, marginRight: '6px' }} />
                {formattedDate}
              </div>
            )}

            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="image-modal-image-tags">
                {displayTags.map((tag, idx) => (
                  <span key={idx} className="image-modal-image-tag">
                    <Tag size={14} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {image.description && (
              <div className="image-modal-image-description">
                {image.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related images section */}
      {relatedImages.length > 0 && (
        <div className="image-modal-related-section" style={{ padding: '32px 16px', background: '#fff', position: 'relative' }}>
          {/* REMOVED: Loading indicator - navigation is now immediate (like Unsplash) */}
          {/* Image is already preloaded on hover, so no loading indicator needed */}
          <div style={{ maxWidth: '1296px', margin: '0 auto', width: '100%' }}>
            <h2 className="image-modal-related-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#111' }}>
              {t('image.relatedImages')}
            </h2>
            <NoFlashGrid
              images={relatedImages}
              loading={false}
              onImageClick={handleImageSelect}
              onImageHover={handleRelatedImageHover}
            />
          </div>
        </div>
      )}

    </div>
  );

  return (
    <>
      {/* Progress bar at top of viewport */}

      {showModalStyle ? (
        // Modal-style: Overlay with container inside (like NoFlashGrid ImageModal)
        <div
          onClick={handleOverlayClick}
          className="image-modal-overlay image-page-modal"
        >
          <div
            ref={modalRef}
            className={`image-modal-container ${isScrolled ? 'scrolled' : ''} ${shouldAnimate ? 'animate' : ''} ${isImageChanging ? 'image-changing' : ''}`}
          >
            {modalContent}
          </div>
        </div>
       ) : (
         // Regular page: Wrapper (sidebar is now rendered globally in App.tsx)
         <div className="image-page">
           <div
            ref={modalRef}
            className={`image-modal-container ${isScrolled ? 'scrolled' : ''} ${shouldAnimate ? 'animate' : ''} ${isImageChanging ? 'image-changing' : ''}`}
          >
            {modalContent}
          </div>
        </div>
      )}

      {/* Close button - only in modal-style */}
      {showModalStyle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="image-modal-close-button image-page-close"
        >
          <img
            src={closeIcon}
            alt="Close"
            className="image-modal-close-icon"
          />
        </button>
      )}

      {/* Left navigation button - only in modal-style */}
      {showModalStyle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentImageIndex > 0) {
              const prevImage = images[currentImageIndex - 1];
              if (prevImage) {
                handleImageSelect(prevImage);
              }
            }
          }}
          disabled={currentImageIndex === 0}
          className="image-modal-nav-button left"
        >
          <img
            src={leftArrowIcon}
            alt={t('common.previous')}
            className="image-modal-nav-icon"
          />
        </button>
      )}

      {/* Right navigation button - only in modal-style */}
      {showModalStyle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentImageIndex < images.length - 1) {
              const nextImage = images[currentImageIndex + 1];
              if (nextImage) {
                handleImageSelect(nextImage);
              }
            }
          }}
          disabled={currentImageIndex === images.length - 1}
          className="image-modal-nav-button right"
        >
          <img
            src={rightArrowIcon}
            alt={t('common.next')}
            className="image-modal-nav-icon"
          />
        </button>
      )}

      {/* Edit Image Modal */}
      {image && (
        <EditImageModal
          image={image}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedImage) => {
            setImage(updatedImage);
            setShowEditModal(false);
            // Update in images array if it exists there
            setImages(prev => prev.map(img =>
              img._id === updatedImage._id ? updatedImage : img
            ));
          }}
        />
      )}

    </>
  );
}

export default ImagePage;
