import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import { imageService } from '@/services/imageService';
import api from '@/lib/axios';
import { extractIdFromSlug, generateImageSlug } from '@/lib/utils';
import type { Image } from '@/types/image';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUserStore } from '@/stores/useUserStore';
import { useScrollLock } from '@/hooks/useScrollLock';
import { imageFetchService } from '@/services/imageFetchService';
import { imageStatsService } from '@/services/imageStatsService';
import { favoriteService } from '@/services/favoriteService';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import { shareService } from '@/utils/shareService';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { t, getLocale } from '@/i18n';
import { toast } from 'sonner';
import { Heart, Share2, ChevronDown, MapPin, ExternalLink, Tag, Edit2 } from 'lucide-react';
import { ImageModalInfo } from '@/components/image/ImageModalInfo';
import { BlurUpImage } from '@/components/NoFlashGrid/components/BlurUpImage';
import { GRID_CONFIG } from '@/components/NoFlashGrid/constants/gridConfig';
import { calculateImageLayout, getColumnCount } from '@/components/NoFlashGrid/utils/gridLayout';
import { loadImageDimensions } from '@/components/NoFlashGrid/utils/imageDimensions';
import { preloadImage, preloadImageWithProgress, loadedImages } from '@/components/NoFlashGrid/utils/imagePreloader';
import { ImageProgressBar } from '@/components/NoFlashGrid/components/ImageProgressBar';
import { INLINE_MODAL_FLAG_KEY } from '@/constants/modalKeys';
import leftArrowIcon from '@/assets/left-arrow.svg';
import rightArrowIcon from '@/assets/right-arrow.svg';
import closeIcon from '@/assets/close.svg';
import cameraIcon from '@/assets/camera.svg';
import dateIcon from '@/assets/date.svg';
import './ImagePage.css';
// Import NoFlashGrid ImageModal CSS for 100% same UI
import '@/components/NoFlashGrid/components/ImageModal.css';
import '@/components/image/modal-info.css';
import '@/components/image/modal-footer.css';
import ImagePageSidebar from '@/components/ImagePageSidebar';

// Import modals
import EditImageModal from '@/components/EditImageModal';
import CollectionModal from '@/components/CollectionModal';

// Module-level cache to persist API stats across component unmounts
const apiStatsCache = new Map<string, { views?: number; downloads?: number }>();

type ExtendedImage = Image & { categoryName?: string; category?: string };

function ImagePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();

  // Core state
  const [image, setImage] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());

  // Refs
  const processedImages = useRef<Set<string>>(new Set());
  const currentImageIds = useRef<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const relatedSectionRef = useRef<HTMLDivElement>(null);
  const topInfoRef = useRef<HTMLDivElement>(null);
  const authorAreaRef = useRef<HTMLDivElement>(null);
  const relatedGridRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);
  const previousImgRef = useRef<Image | null>(null);
  const frontImageLoadedRef = useRef<boolean>(false);
  const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);
  // Track container height to maintain it during transitions
  const containerHeightRef = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

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

  // Track if this is the initial mount (to detect refresh)
  const isInitialMountRef = useRef(true);
  const hasNavigatedRef = useRef(false);

  // Detect if this is a refresh vs navigation
  // On refresh, location.state should be null, but we also check navigation performance API
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;

      // Check if this is a refresh by looking at navigation type
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const isRefresh = navEntry?.type === 'reload';

      // Also check if location.state is null (React Router always null on refresh)
      const isStateNull = location.state == null;

      // If it's a refresh OR state is null, clear flags and ensure regular page
      if (isRefresh || isStateNull) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
          // If state exists but we're on refresh, clear it from history
          if (location.state != null) {
            // Clear state from browser history to prevent it from being read
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
          }
        }
        // On refresh, don't mark as navigated - stay as regular page
        hasNavigatedRef.current = false;
      } else {
        // This is a navigation (not refresh), mark it
        hasNavigatedRef.current = true;
      }
    } else {
      // Subsequent renders are navigations (slug changed = navigation)
      hasNavigatedRef.current = true;
    }
  }, [location.state, slug]);

  // Modal-style logic: show modal-style when location.state indicates modal navigation
  // - location.state is null on refresh/direct access → regular page
  // - location.state exists with inlineModal/background/fromGrid → modal-style
  // - When navigating from ImagePage to ImagePage, we always create state with inlineModal: true
  const showModalStyle = useMemo(() => {
    // Mobile: always regular page
    if (isMobile) return false;

    if (!slug) return false;

    // CRITICAL: On refresh, location.state is ALWAYS null/undefined in React Router
    // If state is null/undefined, this is a refresh/direct access → show regular page
    if (location.state === null || location.state === undefined) {
      console.log('[ImagePage] showModalStyle: state is null/undefined (refresh/direct access) → regular page');
      return false;
    }

    // Check if we have location.state with modal navigation indicators
    // location.state exists only when navigating (not on refresh)
    const hasState = typeof location.state === 'object' && location.state !== null && Object.keys(location.state).length > 0;

    if (!hasState) {
      // Empty state object = regular page
      console.log('[ImagePage] showModalStyle: empty state object → regular page');
      return false;
    }

    // Check for modal navigation indicators
    const hasBackgroundState = !!location.state?.background;
    const hasInlineModalState = !!location.state?.inlineModal;
    const hasFromGridState = !!location.state?.fromGrid;
    const hasFromImagePageState = !!location.state?.fromImagePage;

    // Debug logging (remove after testing)
    console.log('[ImagePage] showModalStyle check:', {
      hasState,
      hasBackgroundState,
      hasInlineModalState,
      hasFromGridState,
      hasFromImagePageState,
      locationState: location.state,
      isStateNull: location.state === null,
      isStateUndefined: location.state === undefined,
      stateType: typeof location.state,
      hasNavigated: hasNavigatedRef.current
    });

    // Show modal-style if state indicates we came from grid/modal/ImagePage
    // We check state flags directly - if they exist, show modal-style
    // (hasNavigatedRef is just for tracking, but state presence is the real indicator)
    const result = hasBackgroundState || hasInlineModalState || hasFromGridState || hasFromImagePageState;
    console.log('[ImagePage] showModalStyle result:', result);
    return result;
  }, [slug, isMobile, location.state]);

  // Scroll state for container styling
  const [isScrolled, setIsScrolled] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isAtRelatedSection, setIsAtRelatedSection] = useState(false);

  // Image loading state (matching NoFlashGrid ImageModal)
  const calculateInitialState = useCallback((img: Image) => {
    if (!img) return { src: null, isFullQuality: false };
    const base64Placeholder = img.base64Thumbnail || null;
    const networkThumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
    const full = img.regularUrl || img.imageUrl || '';
    return {
      src: base64Placeholder || networkThumbnail || full,
      isFullQuality: false,
      isBase64: !!base64Placeholder
    };
  }, []);

  const [imageState, setImageState] = useState(() =>
    image ? calculateInitialState(image) : { src: null, isFullQuality: false }
  );
  const [frontSrc, setFrontSrc] = useState<string | null>(null);
  const [frontLoaded, setFrontLoaded] = useState(false);
  const [backSrc, setBackSrc] = useState<string | null>(imageState.src);
  const backSrcRef = useRef<string | null>(imageState.src);
  // Keep previous backSrc to prevent flashing during transitions
  const previousBackSrcRef = useRef<string | null>(imageState.src);
  // Track the image ID that the previousBackSrcRef belongs to
  const previousBackSrcImageIdRef = useRef<string | null>(image?._id || null);
  // Progress tracking for image loading
  const [imageProgress, setImageProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const currentLoadingUrlRef = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false); // Track if we're actively loading

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

  // Download menu state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Author tooltip state
  const [showAuthorTooltip, setShowAuthorTooltip] = useState(false);
  const [tooltipAnimating, setTooltipAnimating] = useState(false);
  const [authorImages, setAuthorImages] = useState<Image[]>([]);
  const [loadingAuthorImages, setLoadingAuthorImages] = useState(false);

  // Related images state
  const relatedImages = useMemo(() => {
    if (!image || images.length === 0) return [];
    return images.filter((img) => img._id !== image._id).slice(0, 8);
  }, [image, images]);

  const [relatedColumnCount, setRelatedColumnCount] = useState(() => {
    if (typeof window === 'undefined') return GRID_CONFIG.columns.desktop;
    return getColumnCount(window.innerWidth);
  });
  const [relatedContainerWidth, setRelatedContainerWidth] = useState(1400);
  const [relatedImageDimensions, setRelatedImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

  // Fetch image
  useEffect(() => {
    if (!imageId) {
      setError('Invalid image slug');
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to use passed images first (faster)
        const passedImages = location.state?.images as Image[] | undefined;
        if (passedImages && passedImages.length > 0) {
          const foundImage = passedImages.find(img => {
            const imgShortId = img._id.slice(-12);
            return imgShortId === imageId;
          });

          if (foundImage) {
            setImage(foundImage);
            setImages(passedImages);
            currentImageIds.current = new Set(passedImages.map(img => img._id));
            setLoading(false);
            return;
          }
        }

        // Otherwise, fetch from API
        const relatedResponse = await imageService.fetchImages({ limit: 50 });
        const allImages = relatedResponse.images || [];

        const foundImage = allImages.find(img => {
          const imgShortId = img._id.slice(-12);
          return imgShortId === imageId;
        });

        if (foundImage) {
          setImage(foundImage);
          setImages(allImages);
          currentImageIds.current = new Set(allImages.map(img => img._id));
        } else {
          setError('Image not found');
        }
      } catch (err: unknown) {
        console.error('Error fetching image:', err);
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [imageId, location.state]);

  // Fetch full image details when image changes (to get dailyViews/dailyDownloads)
  useEffect(() => {
    if (!image?._id) return;

    const fetchFullDetails = async () => {
      try {
        const response = await imageService.getImages({ limit: 1 });
        // This is a simplified version - in real implementation, you'd fetch by ID
        // For now, we'll use the image we already have
      } catch (error) {
        console.error('Failed to fetch image details:', error);
      }
    };

    fetchFullDetails();
  }, [image?._id]);

  // Update stats when image changes
  useLayoutEffect(() => {
    if (!image?._id) return;

    const imageId = image._id;
    const isNewImage = currentImageIdRef.current !== imageId;

    if (isNewImage) {
      currentImageIdRef.current = imageId;
      incrementedViewIds.current.delete(imageId);
    }

    const apiStats = apiStatsCache.get(imageId);
    if (apiStats) {
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
  }, [image?._id, image?.views, image?.downloads]);

  // Increment view count when image is viewed
  useEffect(() => {
    if (!image?._id) return;

    const imageId = image._id;
    if (!incrementedViewIds.current.has(imageId)) {
      incrementedViewIds.current.add(imageId);
      imageStatsService.incrementView(imageId)
        .then((response) => {
          setViews(response.views);
          const stats = apiStatsCache.get(imageId) || {};
          stats.views = response.views;
          apiStatsCache.set(imageId, stats);
        })
        .catch((error: any) => {
          if (error.response?.status === 429) {
            const rateLimitData = error.response.data;
            if (rateLimitData.views !== undefined) {
              setViews(rateLimitData.views);
              const stats = apiStatsCache.get(imageId) || {};
              stats.views = rateLimitData.views;
              apiStatsCache.set(imageId, stats);
            }
          } else {
            console.error('Failed to increment view:', error);
            incrementedViewIds.current.delete(imageId);
          }
        });
    }
  }, [image?._id]);

  // Image loading logic (matching NoFlashGrid ImageModal)
  useLayoutEffect(() => {
    if (!image) {
      return;
    }

    const currentImageId = image._id;
    const previousImageId = previousImgRef.current?._id;
    const imageChanged = previousImageId !== currentImageId;
    previousImgRef.current = image;

    // Only reset frontImageLoadedRef if image actually changed
    if (imageChanged) {
      frontImageLoadedRef.current = false;
      // CRITICAL: Save current backSrc to previousBackSrcRef BEFORE clearing
      // This ensures we have a fallback image to show during transition
      if (backSrcRef.current && previousImageId) {
        previousBackSrcRef.current = backSrcRef.current;
        previousBackSrcImageIdRef.current = previousImageId;
      }
      // CRITICAL: Save current container height to maintain it during transition
      // This prevents bottom bar and related images from jumping
      if (imageContainerRef.current) {
        const currentHeight = imageContainerRef.current.offsetHeight;
        if (currentHeight > 0) {
          containerHeightRef.current = currentHeight;
        }
      }
      // Don't clear backSrc immediately - let it stay until new one is ready
      // This prevents flash when clicking related images
    }

    // Reset scroll to top when image changes
    // CRITICAL: Delay scroll reset to prevent interfering with image transition
    // This ensures old image stays visible until new one is ready
    if (imageChanged) {
      scrollPosRef.current = 0;
      // Delay scroll reset to avoid triggering re-renders during image loading
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
          }
          setIsScrolled(false);
          setShouldAnimate(false);
          setIsAtRelatedSection(false);
        });
      });

      // Close menus when image changes
      setShowDownloadMenu(false);
      setShowAuthorTooltip(false);
      if (authorTooltipTimeoutRef.current) {
        clearTimeout(authorTooltipTimeoutRef.current);
        authorTooltipTimeoutRef.current = null;
      }
    }

    const thumbnail = image.thumbnailUrl || image.smallUrl || image.imageUrl || '';
    const regular = image.regularUrl;
    const original = image.imageUrl;

    const currentState = calculateInitialState(image);
    const newBackSrc = currentState.src;

    setImageState(currentState);

    // Update backSrc only when we have a new valid source
    // Keep old backSrc visible until new one is ready to prevent flashing
    if (newBackSrc) {
      const isBase64 = newBackSrc.startsWith('data:');

      if (isBase64) {
        // Base64 is instant, update immediately
        if (imageChanged || newBackSrc !== backSrcRef.current) {
          // CRITICAL: Only update previousBackSrcRef if we're changing images
          // Keep old value until new one is confirmed loaded
          if (imageChanged) {
            // previousBackSrcRef already set above, don't overwrite yet
          }
          backSrcRef.current = newBackSrc;
          setBackSrc(newBackSrc);
          // Update previous after new image is set and rendered
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              previousBackSrcRef.current = newBackSrc;
              previousBackSrcImageIdRef.current = currentImageId;
            });
          });
        }

        const networkThumbnail = image.thumbnailUrl || image.smallUrl || image.imageUrl || '';
        if (networkThumbnail && networkThumbnail !== newBackSrc) {
          preloadImage(networkThumbnail, true)
            .then((src) => {
              if (previousImgRef.current?._id === currentImageId) {
                backSrcRef.current = src;
                setBackSrc(src);
                previousBackSrcRef.current = src;
              }
            })
            .catch(() => { });
        }

        requestAnimationFrame(() => {
          if (previousImgRef.current?._id === currentImageId && !frontImageLoadedRef.current) {
            setFrontSrc(null);
          }
        });
      } else {
        // Network image - check if cached first
        if (loadedImages.has(newBackSrc)) {
          // Cached - update immediately
          if (imageChanged || newBackSrc !== backSrcRef.current) {
            // CRITICAL: previousBackSrcRef already set above when imageChanged
            // Don't overwrite it here - keep old image visible during transition
            backSrcRef.current = newBackSrc;
            setBackSrc(newBackSrc);
            // Update previous after new image is confirmed visible
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                previousBackSrcRef.current = newBackSrc;
                previousBackSrcImageIdRef.current = currentImageId;
              });
            });
          }
          requestAnimationFrame(() => {
            if (previousImgRef.current?._id === currentImageId && !frontImageLoadedRef.current) {
              setFrontSrc(null);
            }
          });
        } else {
          // Not cached - preload but keep old image visible until ready
          preloadImage(newBackSrc, false)
            .then((src) => {
              if (previousImgRef.current?._id === currentImageId) {
                // CRITICAL: previousBackSrcRef already set above when imageChanged
                // Keep old image visible until new one is loaded
                backSrcRef.current = src;
                setBackSrc(src);
                // Update previous after new image is confirmed loaded and visible
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    previousBackSrcRef.current = src;
                    previousBackSrcImageIdRef.current = currentImageId;
                  });
                });
                requestAnimationFrame(() => {
                  if (previousImgRef.current?._id === currentImageId && !frontImageLoadedRef.current) {
                    setFrontSrc(null);
                  }
                });
              }
            })
            .catch(() => {
              // On error, still set the src (browser will handle it)
              if (previousImgRef.current?._id === currentImageId) {
                backSrcRef.current = newBackSrc;
                setBackSrc(newBackSrc);
                previousBackSrcRef.current = newBackSrc;
                if (!frontImageLoadedRef.current) {
                  setFrontSrc(null);
                }
              }
            });
        }
      }
    } else {
      // No new backSrc - only clear if image changed
      if (imageChanged) {
        // Keep previous backSrc as fallback instead of clearing
        if (!previousBackSrcRef.current) {
          backSrcRef.current = null;
          setBackSrc(null);
        }
      }
    }

    // Load full image in background
    const loadFrontImage = async () => {
      let loadedAny = false;

      // Cancel any existing progress tracking
      if (currentLoadingUrlRef.current) {
        currentLoadingUrlRef.current = null;
      }

      // Reset progress
      setImageProgress(0);
      isLoadingRef.current = true;
      setShowProgressBar(true);

      if (regular && regular !== thumbnail) {
        try {
          if (loadedImages.has(regular)) {
            // Already cached - no progress needed
            isLoadingRef.current = false;
            setShowProgressBar(false);
            if (previousImgRef.current?._id === currentImageId) {
              setFrontSrc(regular);
              setFrontLoaded(true);
              frontImageLoadedRef.current = true;
              loadedAny = true;
            }
          } else {
            // Preload regular with progress tracking
            currentLoadingUrlRef.current = regular;
            // Ensure progress bar is visible before starting
            setShowProgressBar(true);
            const src = await preloadImageWithProgress(
              regular,
              (progress) => {
                if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === regular) {
                  setImageProgress(progress);
                  // Keep progress bar visible while loading - use ref to ensure it stays visible
                  if (isLoadingRef.current) {
                    setShowProgressBar(true);
                  }
                }
              },
              false
            );
            if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === regular) {
              setFrontSrc(src);
              if (!original || original === regular) {
                setFrontLoaded(true);
                isLoadingRef.current = false;
                setShowProgressBar(false);
              }
              frontImageLoadedRef.current = true;
              loadedAny = true;
            }
          }
        } catch (e) {
          // Ignore error, try original next
          if (previousImgRef.current?._id === currentImageId) {
            setShowProgressBar(false);
          }
        }
      }

      if (original && original !== thumbnail && original !== regular) {
        try {
          // Reset progress for original (starts from 0 or continue from regular)
          if (!loadedAny) {
            setImageProgress(0);
          }

          // Preload original with progress tracking
          currentLoadingUrlRef.current = original;
          // Ensure progress bar is visible before starting
          setShowProgressBar(true);
          const src = await preloadImageWithProgress(
            original,
            (progress) => {
              if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === original) {
                setImageProgress(progress);
                // Keep progress bar visible while loading - use ref to ensure it stays visible
                if (isLoadingRef.current) {
                  setShowProgressBar(true);
                }
              }
            },
            false
          );
          if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === original) {
            setFrontSrc(src);
            setFrontLoaded(true);
            isLoadingRef.current = false;
            setShowProgressBar(false);
            frontImageLoadedRef.current = true;
            loadedAny = true;
          }
        } catch (e) {
          // Ignore
          if (previousImgRef.current?._id === currentImageId) {
            setShowProgressBar(false);
          }
        }
      }

      if (!loadedAny && !regular && !original) {
        if (previousImgRef.current?._id === currentImageId) {
          setFrontSrc(null);
          setFrontLoaded(false);
        }
      } else if (!loadedAny && (regular || original) && previousImgRef.current?._id === currentImageId) {
        const target = original || regular;
        if (target === thumbnail) {
          setFrontSrc(target);
          setFrontLoaded(true);
          frontImageLoadedRef.current = true;
        }
      }
    };

    loadFrontImage();
  }, [image, calculateInitialState]);

  // Load dimensions for related images
  useEffect(() => {
    const loadDimensions = async () => {
      if (relatedImages.length === 0) return;

      const dimensionsMap = new Map<string, { width: number; height: number }>();
      const imagesToLoad: Array<{ image: Image; url: string }> = [];

      relatedImages.forEach((img) => {
        if (relatedImageDimensions.has(img._id)) {
          dimensionsMap.set(img._id, relatedImageDimensions.get(img._id)!);
          return;
        }

        if (img.width && img.height) {
          dimensionsMap.set(img._id, { width: img.width, height: img.height });
          return;
        }

        const imageUrl = img.regularUrl || img.imageUrl || img.smallUrl || img.thumbnailUrl;
        if (imageUrl) {
          imagesToLoad.push({ image: img, url: imageUrl });
        }
      });

      if (dimensionsMap.size > 0) {
        setRelatedImageDimensions(prev => {
          const merged = new Map(prev);
          dimensionsMap.forEach((value, key) => {
            merged.set(key, value);
          });
          return merged;
        });
      }

      if (imagesToLoad.length > 0) {
        const promises = imagesToLoad.map(async ({ image, url }) => {
          try {
            const dims = await loadImageDimensions(url);
            if (dims) {
              return { id: image._id, dims };
            }
          } catch {
            // Silently fail
          }
          return null;
        });

        const results = await Promise.all(promises);
        const validResults = results.filter((r): r is { id: string; dims: { width: number; height: number } } => r !== null);

        if (validResults.length > 0) {
          setRelatedImageDimensions(prev => {
            const merged = new Map(prev);
            validResults.forEach(result => {
              merged.set(result.id, result.dims);
            });
            return merged;
          });
        }
      }
    };

    loadDimensions();
  }, [relatedImages]);

  // Calculate grid layout for related images
  const relatedGridLayout = useMemo(() => {
    if (relatedImages.length === 0 || relatedContainerWidth === 0) return [];

    const gapTotal = GRID_CONFIG.gap * (relatedColumnCount - 1);
    const columnWidth = (relatedContainerWidth - gapTotal) / relatedColumnCount;
    const columnHeights = new Array(relatedColumnCount).fill(0);

    return relatedImages.map((img) => {
      const dimensions = relatedImageDimensions.get(img._id) || null;
      const layout = calculateImageLayout(
        img,
        columnWidth,
        GRID_CONFIG.baseRowHeight,
        dimensions
      );

      let shortestColumnIndex = 0;
      let shortestHeight = columnHeights[0];
      for (let i = 1; i < relatedColumnCount; i++) {
        if (columnHeights[i] < shortestHeight) {
          shortestHeight = columnHeights[i];
          shortestColumnIndex = i;
        }
      }

      const column = shortestColumnIndex + 1;
      const rowUnit = GRID_CONFIG.baseRowHeight + GRID_CONFIG.gap;
      const rowStart = Math.max(1, Math.floor(shortestHeight / rowUnit) + 1);

      columnHeights[shortestColumnIndex] = shortestHeight + layout.rowSpan * rowUnit;

      return {
        image: img,
        column,
        rowSpan: layout.rowSpan,
        rowStart,
        columnWidth,
      };
    });
  }, [relatedImages, relatedColumnCount, relatedContainerWidth, relatedImageDimensions]);

  // Update related grid column count and container width on resize
  useEffect(() => {
    const updateLayout = () => {
      if (!relatedGridRef.current) return;
      const container = relatedGridRef.current.parentElement;
      if (container) {
        const width = container.offsetWidth - 32;
        setRelatedContainerWidth(Math.max(300, width));
      }
      const viewportWidth = window.innerWidth;
      setRelatedColumnCount(getColumnCount(viewportWidth));
    };

    updateLayout();

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Locale and date formatting
  const locale = getLocale();
  const formattedDate = useFormattedDate(image?.createdAt, {
    locale: locale === 'vi' ? 'vi-VN' : 'en-US',
    format: 'long',
  });

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
    // Check if we have a background location (where we came from)
    const background = location.state?.background as { pathname?: string } | undefined;

    // If we have a background location, navigate there
    // This handles: homepage → ImagePage (close) → homepage
    // And: ImagePage1 → ImagePage2 (close) → ImagePage1
    if (background?.pathname) {
      // Navigate to background location
      // The HomePage's useEffect will handle scroll restoration on mount
      navigate(background.pathname, { state: background });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
      }
      return;
    }

    // No background location - go back in history
    // This handles edge cases where background is not set
    // The HomePage's useEffect will handle scroll restoration on mount
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
    }
    navigate(-1);
  }, [navigate, location.state]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleImageSelect = useCallback((selectedImage: Image) => {
    const newSlug = generateImageSlug(selectedImage.imageTitle || "", selectedImage._id);
    // Always create modal state when navigating to another image
    // This ensures the new ImagePage opens as modal-style, even if current page is regular
    const currentState = location.state || {};

    // Determine background location:
    // 1. If we have a background from grid/homepage, preserve it (for proper back navigation)
    // 2. If we're on a regular ImagePage (no background), use current location as background
    //    This way: ImagePage1 (regular) → ImagePage2 (modal) → close → ImagePage1 (regular)
    const background = location.state?.background || {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      key: location.key
    };

    const navigationState = {
      ...currentState,
      background, // Preserve original background or use current location
      inlineModal: true, // Always set inlineModal to true for modal-style
      images
    };

    // Debug logging (remove after testing)
    console.log('[ImagePage] handleImageSelect:', {
      newSlug,
      currentState,
      navigationState,
      currentLocationState: location.state,
      backgroundPathname: background.pathname
    });

    // Always use replace: true to avoid history buildup when navigating between images
    // The state will be properly set and detected by showModalStyle
    navigate(`/photos/${newSlug}`, {
      replace: true,
      state: navigationState
    });
  }, [navigate, images, location]);

  const handleDownload = useCallback(async (size: 'small' | 'medium' | 'large' | 'original') => {
    if (!image?._id) return;
    try {
      // Increment download count first
      try {
        const statsResponse = await imageStatsService.incrementDownload(image._id);
        setDownloads(statsResponse.downloads);
        const stats = apiStatsCache.get(image._id) || {};
        stats.downloads = statsResponse.downloads;
        apiStatsCache.set(image._id, stats);
      } catch (error: any) {
        if (error.response?.status === 429) {
          const rateLimitData = error.response.data;
          if (rateLimitData.downloads !== undefined) {
            setDownloads(rateLimitData.downloads);
            const stats = apiStatsCache.get(image._id) || {};
            stats.downloads = rateLimitData.downloads;
            apiStatsCache.set(image._id, stats);
          }
        } else {
          console.error('Failed to increment download count:', error);
        }
      }

      // Download image with selected size
      const response = await api.get(`/images/${image._id}/download?size=${size}`, {
        responseType: 'blob',
        withCredentials: true,
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'photo.webp';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      } else {
        const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        fileName = `${sanitizedTitle}.${urlExtension}`;
      }
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      toast.success(t('image.downloadSuccess'));
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(t('image.downloadFailed'));
    }
  }, [image]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user || !image?._id || isTogglingFavorite) return;
    setIsTogglingFavorite(true);
    try {
      const imageId = String(image._id);
      const response = await favoriteService.toggleFavorite(imageId);
      updateFavoriteCache(imageId, response.isFavorited);
      if (response.isFavorited) {
        toast.success(t('favorites.added'));
      } else {
        toast.success(t('favorites.removed'));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error(t('favorites.updateFailed'));
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [user, image, isTogglingFavorite]);

  const handleShare = useCallback(() => {
    if (!image?._id) return;
    const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
    const shareUrl = `${window.location.origin}/photos/${slug}`;
    if (navigator.share) {
      navigator.share({
        title: image.imageTitle || 'Photo',
        text: `Check out this photo: ${image.imageTitle || 'Untitled'}`,
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
      navigate(`/profile/${username}`);
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
  }, [showModalStyle]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle navigation if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]');

      if (isInputElement) {
        return; // Let the input handle the key event
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentImageIndex < images.length - 1) {
          handleImageSelect(images[currentImageIndex + 1]);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentImageIndex > 0) {
          handleImageSelect(images[currentImageIndex - 1]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex, images, handleImageSelect, handleClose]);

  // Trigger animation when tooltip appears
  useEffect(() => {
    if (showAuthorTooltip) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTooltipAnimating(true);
        });
      });
    } else {
      setTooltipAnimating(false);
    }
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

  // Handle related image click - MUST be defined before early returns
  const handleRelatedImageClick = useCallback((relatedImage: Image) => {
    handleImageSelect(relatedImage);
    // CRITICAL: Delay scroll until after image transition completes
    // This prevents scroll from triggering re-renders during image loading
    // Use multiple requestAnimationFrame to ensure it happens after React processes navigation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      });
    });
  }, [handleImageSelect]);

  // Loading state - check AFTER all hooks are called
  if (loading) {
    return (
      <>
        <Header />
        <div className="image-page-loading">
          <div className="loading-spinner" />
          <p>Đang tải ảnh...</p>
        </div>
      </>
    );
  }

  // Error state - check AFTER all hooks are called
  if (error || !image) {
    return (
      <>
        <Header />
        <div className="image-page-error">
          <p>{error || 'Không tìm thấy ảnh'}</p>
          <button onClick={() => navigate('/')}>Quay lại trang chủ</button>
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
        const top = (e.currentTarget as HTMLDivElement).scrollTop;
        const prevTop = scrollPosRef.current;
        const wasScrolled = prevTop > 0;
        scrollPosRef.current = top;

        // Check if scrolled past the initial spacer (16px)
        const nowScrolled = top > 0;

        // Check if we've reached the related section
        if (relatedSectionRef.current && scrollRef.current) {
          const relatedSectionRect = relatedSectionRef.current.getBoundingClientRect();
          const scrollAreaRect = scrollRef.current.getBoundingClientRect();
          const topBarHeight = 60;
          const reachedRelated = relatedSectionRect.top <= scrollAreaRect.top + topBarHeight;

          if (reachedRelated !== isAtRelatedSection) {
            setIsAtRelatedSection(reachedRelated);
          }
        }

        // Only update state if it actually changed
        if (nowScrolled !== wasScrolled) {
          setShouldAnimate(true);
          setIsScrolled(nowScrolled);

          setTimeout(() => {
            setShouldAnimate(false);
          }, 150);
        } else {
          setIsScrolled(nowScrolled);
        }
      }}
    >
      {/* Top info - Sticky: starts with space, sticks to viewport top when scrolling */}
      <div ref={topInfoRef} className={`image-modal-top-info ${isAtRelatedSection ? 'slide-up' : ''}`}>
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
              setShowAuthorTooltip(true);
              const userId = (image.uploadedBy as any)?._id || image.uploadedBy;
              if (userId && !loadingAuthorImages) {
                setLoadingAuthorImages(true);
                try {
                  const response = await imageFetchService.fetchUserImages(userId, { page: 1, limit: 3 });
                  setAuthorImages(response.images || []);
                } catch (error) {
                  console.error('Failed to fetch author images:', error);
                  setAuthorImages([]);
                } finally {
                  setLoadingAuthorImages(false);
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
            <div className="image-modal-author-title">{image.imageTitle || t('image.topInfo')}</div>
          </div>

          {/* Author tooltip/popup */}
          {showAuthorTooltip && authorAreaRef.current && topInfoRef.current && modalRef.current && (() => {
            const authorRect = authorAreaRef.current!.getBoundingClientRect();
            const modalRect = modalRef.current!.getBoundingClientRect();
            return (
              <div
                data-author-tooltip
                className={`image-modal-author-tooltip ${tooltipAnimating ? 'animating' : ''}`}
                style={{
                  top: `${authorRect.bottom - 10}px`,
                  left: `${modalRect.left - 140}px`,
                }}
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
                  {(image.uploadedBy as any)?.location || t('image.noLocation')}
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
                              alt={authorImg.imageTitle || 'Photo'}
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
            );
          })()}
        </div>
        <div className="image-modal-actions">
          {/* Save/Favorite button */}
          {user && (
            <button
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              className="image-modal-favorite-button"
            >
              <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
              <span>{t('image.save')}</span>
              <kbd className="image-modal-kbd">F</kbd>
            </button>
          )}

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
                  { value: 'original' as const, label: t('image.original'), dimension: t('image.fullSize') },
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
                      <span className="image-modal-download-option-default">{t('image.default')}</span>
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
              // CRITICAL: Maintain container height during transitions to prevent layout shift
              // Use saved height if available, otherwise let it be auto
              minHeight: containerHeightRef.current ? `${containerHeightRef.current}px` : '0',
            }}
            onLoad={(e) => {
              // Update container height when image loads
              const container = e.currentTarget;
              if (container.offsetHeight > 0) {
                containerHeightRef.current = container.offsetHeight;
              }
            }}
          >
            {/* Back layer - fallback to image URL if backSrc not set */}
            {(() => {
              // CRITICAL: Use previousBackSrcRef as fallback ONLY if it belongs to a different image
              // This prevents showing old image when new one is ready
              // Priority: backSrc (current) > previousBackSrcRef (if different image) > image URLs (fallback)
              const canUsePrevious = previousBackSrcRef.current &&
                previousBackSrcImageIdRef.current &&
                previousBackSrcImageIdRef.current !== image._id;
              const backImageSrc = backSrc || (canUsePrevious ? previousBackSrcRef.current : null) ||
                image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl || '';

              // Only render if we have a source
              if (!backImageSrc) return null;

              // Render back image if it's not hidden by front image
              const isBase64 = backSrc?.startsWith('data:');
              const shouldRenderBack = !(isBase64 && frontLoaded);
              if (!shouldRenderBack) return null;

              // CRITICAL: Determine if this is the old image (from previousBackSrcRef)
              const isOldImage = !backSrc && canUsePrevious && backImageSrc === previousBackSrcRef.current;

              // CRITICAL: Use CSS to hide old image once new one starts loading
              // This prevents flash while keeping old image visible during transition
              const shouldHide = isOldImage && backSrcRef.current !== null;

              // Use image ID in key to ensure React handles transitions properly
              // But don't change key when using previousBackSrcRef to keep it mounted
              const imageKey = isOldImage
                ? `back-previous-${previousBackSrcImageIdRef.current}`
                : `back-${image._id}`;

              return (
                <img
                  key={imageKey}
                  src={backImageSrc}
                  alt={image.imageTitle || 'photo'}
                  className={`image-modal-back-image ${frontLoaded ? 'loaded' : ''}`}
                  style={{
                    // CRITICAL: Hide old image with CSS when new one is ready
                    // This is faster than React unmounting
                    display: shouldHide ? 'none' : 'block',
                    visibility: shouldHide ? 'hidden' : 'visible',
                    opacity: shouldHide ? 0 : 1,
                  }}
                  draggable={false}
                  onLoad={(e) => {
                    const imgEl = e.currentTarget;
                    // CRITICAL: Update container height when new image loads
                    if (!isOldImage && imageContainerRef.current) {
                      requestAnimationFrame(() => {
                        const newHeight = imageContainerRef.current?.offsetHeight;
                        if (newHeight && newHeight > 0) {
                          containerHeightRef.current = newHeight;
                        }
                      });
                    }
                    // CRITICAL: If this is old image and new one is ready, hide it immediately
                    if (isOldImage && backSrcRef.current) {
                      imgEl.style.display = 'none';
                      imgEl.style.visibility = 'hidden';
                    }
                    if (imgEl.decode) {
                      imgEl.decode().catch(() => { });
                    }
                  }}
                  onError={(e) => {
                    console.error('[ImagePage] Back image error:', e.currentTarget.src);
                  }}
                />
              );
            })()}
            {/* Front layer */}
            {(() => {
              return frontSrc ? (
                <img
                  key={`front-${image._id}`}
                  ref={imgElementRef}
                  src={frontSrc}
                  alt={image.imageTitle || 'photo'}
                  className={`image-modal-front-image ${frontLoaded ? 'loaded' : ''}`}
                  draggable={false}
                  onLoad={(e) => {
                    const imgEl = e.currentTarget;
                    if (imgEl.decode) {
                      imgEl.decode().then(() => {
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            setFrontLoaded(true);
                          });
                        });
                      }).catch(() => {
                        requestAnimationFrame(() => {
                          setFrontLoaded(true);
                        });
                      });
                    } else {
                      requestAnimationFrame(() => {
                        setFrontLoaded(true);
                      });
                    }
                  }}
                  onError={(e) => {
                    console.error('[ImagePage] Front image error:', e.currentTarget.src);
                    setFrontLoaded(false);
                  }}
                />
              ) : null;
            })()}
            {/* Fallback: if no backSrc or frontSrc, show image directly */}
            {(() => {
              const fallbackSrc = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl || '';
              const shouldRenderFallback = !backSrc && !frontSrc && !!fallbackSrc;
              return shouldRenderFallback ? (
                <img
                  key={`fallback-${image._id}`}
                  src={fallbackSrc}
                  alt={image.imageTitle || 'photo'}
                  className="image-modal-front-image"
                  draggable={false}
                  onLoad={() => { }}
                  onError={(e) => {
                    console.error('[ImagePage] Fallback image error:', e.currentTarget.src);
                  }}
                />
              ) : null;
            })()}
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
                <ImageModalInfo image={image} />
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
            {image.tags && Array.isArray(image.tags) && image.tags.length > 0 && (
              <div className="image-modal-image-tags">
                {image.tags.map((tag, idx) => (
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

      {/* Related images - outside bottom bar */}
      <div ref={relatedSectionRef} className="image-modal-related-section">
        <div className="image-modal-related-title">Related images</div>
        <div
          ref={relatedGridRef}
          className="image-modal-related-grid"
          style={{
            gridTemplateColumns: `repeat(${relatedColumnCount}, 1fr)`,
            gap: `${GRID_CONFIG.gap}px`,
            gridAutoRows: `${GRID_CONFIG.baseRowHeight}px`,
          }}
        >
          {relatedGridLayout.map((layout, idx) => {
            const { image: relatedImage, column, rowSpan, rowStart } = layout;
            return (
              <div
                key={`${relatedImage._id || idx}-${column}-${rowStart}`}
                className="image-modal-related-item-wrapper"
                style={{
                  gridColumn: column,
                  gridRowStart: rowStart,
                  gridRowEnd: `span ${rowSpan}`,
                  height: 'auto',
                }}
              >
                <BlurUpImage
                  image={relatedImage}
                  onClick={() => {
                    handleRelatedImageClick(relatedImage);
                  }}
                  priority={idx < 4}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Progress bar at top of viewport */}
      <ImageProgressBar progress={imageProgress} visible={showProgressBar || isLoadingRef.current} />
      {!showModalStyle && <Header />}
      {showModalStyle ? (
        // Modal-style: Overlay with container inside (like NoFlashGrid ImageModal)
        <div
          onClick={handleOverlayClick}
          className="image-modal-overlay"
        >
          <div
            ref={modalRef}
            className={`image-modal-container ${isScrolled ? 'scrolled' : ''} ${shouldAnimate ? 'animate' : ''}`}
          >
            {modalContent}
          </div>
        </div>
      ) : (
        // Regular page: Wrapper with sidebar
        <div className="image-page">
          <ImagePageSidebar />
          <div
            ref={modalRef}
            className={`image-modal-container ${isScrolled ? 'scrolled' : ''} ${shouldAnimate ? 'animate' : ''}`}
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
          className="image-modal-close-button"
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
              handleImageSelect(images[currentImageIndex - 1]);
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
              handleImageSelect(images[currentImageIndex + 1]);
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
      {/* Collection Modal - TODO: Add collection functionality */}
    </>
  );
}

export default ImagePage;
