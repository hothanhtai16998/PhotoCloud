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
import { Skeleton } from '@/components/ui/skeleton';
import { ImageModalInfo } from '@/components/image/ImageModalInfo';
import { preloadImage, preloadImageWithProgress, loadedImages } from '@/components/NoFlashGrid/utils/imagePreloader';
import { ImageProgressBar } from '@/components/NoFlashGrid/components/ImageProgressBar';
import { NoFlashGrid } from '@/components/NoFlashGrid';
import { validateModalState, clearModalActive, restoreScrollPosition, setModalActive } from '@/utils/modalNavigation';
import { getBestImageUrl } from '@/utils/avifSupport';
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

  // Core state
  const [image, setImage] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const isImageChangingRef = useRef(false);
  const topInfoRef = useRef<HTMLDivElement>(null);
  const authorAreaRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);
  const previousImgRef = useRef<Image | null>(null);
  const frontImageLoadedRef = useRef<boolean>(false);
  const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);
  // Track container height to maintain it during transitions
  const containerHeightRef = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Check if this is a refresh using unified utility (unused but kept for future use)
  // const isRefresh = useMemo(() => {
  //   return isPageRefresh();
  // }, []);

  // Validate modal state using unified utility
  // Use locationWithState (actual location) not background location
  const modalValidation = useMemo(() => {
    return validateModalState(locationWithState.state);
  }, [locationWithState.state]);

  // Modal-style logic: show modal-style when validated modal state exists
  // - On mobile → always regular page
  // - Valid modal state → modal-style
  // NOTE: Don't check isRefresh here - it's cached from initial load and causes issues
  // Instead, rely on modalValidation.isModal which correctly handles refresh scenarios
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
  

  // Helper to check if image is in browser cache synchronously
  const checkBrowserCache = useCallback((url: string): boolean => {
    if (!url || typeof window === 'undefined') return false;
    try {
      const testImg = new Image();
      testImg.src = url;
      // If image loads synchronously (complete = true immediately), it's cached
      if (testImg.complete && testImg.naturalWidth > 0) {
        // Add to loadedImages cache for future checks
        loadedImages.add(url);
        return true;
      }
    } catch {
      // Ignore errors in cache check
    }
    return false;
  }, []);

  // Image loading state (matching NoFlashGrid ImageModal)
  const calculateInitialState = useCallback((img: Image) => {
    if (!img) return { src: null, isFullQuality: false };
    
    const regular = img.regularUrl || '';
    const original = img.imageUrl || '';
    const base64Placeholder = img.base64Thumbnail || null;
    
    // Check both in-memory cache and browser cache for regularUrl
    const isRegularCached = regular && (loadedImages.has(regular) || checkBrowserCache(regular));
    
    // Check both in-memory cache and browser cache for imageUrl
    const isOriginalCached = original && (loadedImages.has(original) || checkBrowserCache(original));
    
    // Priority order for initial placeholder (ONLY use aspect-ratio-preserving sources):
    // Strategy: Prefer higher quality sources to reduce flashing from quality upgrades
    // 1. regularUrl if cached (preserves aspect ratio, already loaded - no flash)
    // 2. imageUrl if cached (original, already loaded - no flash)
    // 3. regularUrl if available (preserves aspect ratio, will load - better than base64)
    // 4. imageUrl if available (original, will load - better than base64)
    // 5. base64Thumbnail as last resort (very small, blurry, but instant)
    // SKIP: thumbnailUrl (200x200 square/cropped with fit: 'cover') - causes flash
    // SKIP: smallUrl (500x500 square/cropped with fit: 'cover') - also causes flash
    
    // If regularUrl or imageUrl is cached (in memory or browser), use it directly to prevent flash
    if (isRegularCached && regular) {
      return {
        src: regular,
        isFullQuality: true, // It's the regular size, which is good quality
        isBase64: false
      };
    }
    
    if (isOriginalCached && original) {
      return {
        src: original,
        isFullQuality: true, // It's the original, full quality
        isBase64: false
      };
    }
    
    // Prefer regularUrl/imageUrl over base64 to reduce flashing
    // Base64 is very small (20x20) and blurry, so showing regularUrl directly
    // (even if it needs to load) is better than base64 -> regularUrl transition
    if (regular) {
      return {
        src: regular,
        isFullQuality: false, // Will upgrade to original later
        isBase64: false
      };
    }
    
    if (original) {
      return {
        src: original,
        isFullQuality: true,
        isBase64: false
      };
    }
    
    // Last resort: use base64 if nothing else is available
    return {
      src: base64Placeholder || '',
      isFullQuality: false,
      isBase64: !!base64Placeholder
    };
  }, [checkBrowserCache]);

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
        const passedImages = initialLocationStateRef.current?.images as Image[] | undefined;
        if (passedImages && passedImages.length > 0) {
          const foundImage = passedImages.find(img => {
            const imgShortId = img._id.slice(-12);
            return imgShortId === imageId;
          });

          if (foundImage) {
            setImage(foundImage);
            setImages(passedImages);
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
      // This prevents bottom bar from jumping
      if (imageContainerRef.current) {
        const currentHeight = imageContainerRef.current.offsetHeight;
        if (currentHeight > 0) {
          containerHeightRef.current = currentHeight;
        } else {
          // If no current height, calculate initial height from new image dimensions
          const initialHeight = calculateInitialHeight(image);
          if (initialHeight) {
            containerHeightRef.current = initialHeight;
          }
        }
      } else {
        // Container not mounted yet, calculate initial height
        const initialHeight = calculateInitialHeight(image);
        if (initialHeight) {
          containerHeightRef.current = initialHeight;
        }
      }
      // Don't clear backSrc immediately - let it stay until new one is ready
    }

    // Reset scroll to top when image changes
    // CRITICAL: Delay scroll reset to prevent interfering with image transition
    // This ensures old image stays visible until new one is ready
    if (imageChanged) {
      // Set flag to prevent scroll handler from interfering
      isImageChangingRef.current = true;
      setIsImageChanging(true);
      
      // Immediately reset states to prevent layout shifts
      // Reset isScrolled immediately to prevent margin jump (no animation)
      setIsScrolled(false);
      setShouldAnimate(false);
      
      scrollPosRef.current = 0;
      // Delay scroll reset to avoid triggering re-renders during image loading
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
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

        // After base64 loads (only if we actually used base64), upgrade to regularUrl
        // Skip thumbnailUrl and smallUrl (both are square/cropped) to prevent flash
        // Note: With new logic, we rarely start with base64 (only if regularUrl/imageUrl don't exist)
        const networkUpgrade = image.regularUrl || image.imageUrl || '';
        if (networkUpgrade && networkUpgrade !== newBackSrc) {
          // Use skipDecode=false to ensure smooth transition (prevents flash)
          preloadImage(networkUpgrade, false)
            .then((src) => {
              if (previousImgRef.current?._id === currentImageId) {
                // Only update if we're still on base64 (avoid unnecessary updates)
                if (backSrcRef.current === newBackSrc) {
                  backSrcRef.current = src;
                  setBackSrc(src);
                  previousBackSrcRef.current = src;
                }
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
          // Use skipDecode=false to ensure image is fully decoded before showing (prevents flash)
          preloadImage(newBackSrc, false)
            .then((src) => {
              if (previousImgRef.current?._id === currentImageId) {
                // CRITICAL: previousBackSrcRef already set above when imageChanged
                // Keep old image visible until new one is loaded and decoded
                // Use double RAF to ensure smooth transition
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    if (previousImgRef.current?._id === currentImageId) {
                      backSrcRef.current = src;
                      setBackSrc(src);
                      // Update previous after new image is confirmed loaded and visible
                      previousBackSrcRef.current = src;
                      previousBackSrcImageIdRef.current = currentImageId;
                      if (!frontImageLoadedRef.current) {
                        setFrontSrc(null);
                      }
                    }
                  });
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

      // Get AVIF URLs if supported
      const bestRegular = await getBestImageUrl(image, 'regular');
      const bestOriginal = await getBestImageUrl(image, 'original');
      const regularToLoad = bestRegular || regular;
      const originalToLoad = bestOriginal || original;

      if (regularToLoad) {
        try {
          if (loadedImages.has(regularToLoad)) {
            // Already cached - no progress needed
            isLoadingRef.current = false;
            setShowProgressBar(false);
            if (previousImgRef.current?._id === currentImageId) {
              setFrontSrc(regularToLoad);
              setFrontLoaded(true);
              frontImageLoadedRef.current = true;
              loadedAny = true;
            }
          } else {
            // Preload regular (AVIF) with progress tracking
            currentLoadingUrlRef.current = regularToLoad;
            // Ensure progress bar is visible before starting
            setShowProgressBar(true);
            const src = await preloadImageWithProgress(
              regularToLoad,
              (progress) => {
                if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === regularToLoad) {
                  setImageProgress(progress);
                  // Keep progress bar visible while loading - use ref to ensure it stays visible
                  if (isLoadingRef.current) {
                    setShowProgressBar(true);
                  }
                }
              },
              false
            );
            if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === regularToLoad) {
              setFrontSrc(src);
              if (!originalToLoad || originalToLoad === regularToLoad) {
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

      if (originalToLoad && originalToLoad !== regularToLoad) {
        try {
          // Reset progress for original (starts from 0 or continue from regular)
          if (!loadedAny) {
            setImageProgress(0);
          }

          // Preload original (AVIF) with progress tracking
          currentLoadingUrlRef.current = originalToLoad;
          // Ensure progress bar is visible before starting
          setShowProgressBar(true);
          const src = await preloadImageWithProgress(
            originalToLoad,
            (progress) => {
              if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === originalToLoad) {
                setImageProgress(progress);
                // Keep progress bar visible while loading - use ref to ensure it stays visible
                if (isLoadingRef.current) {
                  setShowProgressBar(true);
                }
              }
            },
            false
          );
          if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === originalToLoad) {
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
        if (target) {
          setFrontSrc(target);
          setFrontLoaded(true);
          frontImageLoadedRef.current = true;
        }
      }
    };

    loadFrontImage();
  }, [image, calculateInitialState]);

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

    // CRITICAL: Set modal active flag when navigating to another image
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

  // Handle related image click
  const handleRelatedImageClick = useCallback((relatedImage: Image, _index: number) => {
    handleImageSelect(relatedImage);
    // Scroll to top when clicking related image
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      });
    });
  }, [handleImageSelect]);

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


  // CRITICAL: Hook must be called BEFORE early returns (Rules of Hooks)
  const prevShowModalStyleRef = useRef(showModalStyle);
  prevShowModalStyleRef.current = showModalStyle;

  // Loading state - check AFTER all hooks are called
  // Use skeleton instead of spinner to avoid duplicate loading states
  if (loading) {
    return (
      <>
        <Header />
        <div className="image-page-loading">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-64 w-full max-w-4xl" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
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
              // Use saved height if available, otherwise calculate from image dimensions
              minHeight: containerHeightRef.current 
                ? `${containerHeightRef.current}px` 
                : (() => {
                    const initialHeight = calculateInitialHeight(image);
                    return initialHeight ? `${initialHeight}px` : '400px'; // Fallback to 400px
                  })(),
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
              // Fallback: use aspect-ratio-preserving sources only (skip square thumbnails)
              const backImageSrc = backSrc || (canUsePrevious ? previousBackSrcRef.current : null) ||
                image.regularUrl || image.imageUrl || '';

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
                  alt={image.imageTitle || t('image.photo')}
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
                      // Wait for layout to settle, then capture the actual rendered height
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          if (imageContainerRef.current) {
                            const actualHeight = imageContainerRef.current.offsetHeight;
                            if (actualHeight > 0) {
                              containerHeightRef.current = actualHeight;
                            }
                          }
                        });
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
                  alt={image.imageTitle || t('image.photo')}
                  className={`image-modal-front-image ${frontLoaded ? 'loaded' : ''}`}
                  draggable={false}
                  onLoad={(e) => {
                    const imgEl = e.currentTarget;
                    // CRITICAL: Update container height when front image loads and changes position
                    // This ensures bottom bar stays in correct position when image goes from absolute to relative
                    if (imageContainerRef.current) {
                      // Wait for position change (absolute -> relative) to complete, then capture height
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          // Check again after frontLoaded state updates (which triggers position change)
                          setTimeout(() => {
                            if (imageContainerRef.current) {
                              const actualHeight = imageContainerRef.current.offsetHeight;
                              if (actualHeight > 0) {
                                containerHeightRef.current = actualHeight;
                              }
                            }
                          }, 0);
                        });
                      });
                    }
                    
                    if (imgEl.decode) {
                      imgEl.decode().then(() => {
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            setFrontLoaded(true);
                            // Update height again after frontLoaded state change (position change)
                            if (imageContainerRef.current) {
                              requestAnimationFrame(() => {
                                const actualHeight = imageContainerRef.current?.offsetHeight;
                                if (actualHeight && actualHeight > 0) {
                                  containerHeightRef.current = actualHeight;
                                }
                              });
                            }
                          });
                        });
                      }).catch(() => {
                        requestAnimationFrame(() => {
                          setFrontLoaded(true);
                          if (imageContainerRef.current) {
                            requestAnimationFrame(() => {
                              const actualHeight = imageContainerRef.current?.offsetHeight;
                              if (actualHeight && actualHeight > 0) {
                                containerHeightRef.current = actualHeight;
                              }
                            });
                          }
                        });
                      });
                    } else {
                      requestAnimationFrame(() => {
                        setFrontLoaded(true);
                        if (imageContainerRef.current) {
                          requestAnimationFrame(() => {
                            const actualHeight = imageContainerRef.current?.offsetHeight;
                            if (actualHeight && actualHeight > 0) {
                              containerHeightRef.current = actualHeight;
                            }
                          });
                        }
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
              // Fallback: use aspect-ratio-preserving sources only (skip square thumbnails)
              const fallbackSrc = image.regularUrl || image.imageUrl || '';
              const shouldRenderFallback = !backSrc && !frontSrc && !!fallbackSrc;
              return shouldRenderFallback ? (
                <img
                  key={`fallback-${image._id}`}
                  src={fallbackSrc}
                  alt={image.imageTitle || t('image.photo')}
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

      {/* Related images section */}
      {relatedImages.length > 0 && (
        <div className="image-modal-related-section" style={{ padding: '32px 16px', background: '#fff' }}>
          <div style={{ maxWidth: '1296px', margin: '0 auto', width: '100%' }}>
            <h2 className="image-modal-related-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: '#111' }}>
              {t('image.relatedImages')}
            </h2>
            <NoFlashGrid
              images={relatedImages}
              loading={false}
              onImageClick={handleRelatedImageClick}
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
        // Regular page: Wrapper with sidebar
        <div className="image-page">
          <ImagePageSidebar />
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
