import { useImagePageActions } from './useImagePageActions';
import { useImagePageStats } from './useImagePageStats';
import { loadedImages,preloadImage } from '@/components/NoFlashGrid/utils/imagePreloader';
import { ActualLocationContext,BackgroundRouteContext,ImagePresentationContext } from '@/contexts/ActualLocationContext';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { useImageDialogFocus } from '@/hooks/useImageDialogFocus';
import { useImagePageScrollRestore } from '@/hooks/useImagePageScrollRestore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getLocale } from '@/i18n';
import { extractIdFromSlug,generateImageSlug } from '@/lib/utils';
import { imageFetchService } from '@/services/imageFetchService';
import { syncGlobalLoading } from '@/stores/helpers/syncGlobalLoading';
import { useUserStore } from '@/stores/useUserStore';
import type { Image } from '@/types/image';
import { detectAvifSupport } from '@/utils/avifSupport';
import { getImagePageScroll,saveImagePageScroll } from '@/utils/imagePageScroll';
import { getOriginalDisplayUrl,getRegularDisplayUrl } from '@/utils/imageUrlUtils';
import { clearModalActive,getImageNavigationBackground,restoreScrollPosition,setModalActive,validateModalState } from '@/utils/modalNavigation';
import { translateTags } from '@/utils/tagTranslations';
import { useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { useLocation,useNavigate,useParams } from 'react-router-dom';
import { useImagePageData } from './useImagePageData';

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

  const { views, downloads, chartImage, favoriteCount } = useImagePageStats(image, user?._id);

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

  useLayoutEffect(() => { currentImageIdRef.current = image?._id ?? null; }, [image?._id]);

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

  const closeDownloadMenu = useCallback(() => setShowDownloadMenu(false), []);
  const { handleDownload, handleToggleFavorite, handleShare, isTogglingFavorite, isFavorited, isDownloading, isSharing } =
    useImagePageActions({ image, pageActiveRef, currentImageIdRef, closeDownloadMenu });

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
