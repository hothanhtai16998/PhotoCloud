import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { imageService } from "@/services/imageService";
import type { Image } from "@/types/image";
import { sliderConfig, type TransitionType } from "@/config/sliderConfig";
import "./Slider.css";

// Date-based randomization: same images per day
function getDailyRandomImages(images: Image[], count: number): Image[] {
  // Use date as seed for consistent daily selection
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // Simple hash function to convert date string to number
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = ((seed << 5) - seed) + dateString.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }

  // Shuffle array using seed
  const shuffled = [...images];
  let random = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    random = (random * 9301 + 49297) % 233280; // Linear congruential generator
    const j = Math.floor((random / 233280) * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }

  return shuffled.slice(0, count);
}

const TRANSITION_STORAGE_KEY = 'slider-transition-type';

function Slider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [transitionType, setTransitionType] = useState<TransitionType>(() => {
    // Load from localStorage or use default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TRANSITION_STORAGE_KEY);
      if (saved && sliderConfig.transition.availableTypes.includes(saved as TransitionType)) {
        return saved as TransitionType;
      }
    }
    return sliderConfig.transition.defaultType;
  });
  const [showTransitionMenu, setShowTransitionMenu] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [imageLoadStates, setImageLoadStates] = useState<Map<string, 'loading' | 'loaded' | 'error'>>(new Map());
  // Ref to track cached images synchronously (prevents flash on refresh)
  const cachedImagesRef = useRef<Set<string>>(new Set());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const transitionMenuRef = useRef<HTMLDivElement>(null);
  const autoPlayIntervalRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const progressStartTimeRef = useRef<number | null>(null);
  const pausedProgressRef = useRef<number>(0);
  const isAutoPlayChangeRef = useRef<boolean>(false);
  const nextSlideRef = useRef<(() => void) | undefined>(undefined);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const autoPlayTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optimized: Fetch only enough images for randomization (2-3x imageCount)
  // This avoids fetching hundreds/thousands of images when we only need 10-15
  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);

      // Create abort controller for cleanup
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const { imageCount, apiLimit } = sliderConfig;

        // Fetch only enough images for randomization (2-3x what we need)
        // This ensures we have variety while minimizing network requests
        const fetchCount = Math.max(imageCount * 3, 30); // At least 30 images, or 3x imageCount
        const pagesNeeded = Math.ceil(fetchCount / apiLimit);

        const allImages: Image[] = [];

        // Fetch only the pages we need
        for (let page = 1; page <= pagesNeeded; page++) {
          // Check if component was unmounted
          if (signal.aborted) {
            return;
          }

          const response = await imageService.fetchImages({
            limit: apiLimit,
            page: page,
          });

          if (response.images && response.images.length > 0) {
            allImages.push(...response.images);

            // If we have enough images, stop fetching
            if (allImages.length >= fetchCount) {
              break;
            }

            // If this is the last page, stop
            if (response.pagination && page >= response.pagination.pages) {
              break;
            }
          } else {
            break;
          }
        }

        // Check if component was unmounted before setting state
        if (signal.aborted) {
          return;
        }

        if (allImages.length > 0) {
          // Get random images for today from the fetched subset
          const dailyImages = getDailyRandomImages(allImages, imageCount);
          setImages(dailyImages);
        } else {
          setImages([]);
        }
      } catch (error) {
        // Don't log error if it's an abort
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Error fetching images:", error);
        }
        if (!signal.aborted) {
          setImages([]);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchImages();

    // Cleanup: abort fetch if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || images.length === 0) return;

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current !== null) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    setIsTransitioning(true);
    setCurrentSlide(index % images.length);

    // Track timeout for cleanup
    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, sliderConfig.transition.durationMs);
  }, [isTransitioning, images.length]);

  const nextSlide = useCallback(() => {
    if (images.length === 0) return;
    setSlideDirection('right');
    goToSlide((currentSlide + 1) % images.length);
  }, [currentSlide, goToSlide, images.length]);

  // Keep ref updated with latest nextSlide
  useEffect(() => {
    nextSlideRef.current = nextSlide;
  }, [nextSlide]);

  const prevSlide = useCallback(() => {
    if (images.length === 0) return;
    setSlideDirection('left');
    goToSlide((currentSlide - 1 + images.length) % images.length);
  }, [currentSlide, goToSlide, images.length]);

  // Auto-play carousel (6.2 seconds interval) - pauses on hover, with progress bar
  useEffect(() => {
    if (images.length === 0) {
      // Clear intervals if no images
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // If hovering, pause (save current progress and stop intervals)
    if (isHovered) {
      // Save current progress before pausing
      if (progressStartTimeRef.current !== null) {
        const elapsed = Date.now() - progressStartTimeRef.current;
        const { intervalMs } = sliderConfig.autoPlay;
        pausedProgressRef.current = Math.min((elapsed / intervalMs) * 100, 100);
      }
      // Pause intervals
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // Resume/Start intervals when not hovering
    // Clear any existing intervals first
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Calculate start time based on paused progress (if resuming) or start fresh
    const startProgress = pausedProgressRef.current;
    const { intervalMs, progressUpdateIntervalMs } = sliderConfig.autoPlay;
    const startTime = Date.now() - (startProgress / 100) * intervalMs;
    progressStartTimeRef.current = startTime;

    // Progress bar animation - synchronized with auto-play
    // Update every 16ms for smoother animation (60fps)
    progressIntervalRef.current = window.setInterval(() => {
      // If progressStartTimeRef is null, don't update (but don't stop the interval)
      if (progressStartTimeRef.current === null) {
        // Keep the current progress value, don't update
        return;
      }
      const elapsed = Date.now() - progressStartTimeRef.current;
      const progress = Math.min((elapsed / intervalMs) * 100, 100);
      setAutoPlayProgress(progress);
    }, progressUpdateIntervalMs); // Update every 16ms (~60fps) for smooth animation

    // Auto-play interval - change slide at configured interval
    // Calculate delay based on remaining time if resuming from pause
    const remainingTime = intervalMs - (startProgress / 100) * intervalMs;

    const scheduleNextSlide = () => {
      setAutoPlayProgress(100); // Ensure it reaches 100% before changing
      isAutoPlayChangeRef.current = true; // Mark as auto-play change
      if (nextSlideRef.current) {
        nextSlideRef.current();
      }
      // Start progress timer immediately (synchronously)
      // The useEffect that resets progress will be skipped because isAutoPlayChangeRef is true
      setAutoPlayProgress(0);
      pausedProgressRef.current = 0;
      // Update progressStartTimeRef immediately so the interval can use it
      progressStartTimeRef.current = Date.now();
      // Reset the flag after ensuring the useEffect has checked it
      // Use a longer timeout to ensure the useEffect runs first
      // Clear any existing timeout first
      if (autoPlayTimeoutRef.current !== null) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
      autoPlayTimeoutRef.current = window.setTimeout(() => {
        isAutoPlayChangeRef.current = false;
        autoPlayTimeoutRef.current = null;
      }, 10);
    };

    if (startProgress > 0) {
      // Resume from pause - use setTimeout for the first slide change
      // Clear any existing timeout first
      if (autoPlayTimeoutRef.current !== null) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
      autoPlayTimeoutRef.current = window.setTimeout(() => {
        scheduleNextSlide();
        autoPlayTimeoutRef.current = null;
        // Then set up the regular interval
        autoPlayIntervalRef.current = window.setInterval(scheduleNextSlide, intervalMs);
      }, remainingTime);
    } else {
      // Start fresh - use regular interval
      autoPlayIntervalRef.current = window.setInterval(scheduleNextSlide, intervalMs);
    }

    return () => {
      // Cleanup all timers
      if (autoPlayTimeoutRef.current !== null) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      // Reset refs
      progressStartTimeRef.current = null;
      pausedProgressRef.current = 0;
    };
  }, [images.length, isHovered]);

  // Reset progress when slide changes manually (not from auto-play)
  useEffect(() => {
    // Check if it's an auto-play change - if so, don't reset
    // The flag is set synchronously in scheduleNextSlide, so we check it immediately
    if (isAutoPlayChangeRef.current) {
      // It's an auto-play change, scheduleNextSlide will handle the reset
      return;
    }
    // Manual change - reset progress
    setAutoPlayProgress(0);
    pausedProgressRef.current = 0;
    progressStartTimeRef.current = null;
  }, [currentSlide]);


  // Keyboard navigation - Arrow keys, Home, End
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "Home") goToSlide(0);
      if (e.key === "End") goToSlide(images.length - 1);
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [prevSlide, nextSlide, goToSlide, images.length]);


  // Get best image URL - prioritize full resolution for slider
  const getImageUrl = (image: Image | null): string | null => {
    if (!image) return null;
    return (
      image.imageAvifUrl ||
      image.imageUrl ||
      image.regularAvifUrl ||
      image.regularUrl ||
      image.smallUrl ||
      image.thumbnailUrl ||
      null
    );
  };

  // Get thumbnail URL for blur-up effect
  const getThumbnailForBlur = (image: Image | null): string | null => {
    if (!image) return null;
    return (
      image.thumbnailAvifUrl ||
      image.thumbnailUrl ||
      image.smallAvifUrl ||
      image.smallUrl ||
      null
    );
  };

  // Progressive image loading handler
  const handleImageLoad = useCallback((imageId: string, imageUrl: string) => {
    // Mark as loaded in both state and ref for synchronous access
    cachedImagesRef.current.add(imageId);
    setLoadedImages(prev => new Set(prev).add(imageId));
    setImageLoadStates(prev => {
      const next = new Map(prev);
      next.set(imageId, 'loaded');
      return next;
    });
  }, []);

  // Close transition menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (transitionMenuRef.current && !transitionMenuRef.current.contains(event.target as Node)) {
        setShowTransitionMenu(false);
      }
    };

    if (showTransitionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTransitionMenu]);

  // CRITICAL: Check cache synchronously when images are set (on refresh)
  // This must run before the progressive loading effect to prevent flash
  useLayoutEffect(() => {
    if (images.length === 0) return;
    
    // Batch state updates to prevent multiple re-renders
    const newLoadedImages = new Set<string>();
    const newLoadStates = new Map<string, 'loading' | 'loaded' | 'error'>();
    
    // Check if images are cached and mark as loaded immediately
    // This prevents flash on refresh
    images.forEach((image) => {
      const imageId = image._id;
      if (loadedImages.has(imageId) || cachedImagesRef.current.has(imageId)) {
        cachedImagesRef.current.add(imageId);
        newLoadedImages.add(imageId);
        newLoadStates.set(imageId, 'loaded');
        return; // Already marked as loaded
      }
      
      const imageUrl = getImageUrl(image);
      if (!imageUrl) return;
      
      // Check browser cache synchronously
      // Note: This only works reliably if the image was loaded in a previous render
      // For first-time loads, we rely on the progressive loading effect
      const img = new window.Image();
      img.src = imageUrl;
      
      // If complete is true immediately, image is cached
      // Check naturalWidth/Height to ensure it's a valid loaded image
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        cachedImagesRef.current.add(imageId);
        newLoadedImages.add(imageId);
        newLoadStates.set(imageId, 'loaded');
      }
    });
    
    // Batch update state once
    if (newLoadedImages.size > 0) {
      setLoadedImages(prev => {
        const combined = new Set(prev);
        newLoadedImages.forEach(id => combined.add(id));
        return combined;
      });
      setImageLoadStates(prev => {
        const next = new Map(prev);
        newLoadStates.forEach((state, id) => next.set(id, state));
        return next;
      });
    }
  }, [images]);

  // Preload images progressively
  useEffect(() => {
    if (!sliderConfig.loading.enableProgressiveLoading || images.length === 0) return;

    const preloadImage = (image: Image, priority: 'high' | 'low' = 'low') => {
      const imageId = image._id;
      if (loadedImages.has(imageId)) return;

      setImageLoadStates(prev => {
        const next = new Map(prev);
        if (!next.has(imageId)) {
          next.set(imageId, 'loading');
        }
        return next;
      });

      const imageUrl = getImageUrl(image);
      if (!imageUrl) return;

      const img = new window.Image();
      img.onload = () => handleImageLoad(imageId, imageUrl);
      img.onerror = () => {
        setImageLoadStates(prev => {
          const next = new Map(prev);
          next.set(imageId, 'error');
          return next;
        });
      };
      img.fetchPriority = priority;
      img.src = imageUrl;
    };

    // Load current slide with high priority
    const currentImage = images[currentSlide];
    if (currentImage) {
      preloadImage(currentImage, 'high');
    }

    // Preload next 2-3 images with low priority
    for (let i = 1; i <= 3; i++) {
      const nextIndex = (currentSlide + i) % images.length;
      const nextImage = images[nextIndex];
      if (nextImage) {
        preloadImage(nextImage, 'low');
      }
    }
  }, [currentSlide, images, loadedImages, handleImageLoad]);

  // Get current and next image for bottom carousel
  const getBottomCarouselImages = (): Image[] => {
    if (images.length === 0) return [];
    const current = images[currentSlide];
    const next = images[(currentSlide + 1) % images.length];
    return [current, next].filter((img): img is Image => img !== undefined) as Image[];
  };


  // Get thumbnail URL for bottom carousel
  const getThumbnailUrl = (image: Image | null): string | null => {
    if (!image) return null;
    return (
      image.thumbnailAvifUrl ||
      image.thumbnailUrl ||
      image.smallAvifUrl ||
      image.smallUrl ||
      image.regularAvifUrl ||
      image.regularUrl ||
      image.imageUrl ||
      null
    );
  };


  // Touch gesture handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (!e.changedTouches[0]) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Only trigger if horizontal swipe is greater than vertical (to avoid conflicts with scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextSlide(); // Swipe left = next
      } else {
        prevSlide(); // Swipe right = previous
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Preload next 2-3 images
  useEffect(() => {
    if (images.length === 0) return;

    const preloadImages = () => {
      for (let i = 1; i <= 3; i++) {
        const nextIndex = (currentSlide + i) % images.length;
        const image = images[nextIndex];
        if (!image) continue;

        const imageUrl =
          image.imageAvifUrl ||
          image.imageUrl ||
          image.regularAvifUrl ||
          image.regularUrl ||
          image.smallUrl ||
          image.thumbnailUrl ||
          null;

        if (imageUrl) {
          const img = new window.Image();
          img.src = imageUrl;
        }
      }
    };

    preloadImages();

    // No cleanup needed for image preloading
  }, [currentSlide, images]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals
      if (autoPlayIntervalRef.current !== null) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Clear all timeouts
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      if (autoPlayTimeoutRef.current !== null) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }

      // Abort any pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="tripzo-page">
        <div className="loading-state">
          <div className="skeleton-main-slide blur-up-skeleton">
            {/* Blur-up effect for skeleton */}
            <div className="skeleton-blur-layer" />
            <div className="skeleton-content" />
          </div>
          <div className="loading-text">Loading images...</div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="tripzo-page">
        <div className="loading-state">No images available</div>
      </div>
    );
  }


  return (
    <div
      className="tripzo-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Auto-play progress bar */}
      {images.length > 0 && (
        <div className="autoplay-progress" style={{ opacity: isHovered ? 0.5 : 1 }}>
          <div
            className="autoplay-progress-bar"
            style={{ width: `${autoPlayProgress}%` }}
          />
        </div>
      )}

      {/* Main Carousel */}
      <div className={`main-carousel-container transition-${transitionType} slide-direction-${slideDirection}`}>
        {images.map((image, index) => {
          const imageUrl = getImageUrl(image);
          // Use smallUrl for placeholder instead of tiny thumbnail to avoid 20x20 issue
          const placeholderUrl = image.smallAvifUrl || image.smallUrl || image.thumbnailAvifUrl || image.thumbnailUrl || null;
          const isActive = index === currentSlide;
          // CRITICAL: Check both state and ref for cached images (synchronous check)
          const isLoaded = loadedImages.has(image._id) || cachedImagesRef.current.has(image._id);
          const loadState = imageLoadStates.get(image._id) || 'loading';
          // CRITICAL: Always show blur-up if placeholder exists (ignore config to prevent flash)
          const showBlurUp = placeholderUrl && !isLoaded;

          return (
            <div
              key={image._id}
              className={`main-slide ${isActive ? "active" : ""} transition-${transitionType}`}
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {/* Blurred background layer - use placeholder if available to prevent flash */}
              {(placeholderUrl || imageUrl) && (
                <div
                  className="blur-background-layer"
                  style={{
                    backgroundImage: `url("${placeholderUrl || imageUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    // Always keep blur visible to fill empty space around contained image
                    opacity: 1,
                  }}
                />
              )}


              {/* Main image layer - separate from blurred background */}
              {imageUrl && (
                <div
                  className={`main-image-layer ${isLoaded ? 'loaded' : 'loading'}`}
                  style={{
                    backgroundImage: `url("${imageUrl}")`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    // CRITICAL: Keep main image completely hidden until loaded
                    // This prevents flash on refresh and ensures smooth transition
                    opacity: isLoaded ? 1 : 0,
                    transition: isLoaded ? 'opacity 0.5s ease-in-out' : 'none',
                    zIndex: 2,
                  }}
                />
              )}

              {/* Loading skeleton overlay - only show if no blur-up and not loaded */}
              {loadState === 'loading' && !showBlurUp && (
                <div className="slide-loading-skeleton" style={{ zIndex: 3 }} />
              )}
            </div>
          );
        })}

      </div>

      {/* Bottom Carousel */}
      <div className="bottom-carousel-container">
        <button
          className="carousel-nav-arrow carousel-nav-left bottom-nav"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="bottom-carousel">
          {getBottomCarouselImages().map((image, index) => {
            if (!image) return null;
            const thumbnailUrl = getThumbnailUrl(image);
            const slideIndex = index === 0 ? currentSlide : (currentSlide + 1) % images.length;
            const isActive = index === 0; // First thumbnail is always the current slide

            return (
              <div
                key={image._id}
                className={`bottom-slide ${isActive ? 'active-thumbnail' : ''}`}
                onClick={() => goToSlide(slideIndex)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={image.imageTitle || 'Image'}
                    className="bottom-slide-image"
                    loading="eager"
                  />
                ) : (
                  <div className="skeleton-loader" />
                )}
              </div>
            );
          })}
        </div>
        <button
          className="carousel-nav-arrow carousel-nav-right bottom-nav"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Swipe Indicators */}
      {images.length > 1 && (
        <div className="swipe-indicator">
          {images.map((_, index) => (
            <button
              key={index}
              className={`swipe-indicator-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Swipe Hint (mobile only) */}
      {images.length > 1 && (
        <div className="swipe-hint">
          <ChevronLeft size={16} className="swipe-hint-icon" />
          <span>Swipe to navigate</span>
          <ChevronRight size={16} className="swipe-hint-icon" />
        </div>
      )}
    </div>
  );
}

export default Slider;
