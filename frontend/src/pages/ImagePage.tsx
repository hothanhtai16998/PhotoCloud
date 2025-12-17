import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import Header from '@/components/Header';
import { imageService } from '@/services/imageService';
import api from '@/lib/axios';
import { extractIdFromSlug, generateImageSlug } from '@/lib/utils';
import type { Image } from '@/types/image';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUserStore } from '@/stores/useUserStore';
import { imageFetchService } from '@/services/imageFetchService';
import { imageStatsService } from '@/services/imageStatsService';
import { favoriteService } from '@/services/favoriteService';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import { shareService } from '@/utils/shareService';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { t, getLocale } from '@/i18n';
import { toast } from 'sonner';
import { Heart, Share2, ChevronDown, MapPin, ExternalLink, Tag, Edit2, FolderPlus } from 'lucide-react';
import { ImageModalInfo } from '@/components/NoFlashGrid/components/ImageModalInfo';
import { preloadImage, preloadImageWithProgress, loadedImages } from '@/components/NoFlashGrid/utils/imagePreloader';
import { ImageProgressBar } from '@/components/NoFlashGrid/components/ImageProgressBar';
import { NoFlashGrid } from '@/components/NoFlashGrid';
import { validateModalState, clearModalActive, restoreScrollPosition, setModalActive } from '@/utils/modalNavigation';
import { detectAvifSupport } from '@/utils/avifSupport';
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
  const { user } = useUserStore();
  
  // IMPORTANT: Use ActualLocationContext to get the REAL location (not background location)
  // When rendered as modal route, location from useLocation() is the background location
  // We need the actual location with modal state
  const actualLocation = useContext(ActualLocationContext);
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
  const isImageChangingRef = useRef(false);
  const topInfoRef = useRef<HTMLDivElement>(null);
  const authorAreaRef = useRef<HTMLDivElement>(null);
  const previousImgRef = useRef<Image | null>(null);
  const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);
  // Track container height to maintain it during transitions
  const containerHeightRef = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);
  // Track if we manually set image from related click to prevent fetch effect from overwriting
  const manuallySetImageRef = useRef<string | null>(null);
  // State to track if we're clicking a related image (not keyboard navigation)
  // When true, never show previous image - just show new image directly
  // Use state instead of ref so React re-renders when it changes
  const [isClickingRelatedImage, setIsClickingRelatedImage] = useState(false);
  
  // Calculate initial container height based on image dimensions
  const calculateInitialHeight = useCallback((img: Image | null): number | null => {
    if (!img || !imageContainerRef.current) return null;
    
    // If we have image dimensions, calculate expected height
    if (img.width && img.height) {
      const containerWidth = imageContainerRef.current.offsetWidth || imageContainerRef.current.clientWidth;
      if (containerWidth > 0) {
        const aspectRatio = img.width / img.height;
        const calculatedHeight = containerWidth / aspectRatio;
        const maxHeight = Math.min(calculatedHeight, window.innerHeight - 180);
        return Math.max(300, maxHeight); // Minimum 300px to prevent collapse
      }
    }
    
    // Fallback: use saved height or reasonable default
    return containerHeightRef.current || 400; // Default 400px if no dimensions
  }, []);

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
  const getRegularDisplayUrl = useCallback((img: Image | null): string => {
    if (!img) return '';
    if (supportsAvif) {
      // Prefer AVIF variants first, then fall back to WebP/JPEG sources.
      return (
        img.regularAvifUrl ||
        img.imageAvifUrl ||
        img.regularUrl ||
        img.imageUrl ||
        img.smallAvifUrl ||
        img.smallUrl ||
        ''
      );
    }
    // Fallback when AVIF is not supported.
    return img.regularUrl || img.imageUrl || img.smallUrl || '';
  }, [supportsAvif]);

  const getOriginalDisplayUrl = useCallback((img: Image | null): string => {
    if (!img) return '';
    if (supportsAvif) {
      return (
        img.imageAvifUrl ||
        img.regularAvifUrl ||
        img.imageUrl ||
        img.regularUrl ||
        ''
      );
    }
    return img.imageUrl || img.regularUrl || '';
  }, [supportsAvif]);

  // Simplified: Single image source and loaded state (like Unsplash)
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  // Track which image ID the current imageSrc belongs to
  const imageSrcImageIdRef = useRef<string | null>(null);
  // Keep previous imageSrc to show during transition
  const previousImageSrcRef = useRef<string | null>(null);
  const previousImageSrcImageIdRef = useRef<string | null>(null);
  // Track loaded state per image ID
  const imageLoadedMapRef = useRef<Map<string, boolean>>(new Map());
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

  // Collection modal state
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Author tooltip state
  const [showAuthorTooltip, setShowAuthorTooltip] = useState(false);
  const [tooltipAnimating, setTooltipAnimating] = useState(false);
  const [authorImages, setAuthorImages] = useState<Image[]>([]);
  const [loadingAuthorImages, setLoadingAuthorImages] = useState(false);

  // Related images - filter out current image
  const relatedImages = useMemo(() => {
    if (!image || images.length === 0) return [];
    return images.filter((img) => img._id !== image._id).slice(0, 20);
  }, [image, images]);


  // Helper function to set image source and loaded state
  // Avoids code duplication across multiple fetch paths
  const setImageSourceAndState = useCallback((img: Image) => {
    const regular = getRegularDisplayUrl(img);
    const original = getOriginalDisplayUrl(img);
    
    if (regular && loadedImages.has(regular)) {
      setImageSrc(regular);
      imageSrcImageIdRef.current = img._id;
      const wasLoaded = imageLoadedMapRef.current.get(img._id) === true;
      setImageLoaded(wasLoaded);
    } else if (original && loadedImages.has(original)) {
      setImageSrc(original);
      imageSrcImageIdRef.current = img._id;
      const wasLoaded = imageLoadedMapRef.current.get(img._id) === true;
      setImageLoaded(wasLoaded);
    } else {
      // Set imageSrc immediately even if not cached to prevent flash
      const targetUrl = regular || original;
      if (targetUrl) {
        setImageSrc(targetUrl);
        imageSrcImageIdRef.current = img._id;
        
        // Check browser cache synchronously
        const testImg = new Image();
        testImg.src = targetUrl;
        if (testImg.complete && testImg.naturalWidth > 0 && testImg.naturalHeight > 0) {
          imageLoadedMapRef.current.set(img._id, true);
          setImageLoaded(true);
        } else {
          setImageLoaded(false);
        }
      }
    }
  }, [getRegularDisplayUrl, getOriginalDisplayUrl]);

  // Fetch image
  useEffect(() => {
    if (!imageId) {
      setError('Invalid image slug');
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        // CRITICAL: If we manually set the image (from related click), check if it matches
        // If it does, don't overwrite it - it's already set correctly
        if (manuallySetImageRef.current) {
          const manualImageId = manuallySetImageRef.current.slice(-12);
          if (manualImageId === imageId) {
            // Don't set loading or fetch - image is already set
            // Clear the ref after a short delay to allow render to complete
            setTimeout(() => {
              manuallySetImageRef.current = null;
            }, 100);
            return;
          }
        }

        setLoading(true);
        setError(null);

        const initialState = initialLocationStateRef.current as
          | { images?: Image[]; image?: Image; fromGrid?: boolean }
          | undefined;

        // 1) Fast path: if a single image was passed in state, use it directly.
        const passedImage = initialState?.image;
        if (passedImage && passedImage._id) {
          const imgShortId = passedImage._id.slice(-12);
          if (imgShortId === imageId) {
            const passedImages = Array.isArray(initialState?.images)
              ? (initialState!.images as Image[])
              : [passedImage];

            setImage(passedImage);
            setImages(passedImages);
            setImageSourceAndState(passedImage);
            
            setLoading(false);
            return;
          }
        }

        // 2) Next: try passed images array (existing behavior)
        const passedImages = initialState?.images as Image[] | undefined;
        if (passedImages && passedImages.length > 0) {
          const foundImage = passedImages.find((img) => {
            const imgShortId = img._id.slice(-12);
            return imgShortId === imageId;
          });

          if (foundImage) {
            setImage(foundImage);
            setImages(passedImages);
            setImageSourceAndState(foundImage);
            
            setLoading(false);
            return;
          }
        }

        // 3) Fallback: fetch from API (direct URL / refresh)
        const relatedResponse = await imageService.fetchImages({ limit: 50 });
        const allImages = relatedResponse.images || [];

        const foundImage = allImages.find((img) => {
          const imgShortId = img._id.slice(-12);
          return imgShortId === imageId;
        });

        if (foundImage) {
          setImage(foundImage);
          setImages(allImages);
          setImageSourceAndState(foundImage);
        } else {
          setError('Image not found');
        }
      } catch (err: unknown) {
        console.error('[ImagePage] 🟢 fetchImage ERROR:', err);
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [imageId, location.state]);


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

  // Image loading logic - check browser cache when image changes to prevent flash
  useLayoutEffect(() => {
    if (!image) {
      return;
    }
    
    const currentImageId = image._id;
    const regular = getRegularDisplayUrl(image);
    const original = getOriginalDisplayUrl(image);
    const src = regular || original;
    
    if (!src) return;
    
    // Check browser cache synchronously to set imageLoaded immediately
    // Also check if image was preloaded (from hover or previous load)
    const inLoadedSet = loadedImages.has(regular) || loadedImages.has(original);
    const inLoadedMap = imageLoadedMapRef.current.get(currentImageId) === true;
    
    // Check browser cache directly by creating a test image
    // This is more reliable than just checking loadedImages set
    const testImg = new Image();
    testImg.src = src;
    const inBrowserCache = testImg.complete && testImg.naturalWidth > 0 && testImg.naturalHeight > 0;
    
    const wasPreloaded = inLoadedSet || inLoadedMap || inBrowserCache;
    
    if (wasPreloaded || inBrowserCache) {
      // Image is preloaded or in browser cache, mark as loaded immediately
      imageLoadedMapRef.current.set(currentImageId, true);
      // Only set imageLoaded if this is the current image
      if (imageSrcImageIdRef.current === currentImageId || !imageSrcImageIdRef.current) {
        setImageLoaded(true);
      }
    } else {
      // Image not in cache, will load via onLoad handler
      if (imageSrcImageIdRef.current === currentImageId || !imageSrcImageIdRef.current) {
        setImageLoaded(false);
      }
    }

    const previousImageId = previousImgRef.current?._id;
    const imageChanged = previousImageId !== currentImageId;

    previousImgRef.current = image;

    // Don't reset imageLoaded when image changes - keep old image visible
    if (imageChanged) {
      // CRITICAL: Only save previous imageSrc if it belongs to the PREVIOUS image
      // Don't overwrite if previousImageSrcRef was already cleared (e.g., in handleRelatedImageClick)
      // Only save if imageSrc belongs to previous image (not current)
      // IMPORTANT: If previousImageSrcRef is null, it was intentionally cleared - don't restore it
      if (imageSrc && imageSrcImageIdRef.current && imageSrcImageIdRef.current === previousImageId) {
        // Only save if it's actually the previous image's src AND previous wasn't cleared
        // If previousImageSrcRef is null, it means we intentionally cleared it (e.g., new image is preloaded)
        if (!previousImageSrcRef.current && previousImageSrcImageIdRef.current === null) {
          // Previous was cleared intentionally - don't restore it
          // This prevents overwriting the cleared state from handleRelatedImageClick
        } else if (!previousImageSrcRef.current || previousImageSrcImageIdRef.current !== previousImageId) {
          previousImageSrcRef.current = imageSrc;
          previousImageSrcImageIdRef.current = imageSrcImageIdRef.current;
        }
      }
      
      // CRITICAL: Update imageSrcImageIdRef immediately when image changes
      // This prevents the render logic from thinking we're still transitioning
      // Also update imageSrc immediately if image is preloaded to prevent flash
      if (imageSrcImageIdRef.current !== currentImageId) {
        // If image is preloaded, update imageSrc immediately to prevent flash
        if (wasPreloaded && src) {
          setImageSrc(src);
          imageSrcImageIdRef.current = currentImageId;
          // If preloaded, set imageLoaded to true immediately so new image shows right away
          setImageLoaded(true);
          // CRITICAL: Clear previous image reference immediately when new image is ready
          // This prevents the old image from flashing
          previousImageSrcRef.current = null;
          previousImageSrcImageIdRef.current = null;
        } else {
          // Still update the ref even if not preloaded, so render logic knows we're on new image
          imageSrcImageIdRef.current = currentImageId;
          // Reset imageLoaded to false so previous image stays visible until new one loads
          setImageLoaded(false);
        }
      }
      
      // CRITICAL: Clear previous image reference when image prop changes and new image is ready
      // This handles navigation timing issues where image prop updates before refs
      // Check if image prop changed (different from previous ref)
      if (imageChanged && previousImageSrcImageIdRef.current && 
          previousImageSrcImageIdRef.current !== currentImageId) {
        // If new image is ready (preloaded or loaded), clear previous immediately
        if (wasPreloaded || imageLoaded) {
          previousImageSrcRef.current = null;
          previousImageSrcImageIdRef.current = null;
        }
      } else if (wasPreloaded && imageLoaded && previousImageSrcImageIdRef.current !== currentImageId) {
        // If image is already current and preloaded, clear previous image reference
        // This handles the case where image was preloaded after the initial check
        previousImageSrcRef.current = null;
        previousImageSrcImageIdRef.current = null;
      }
      
      // Save current container height to maintain it during transition
      if (imageContainerRef.current) {
        const currentHeight = imageContainerRef.current.offsetHeight;
        if (currentHeight > 0) {
          containerHeightRef.current = currentHeight;
        } else {
          const initialHeight = calculateInitialHeight(image);
          if (initialHeight) {
            containerHeightRef.current = initialHeight;
          }
        }
      } else {
        const initialHeight = calculateInitialHeight(image);
        if (initialHeight) {
          containerHeightRef.current = initialHeight;
        }
      }
    }

    // Reset scroll to top when image changes
    if (imageChanged) {
      // Set flag to prevent scroll handler from interfering
      isImageChangingRef.current = true;
      setIsImageChanging(true);
      
      // Immediately reset states to prevent layout shifts
      // Reset isScrolled immediately to prevent margin jump (no animation)
      setIsScrolled(false);
      setShouldAnimate(false);
      
      // Lock scroll position immediately to prevent browser scroll restoration
      scrollPosRef.current = 0;
      if (scrollRef.current) {
        // Reset scroll to top immediately
        scrollRef.current.scrollTop = 0;
        // Temporarily disable scroll to prevent browser restoration during height changes
        scrollRef.current.style.overflow = 'hidden';
      }
      
      // Delay scroll re-enable to avoid triggering re-renders during image loading
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            // Ensure scroll is still at top
            scrollRef.current.scrollTop = 0;
            // Re-enable scroll after container height is locked
            scrollRef.current.style.overflow = '';
          }
          // Double-check state after scroll reset to ensure it's correct
          setIsScrolled(false);
          
          // Clear flags after a short delay to re-enable transitions for scroll-based changes
          // The topbar should already be visible instantly (no transition)
          setTimeout(() => {
            isImageChangingRef.current = false;
            setIsImageChanging(false);
          }, 100); // Short delay to ensure state is settled
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

    // Preload image if not already set
    // Check if imageSrc belongs to current image by checking imageSrcImageIdRef
    const imageSrcBelongsToCurrentImage = imageSrcImageIdRef.current === currentImageId;
    const needsPreload = !imageSrc || (!imageSrcBelongsToCurrentImage && (imageSrc !== regular && imageSrc !== original));
    
    if (needsPreload) {
      const targetUrl = regular || original;
      if (targetUrl) {
        // Cancel any existing progress tracking
        if (currentLoadingUrlRef.current) {
          currentLoadingUrlRef.current = null;
        }

        // Reset progress
        setImageProgress(0);
        isLoadingRef.current = true;
        setShowProgressBar(true);

        // Preload with progress tracking
        currentLoadingUrlRef.current = targetUrl;
        preloadImageWithProgress(
          targetUrl,
          (progress) => {
            if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === targetUrl) {
              setImageProgress(progress);
              if (isLoadingRef.current) {
                setShowProgressBar(true);
              }
            }
          },
          false // skipDecode=false to ensure image is ready
        )
          .then((src) => {
            if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === targetUrl) {
              // Save previous imageSrc before updating (only if it belongs to a different image)
              if (imageSrc && imageSrcImageIdRef.current && imageSrcImageIdRef.current !== currentImageId) {
                previousImageSrcRef.current = imageSrc;
                previousImageSrcImageIdRef.current = imageSrcImageIdRef.current;
              }
              
              // Set new imageSrc
              setImageSrc(src);
              imageSrcImageIdRef.current = currentImageId;
              
              // Check if this image was already loaded before
              const wasLoaded = imageLoadedMapRef.current.get(currentImageId) === true;
              if (wasLoaded) {
                setImageLoaded(true);
              } else {
                setImageLoaded(false);
              }
              
              isLoadingRef.current = false;
              setShowProgressBar(false);
            }
          })
          .catch(() => {
            if (previousImgRef.current?._id === currentImageId) {
              setShowProgressBar(false);
            }
          });
      }
    }
  }, [image, imageSrc, getRegularDisplayUrl, getOriginalDisplayUrl, calculateInitialHeight]);

  // Set initial container height when image changes (before images load)
  useEffect(() => {
    if (!image || !imageContainerRef.current) return;
    
    // Calculate initial height from image dimensions
    if (image.width && image.height) {
      requestAnimationFrame(() => {
        if (!imageContainerRef.current) return;
        
        const containerWidth = imageContainerRef.current.offsetWidth || imageContainerRef.current.clientWidth;
        const estimatedWidth = containerWidth > 0 ? containerWidth : 1400; // Default to 1400px if not measured yet
        const aspectRatio = image.width / image.height;
        const calculatedHeight = estimatedWidth / aspectRatio;
        const maxHeight = Math.min(calculatedHeight, window.innerHeight - 180);
        const initialHeight = Math.max(300, maxHeight);
        
        // Only update if significantly different to avoid unnecessary updates
        if (!containerHeightRef.current || Math.abs(containerHeightRef.current - initialHeight) > 50) {
          containerHeightRef.current = initialHeight;
        }
      });
    } else if (!containerHeightRef.current) {
      // No dimensions, use default
      containerHeightRef.current = 400;
    }
  }, [image?._id, image?.width, image?.height]);

  // Preload related images aggressively when they come into view
  // This ensures images are ready when user clicks (like Unsplash)
  useEffect(() => {
    if (relatedImages.length === 0) return;
    
    // Preload ALL related images with decode (critical for modal)
    // This is more aggressive than normal preload but prevents flash
    relatedImages.forEach((relatedImg, index) => {
      // Stagger preload slightly to not block main thread
      setTimeout(() => {
        // Preload regular URL with decode (ensures image is ready for display)
        const regular = getRegularDisplayUrl(relatedImg);
        if (regular && !loadedImages.has(regular)) {
          preloadImage(regular, false).catch(() => {}); // skipDecode=false for modal
        }
        
        // Also ensure base64 is "loaded" (it's instant but mark it)
        if (relatedImg.base64Thumbnail) {
          loadedImages.add(relatedImg.base64Thumbnail);
        }
      }, index * 50); // Stagger by 50ms to avoid overwhelming
    });
  }, [relatedImages, getRegularDisplayUrl]);

  // Load dimensions for related images
  // Update image container height if dimensions are available
  useEffect(() => {
    const updateLayout = () => {
      if (image && imageContainerRef.current && image.width && image.height) {
        const containerWidth = imageContainerRef.current.offsetWidth || imageContainerRef.current.clientWidth;
        if (containerWidth > 0) {
          const aspectRatio = image.width / image.height;
          const calculatedHeight = containerWidth / aspectRatio;
          const maxHeight = Math.min(calculatedHeight, window.innerHeight - 180);
          const newHeight = Math.max(300, maxHeight);
          if (newHeight !== containerHeightRef.current) {
            containerHeightRef.current = newHeight;
          }
        }
      }
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
  }, [image]);

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
    // Use unified utilities for cleanup
    clearModalActive();
    restoreScrollPosition();

    // Check if we have a background location (where we came from)
    // Use locationWithState to get the actual state with background
    const background = locationWithState.state?.background as { pathname?: string; search?: string; hash?: string } | undefined;

    // If we have a background location, navigate there
    // This handles: homepage → ImagePage (close) → homepage
    // And: ImagePage1 → ImagePage2 (close) → ImagePage1
    if (background?.pathname) {
      // Don't navigate if we're already on that path (shouldn't happen, but prevent issues)
      if (background.pathname === location.pathname) {
        // Already on the background page, just go back in history
        navigate(-1);
        return;
      }

      // Navigate to background location without causing a reload
      // Use replace: false to allow back button to work properly
      // Don't pass the full background state to avoid circular references
      navigate(background.pathname, { 
        replace: false,
        state: undefined // Clear state to prevent modal-style on the background page
      });
      return;
    }

    // No background location - go back in history
    // This handles edge cases where background is not set
    // The HomePage's useEffect will handle scroll restoration on mount
    navigate(-1);
  }, [navigate, location.state, location.pathname]);

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
    // Use locationWithState to get the actual state
    const currentState = locationWithState.state || {};

    // Determine background location:
    // 1. If we have a background from grid/homepage, preserve it (for proper back navigation)
    // 2. If we're on a regular ImagePage (no background), use current location as background
    //    This way: ImagePage1 (regular) → ImagePage2 (modal) → close → ImagePage1 (regular)
    const background = locationWithState.state?.background || {
      pathname: locationWithState.pathname,
      search: locationWithState.search,
      hash: locationWithState.hash,
      state: locationWithState.state,
      key: locationWithState.key
    };

    const navigationState = {
      ...currentState,
      background, // Preserve original background or use current location
      inlineModal: true, // Always set inlineModal to true for modal-style
      images
    };

    // Set modal active flag when navigating to another image
    // This ensures validation passes when the new ImagePage loads
    setModalActive();

    // Always use replace: true to avoid history buildup when navigating between images
    // The state will be properly set and detected by showModalStyle
    navigate(`/photos/${newSlug}`, {
      replace: true,
      state: navigationState
    });
  }, [navigate, images, locationWithState]);

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
    return undefined;
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
  }, [currentImageIndex, images, handleImageSelect, handleClose]);

  // Handle related image hover - preload on hover for instant click
  // This is like Unsplash: preload when user hovers, so click is instant
  // Preload AVIF URL (getRegularDisplayUrl already prefers AVIF)
  const handleRelatedImageHover = useCallback((relatedImage: Image) => {
    // Get AVIF URL (getRegularDisplayUrl prefers AVIF when supported)
    const regular = getRegularDisplayUrl(relatedImage);
    if (regular && !loadedImages.has(regular)) {
      // Preload with decode (skipDecode=false) to ensure it's ready
      // Don't await - just start loading in background
      preloadImage(regular, false).catch(() => {});
    }
    
    // Note: Container height is calculated in handleRelatedImageClick when user actually clicks
  }, [getRegularDisplayUrl]);

  // Handle related image click
  //
  // Preload image with decode before navigating (like Unsplash)
  // This ensures image is fully ready and prevents flash
  // Simplified: handleRelatedImageClick (like Unsplash)
  const handleRelatedImageClick = useCallback((relatedImage: Image, _index: number) => {
    // CRITICAL: Set flag to indicate we're clicking a related image
    // This tells the render logic to NEVER show previous image
    // Use state so React re-renders immediately
    setIsClickingRelatedImage(true);
    
    // CRITICAL: Update image state IMMEDIATELY to the new image
    // This prevents the old image from being rendered after navigation
    // The navigation state will have the image, but we update state now to prevent flash
    setImage(relatedImage);
    // CRITICAL: Keep the full images array, not just relatedImages
    // relatedImages is filtered (excludes current image), so using it would shrink the array each click
    // Instead, keep the full images array so related images don't disappear
    // Only update if images array doesn't already contain the related image
    if (!images.find(img => img._id === relatedImage._id)) {
      // If related image is not in current images array, add it
      // This handles edge cases but normally images should already contain it
      setImages([...images, relatedImage]);
    }
    // Mark that we manually set the image to prevent fetch effect from overwriting it
    manuallySetImageRef.current = relatedImage._id;
    
    // CRITICAL: Clear previous image reference IMMEDIATELY when clicking related image
    // This must happen before anything else to prevent flash
    previousImageSrcRef.current = null;
    previousImageSrcImageIdRef.current = null;
    
    // OPTIMIZATION: Like Unsplash - navigate immediately, don't wait for preload
    // Image is already preloaded on hover, so it should be ready
    
    // Lock scroll position to prevent layout shift
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.style.overflow = 'hidden';
    }

    // Calculate and set container height for new image (before navigation)
    // This prevents layout shift when new image loads
    if (relatedImage.width && relatedImage.height && imageContainerRef.current) {
      const containerWidth = imageContainerRef.current.offsetWidth || imageContainerRef.current.clientWidth || 1400;
      const aspectRatio = relatedImage.width / relatedImage.height;
      const calculatedHeight = containerWidth / aspectRatio;
      const maxHeight = Math.min(calculatedHeight, window.innerHeight - 180);
      const newHeight = Math.max(300, maxHeight);
      containerHeightRef.current = newHeight;
    }

    // Check if image is already preloaded (from hover) FIRST
    // This determines whether we should save previous image or not
    const regular = getRegularDisplayUrl(relatedImage);
    const original = getOriginalDisplayUrl(relatedImage);
    const wasPreloaded = regular && (loadedImages.has(regular) || loadedImages.has(original) || imageLoadedMapRef.current.get(relatedImage._id) === true);
    
    if (wasPreloaded) {
      // Image was preloaded on hover, mark as loaded
      imageLoadedMapRef.current.set(relatedImage._id, true);
    }

    // CRITICAL: Update imageSrcImageIdRef immediately to prevent render logic from showing old image
    // This must happen BEFORE clearing/saving previous to ensure render knows we're on new image
    imageSrcImageIdRef.current = relatedImage._id;
    
    // CRITICAL: Never save previous image when clicking related images
    // We already cleared it above - keep it cleared to prevent any flash
    // The previous image logic is only for keyboard navigation, not related image clicks
    
    // If preloaded, also update imageSrc immediately to prevent flash
    if (wasPreloaded && regular) {
      setImageSrc(regular);
      setImageLoaded(true);
    } else {
      // Reset imageLoaded to false BEFORE navigating
      // This ensures previous image stays visible during transition
      // The previous image will be shown until new image is ready
      setImageLoaded(false);
    }
    
    const newSlug = generateImageSlug(relatedImage.imageTitle || '', relatedImage._id);

    const currentState = locationWithState.state || {};
    const background = locationWithState.state?.background || {
      pathname: locationWithState.pathname,
      search: locationWithState.search,
      hash: locationWithState.hash,
      state: locationWithState.state,
      key: locationWithState.key,
    };

    const navigationState = {
      ...currentState,
      background,
      inlineModal: true,
      // CRITICAL: Pass full images array, not relatedImages
      // relatedImages is filtered (excludes current image), so using it would shrink the array each click
      // Pass images array (which should contain all images including the new one)
      images: images.length > 0 ? images : relatedImages, // Fallback to relatedImages if images is empty
      image: relatedImage,
      fromGrid: false,
    };

    setModalActive();

    // Navigate immediately (like Unsplash) - no await preload
    // Image should already be preloaded from hover
    navigate(`/photos/${newSlug}`, {
      replace: true,
      state: navigationState,
    });
    
    // Clear flag after a short delay to allow render to complete
    // This ensures the flag is set during the critical render phase
    setTimeout(() => {
      setIsClickingRelatedImage(false);
    }, 100);
  }, [navigate, locationWithState, relatedImages, image, imageSrc, imageLoaded, getRegularDisplayUrl]);

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


  // Loading state - check AFTER all hooks are called
  if (loading) {
    return (
      <>
        <Header />
        <div className="image-page-loading">
          <div className="loading-spinner" />
          <p>{t('imagePage.loading')}</p>
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

          setTimeout(() => {
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
            <div className="image-modal-author-title">{image.imageTitle || t('imagePage.topInfo')}</div>
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

          {/* Add to Collection button with dropdown */}
          {user && (
            <div className="image-modal-collection-menu-wrapper" data-collection-menu>
              <button
                onClick={() => setShowCollectionModal(!showCollectionModal)}
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
              // Lock container height to prevent layout shift
              // Use fixed height from containerHeightRef or calculate from image dimensions
              height: containerHeightRef.current 
                ? `${containerHeightRef.current}px` 
                : (image.width && image.height 
                  ? (() => {
                      // Calculate height from image aspect ratio
                      const containerWidth = 1400; // Default container width
                      const aspectRatio = image.width / image.height;
                      const calculatedHeight = containerWidth / aspectRatio;
                      const maxHeight = Math.min(calculatedHeight, window.innerHeight - 180);
                      return `${Math.max(300, maxHeight)}px`;
                    })()
                  : '400px'),
              minHeight: containerHeightRef.current 
                ? `${containerHeightRef.current}px` 
                : (image.width && image.height 
                  ? (() => {
                      const containerWidth = 1400;
                      const aspectRatio = image.width / image.height;
                      const calculatedHeight = containerWidth / aspectRatio;
                      const maxHeight = Math.min(calculatedHeight, window.innerHeight - 180);
                      return `${Math.max(300, maxHeight)}px`;
                    })()
                  : '400px'),
              maxHeight: containerHeightRef.current 
                ? `${containerHeightRef.current}px` 
                : (image.width && image.height 
                  ? (() => {
                      const containerWidth = 1400;
                      const aspectRatio = image.width / image.height;
                      const calculatedHeight = containerWidth / aspectRatio;
                      const maxHeight = Math.min(calculatedHeight, window.innerHeight - 180);
                      return `${Math.max(300, maxHeight)}px`;
                    })()
                  : '400px'),
              // Unsplash-style: background color with dominant color
              backgroundColor: (image as any).dominantColor || '#f3f4f6',
              overflow: 'hidden',
            }}
          >
            {/* Simplified: Single image with background (like Unsplash) */}
            {/* Render both previous and current images to prevent flash */}
            {/* Render previous image if available and we're changing */}
            {/* Render current image */}
            {/* Always render image directly from image object (like Unsplash) */}
            {image && (() => {
              // Always use getRegularDisplayUrl directly, don't wait for imageSrc state
              const src = getRegularDisplayUrl(image) || getOriginalDisplayUrl(image);
              
              // Only render if we have a valid src
              if (!src) return null;
              
              // CRITICAL: Determine if this is the current image
              // Check both the ref AND the image prop to handle navigation timing issues
              // When navigating, the image prop updates immediately but refs might lag
              const isCurrentImage = imageSrcImageIdRef.current === image._id;
              
              // CRITICAL: If image prop doesn't match previous image ID, this is a new image
              // Even if refs haven't updated yet, we should treat it as current
              // This handles the navigation timing issue where image state updates before refs
              const isNewImageFromNavigation = previousImageSrcImageIdRef.current && 
                previousImageSrcImageIdRef.current !== image._id &&
                imageSrcImageIdRef.current !== image._id;
              
              // Use imageLoaded state for current image, or check map for others
              // Also check if image was preloaded (for instant display)
              const regular = getRegularDisplayUrl(image);
              const original = getOriginalDisplayUrl(image);
              // Check multiple sources: loadedImages set and imageLoadedMap
              const inLoadedSet = loadedImages.has(regular) || loadedImages.has(original);
              const inLoadedMap = imageLoadedMapRef.current.get(image._id) === true;
              // Also check if the image element itself is already loaded (for current image)
              // This handles the case where the image was loaded in a previous render
              const imgElementLoaded = isCurrentImage && imgElementRef.current && 
                imgElementRef.current.complete && 
                imgElementRef.current.naturalWidth > 0 &&
                imgElementRef.current.naturalHeight > 0;
              const wasPreloaded = inLoadedSet || inLoadedMap || imgElementLoaded;
              
              // CRITICAL: Show image if:
              // 1. It's the current image AND (imageLoaded is true OR image is preloaded)
              // 2. OR it's a new image from navigation that's preloaded (handles timing issue)
              // 3. OR it's not the current image but it's loaded/preloaded
              // This ensures preloaded images show immediately without waiting for imageLoaded state
              const shouldShow = isCurrentImage 
                ? (imageLoaded || wasPreloaded)  // Show if loaded OR preloaded
                : isNewImageFromNavigation && wasPreloaded  // New image from nav that's preloaded
                ? true  // Show immediately
                : (imageLoadedMapRef.current.get(image._id) === true || wasPreloaded);
              
              // Determine if previous image should be visible
              // CRITICAL: Check the image PROP directly, not just refs
              // When React Router navigates, the image prop updates immediately
              // This is the source of truth - use it to prevent flash
              const imagePropChanged = previousImageSrcImageIdRef.current && 
                previousImageSrcImageIdRef.current !== image._id;
              
              // CRITICAL: If image prop changed (new image from navigation), be very aggressive
              // If the new image is preloaded OR if imageSrcImageIdRef was updated (meaning we clicked it),
              // NEVER show the previous image
              // This handles the case where navigation happened but refs haven't fully updated
              const isNavigatingToNewImage = imagePropChanged && 
                (imageSrcImageIdRef.current === image._id || isNewImageFromNavigation);
              
              // CRITICAL: Don't show previous if new image is ready
              // Check multiple conditions to ensure new image is truly not ready
              // If new image is preloaded OR loaded, never show previous
              const newImageReady = shouldShow || wasPreloaded || imageLoaded;
              const isNewImageReady = isNewImageFromNavigation && wasPreloaded;
              
              // NEVER show previous image if:
              // 1. Previous image doesn't exist (was cleared)
              // 2. Image prop didn't change (still showing same image)
              // 3. We're clicking a related image (flag is set)
              // 4. We're navigating to a new image (image prop changed AND refs updated)
              // 5. New image is ready (preloaded or loaded)
              // 6. OR it's a new image from navigation that's preloaded
              // 7. OR imageSrcImageIdRef matches current image (we clicked this image)
              // KEY: Be very aggressive - if clicking related image, NEVER show previous
              const isClickingThisImage = imageSrcImageIdRef.current === image._id;
              const isClickingRelated = isClickingRelatedImage;
              
              // CRITICAL: If clicking related image, NEVER show previous - show new image directly
              // This prevents any flash of old image
              // Check this FIRST before all other conditions
              const shouldShowPrevious = !isClickingRelated &&  // NEVER show previous when clicking related image
                previousImageSrcRef.current && 
                imagePropChanged &&  // Image prop changed (new image from navigation)
                !isNavigatingToNewImage &&  // NOT navigating to new image (refs updated)
                !isClickingThisImage &&  // NOT clicking this image (refs match = we clicked it)
                !newImageReady &&  // Only show previous if new image is definitely not ready
                !isNewImageReady;  // Never show previous if new image from nav is ready
              
              return (
                <>
                  {/* Render previous image ONLY if new image is not ready AND we're not clicking a related image */}
                  {/* CRITICAL: Never render previous image when clicking related images - this prevents flash */}
                  {/* Use display: none in CSS to completely remove from layout, not just opacity */}
                  {shouldShowPrevious && !isClickingRelated && (
                    <img
                      key={`image-previous-${previousImageSrcImageIdRef.current}`}
                      src={previousImageSrcRef.current!}
                      alt={image.imageTitle || t('image.photo')}
                      className="image-modal-image"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: 1,
                        transition: 'opacity 0.15s ease-out',
                        zIndex: 1,
                        pointerEvents: 'none',
                      }}
                      draggable={false}
                    />
                  )}
                  {/* Render current image */}
                  <img
                    key={`image-${image._id}`}
                    ref={isCurrentImage ? imgElementRef : null}
                    src={src}
                    alt={image.imageTitle || t('image.photo')}
                    className="image-modal-image"
                    style={{
                      opacity: shouldShow ? 1 : 0,
                      // Disable transition when changing images OR when image is preloaded to prevent fade animation
                      // If preloaded, show immediately without transition
                      transition: (isImageChanging || wasPreloaded) ? 'none' : 'opacity 0.2s ease-in-out',
                      position: 'relative',
                      zIndex: 2,
                    }}
                    draggable={false}
                    onContextMenu={() => {
                      // Don't prevent default - let browser show native context menu
                      // Browser will automatically show "Open image in new tab" option
                      // No need to prevent default or handle manually
                    }}
                    onLoad={(e) => {
                    const imgEl = e.currentTarget;
                    // Update container height when image loads
                    if (imageContainerRef.current) {
                      requestAnimationFrame(() => {
                        if (imageContainerRef.current) {
                          const actualHeight = imageContainerRef.current.offsetHeight;
                          if (actualHeight > 0) {
                            containerHeightRef.current = actualHeight;
                          }
                        }
                      });
                    }
                    
                    // Set loaded state after decode (only for current image)
                    if (isCurrentImage) {
                      if (imgEl.decode) {
                        imgEl.decode()
                          .then(() => {
                            // Mark this image as loaded in the map
                            if (imageSrcImageIdRef.current) {
                              imageLoadedMapRef.current.set(imageSrcImageIdRef.current, true);
                            }
                            setImageLoaded(true);
                          })
                          .catch(() => {
                            if (imageSrcImageIdRef.current) {
                              imageLoadedMapRef.current.set(imageSrcImageIdRef.current, true);
                            }
                            setImageLoaded(true);
                          });
                      } else {
                        if (imageSrcImageIdRef.current) {
                          imageLoadedMapRef.current.set(imageSrcImageIdRef.current, true);
                        }
                        setImageLoaded(true);
                      }
                    } else {
                      // Mark as loaded in map even if not current image
                      imageLoadedMapRef.current.set(image._id, true);
                    }
                  }}
                  onError={(e) => {
                    console.error('[ImagePage] Image error:', e.currentTarget.src);
                    if (isCurrentImage) {
                      setImageLoaded(false);
                    }
                  }}
                />
                </>
              );
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
              onImageClick={handleRelatedImageClick}
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
