import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { imageService } from "@/services/imageService";
import type { Image } from "@/types/image";
import { sliderConfig, type TransitionType } from "@/config/sliderConfig";
import "./Slider.css";

// Date-based randomization: same images per day
function getDailyRandomImages(images: Image[], count: number): Image[] {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // Simple hash function to convert date string to number
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = ((seed << 5) - seed) + dateString.charCodeAt(i);
    seed = seed & 0xffffffff; // Convert to 32bit integer
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

// Helper to get image URL with fallback priority
function getImageUrl(image: Image | null, preferThumbnail = false): string | null {
  if (!image) return null;
  
  if (preferThumbnail) {
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
  }
  
  return (
    image.imageAvifUrl ||
    image.imageUrl ||
    image.regularAvifUrl ||
    image.regularUrl ||
    image.smallUrl ||
    image.thumbnailUrl ||
    null
  );
}

// Helper to clear timer refs
function clearTimerRef(ref: React.MutableRefObject<number | null>) {
  if (ref.current !== null) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

function clearIntervalRef(ref: React.MutableRefObject<number | null>) {
  if (ref.current !== null) {
    clearInterval(ref.current);
    ref.current = null;
  }
}

const TRANSITION_STORAGE_KEY = 'slider-transition-type';

function Slider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [transitionType] = useState<TransitionType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TRANSITION_STORAGE_KEY);
      if (saved && sliderConfig.transition.availableTypes.includes(saved as TransitionType)) {
        return saved as TransitionType;
      }
    }
    return sliderConfig.transition.defaultType;
  });
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  
  // Consolidated image loading state (single source of truth)
  const imageLoadStateRef = useRef<Map<string, 'loading' | 'loaded' | 'error'>>(new Map());
  const [imageLoadStates, setImageLoadStates] = useState<Map<string, 'loading' | 'loaded' | 'error'>>(new Map());
  
  // Timer refs
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

  // Fetch images on mount
  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const { imageCount, apiLimit } = sliderConfig;
        const fetchCount = Math.max(imageCount * 3, 30);
        const pagesNeeded = Math.ceil(fetchCount / apiLimit);
        const allImages: Image[] = [];

        for (let page = 1; page <= pagesNeeded; page++) {
          if (signal.aborted) return;

          const response = await imageService.fetchImages({
            limit: apiLimit,
            page: page,
          });

          if (response.images?.length > 0) {
            allImages.push(...response.images);
            if (allImages.length >= fetchCount) break;
            if (response.pagination && page >= response.pagination.pages) break;
          } else {
            break;
          }
        }

        if (signal.aborted) return;

        if (allImages.length > 0) {
          const dailyImages = getDailyRandomImages(allImages, imageCount);
          setImages(dailyImages);
        } else {
          setImages([]);
        }
      } catch (error) {
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

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || images.length === 0) return;

    clearTimerRef(transitionTimeoutRef);
    setIsTransitioning(true);
    setCurrentSlide(index % images.length);

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

  useEffect(() => {
    nextSlideRef.current = nextSlide;
  }, [nextSlide]);

  const prevSlide = useCallback(() => {
    if (images.length === 0) return;
    setSlideDirection('left');
    goToSlide((currentSlide - 1 + images.length) % images.length);
  }, [currentSlide, goToSlide, images.length]);

  // Auto-play with progress bar
  useEffect(() => {
    if (images.length === 0) {
      clearIntervalRef(autoPlayIntervalRef);
      clearIntervalRef(progressIntervalRef);
      return;
    }

    if (isHovered) {
      // Save progress and pause
      if (progressStartTimeRef.current !== null) {
        const elapsed = Date.now() - progressStartTimeRef.current;
        const { intervalMs } = sliderConfig.autoPlay;
        pausedProgressRef.current = Math.min((elapsed / intervalMs) * 100, 100);
      }
      clearIntervalRef(autoPlayIntervalRef);
      clearIntervalRef(progressIntervalRef);
      return;
    }

    // Resume/Start auto-play
    clearIntervalRef(autoPlayIntervalRef);
    clearIntervalRef(progressIntervalRef);

    const startProgress = pausedProgressRef.current;
    const { intervalMs, progressUpdateIntervalMs } = sliderConfig.autoPlay;
    const startTime = Date.now() - (startProgress / 100) * intervalMs;
    progressStartTimeRef.current = startTime;

    // Progress bar animation
    progressIntervalRef.current = window.setInterval(() => {
      if (progressStartTimeRef.current === null) return;
      const elapsed = Date.now() - progressStartTimeRef.current;
      const progress = Math.min((elapsed / intervalMs) * 100, 100);
      setAutoPlayProgress(progress);
    }, progressUpdateIntervalMs);

    // Auto-play interval
    const scheduleNextSlide = () => {
      setAutoPlayProgress(100);
      isAutoPlayChangeRef.current = true;
      if (nextSlideRef.current) {
        nextSlideRef.current();
      }
      setAutoPlayProgress(0);
      pausedProgressRef.current = 0;
      progressStartTimeRef.current = Date.now();
      
      clearTimerRef(autoPlayTimeoutRef);
      autoPlayTimeoutRef.current = window.setTimeout(() => {
        isAutoPlayChangeRef.current = false;
        autoPlayTimeoutRef.current = null;
      }, 10);
    };

    const remainingTime = intervalMs - (startProgress / 100) * intervalMs;

    if (startProgress > 0) {
      clearTimerRef(autoPlayTimeoutRef);
      autoPlayTimeoutRef.current = window.setTimeout(() => {
        scheduleNextSlide();
        autoPlayTimeoutRef.current = null;
        autoPlayIntervalRef.current = window.setInterval(scheduleNextSlide, intervalMs);
      }, remainingTime);
    } else {
      autoPlayIntervalRef.current = window.setInterval(scheduleNextSlide, intervalMs);
    }

    return () => {
      clearTimerRef(autoPlayTimeoutRef);
      clearIntervalRef(autoPlayIntervalRef);
      clearIntervalRef(progressIntervalRef);
      progressStartTimeRef.current = null;
      pausedProgressRef.current = 0;
    };
  }, [images.length, isHovered]);

  // Reset progress on manual slide change
  useEffect(() => {
    if (isAutoPlayChangeRef.current) return;
    setAutoPlayProgress(0);
    pausedProgressRef.current = 0;
    progressStartTimeRef.current = null;
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (images.length === 0) return;
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "Home") goToSlide(0);
      if (e.key === "End") goToSlide(images.length - 1);
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [prevSlide, nextSlide, goToSlide, images.length]);

  // Consolidated image loading handler
  const handleImageLoad = useCallback((imageId: string) => {
    imageLoadStateRef.current.set(imageId, 'loaded');
    setImageLoadStates(prev => {
      const next = new Map(prev);
      next.set(imageId, 'loaded');
      return next;
    });
  }, []);

  // Check cache synchronously on images change
  useLayoutEffect(() => {
    if (images.length === 0) return;
    
    const newLoadStates = new Map<string, 'loading' | 'loaded' | 'error'>();
    
    images.forEach((image) => {
      const imageId = image._id;
      if (imageLoadStateRef.current.get(imageId) === 'loaded') {
        newLoadStates.set(imageId, 'loaded');
        return;
      }
      
      const imageUrl = getImageUrl(image);
      if (!imageUrl) return;
      
      const img = new window.Image();
      img.src = imageUrl;
      
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        imageLoadStateRef.current.set(imageId, 'loaded');
        newLoadStates.set(imageId, 'loaded');
      }
    });
    
    if (newLoadStates.size > 0) {
      setImageLoadStates(prev => {
        const next = new Map(prev);
        newLoadStates.forEach((state, id) => next.set(id, state));
        return next;
      });
    }
  }, [images]);

  // Progressive image loading
  useEffect(() => {
    if (!sliderConfig.loading.enableProgressiveLoading || images.length === 0) return;

    const preloadImage = (image: Image, priority: 'high' | 'low' = 'low') => {
      const imageId = image._id;
      if (imageLoadStateRef.current.get(imageId) === 'loaded') return;

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
      img.onload = () => handleImageLoad(imageId);
      img.onerror = () => {
        imageLoadStateRef.current.set(imageId, 'error');
        setImageLoadStates(prev => {
          const next = new Map(prev);
          next.set(imageId, 'error');
          return next;
        });
      };
      img.fetchPriority = priority;
      img.src = imageUrl;
    };

    const currentImage = images[currentSlide];
    if (currentImage) {
      preloadImage(currentImage, 'high');
    }

    for (let i = 1; i <= 3; i++) {
      const nextIndex = (currentSlide + i) % images.length;
      const nextImage = images[nextIndex];
      if (nextImage) {
        preloadImage(nextImage, 'low');
      }
    }
  }, [currentSlide, images, handleImageLoad]);

  // Get bottom carousel images (current + next)
  const bottomCarouselImages = images.length > 0 
    ? [images[currentSlide], images[(currentSlide + 1) % images.length]].filter(Boolean) as Image[]
    : [];

  // Touch gesture handlers
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

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearIntervalRef(autoPlayIntervalRef);
      clearIntervalRef(progressIntervalRef);
      clearTimerRef(transitionTimeoutRef);
      clearTimerRef(autoPlayTimeoutRef);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="tripzo-page">
        <div className="loading-state">
          <div className="skeleton-main-slide blur-up-skeleton">
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
      <div 
        className="autoplay-progress" 
        style={{ 
          opacity: isHovered ? 0.5 : 1,
          visibility: 'visible'
        }}
        aria-hidden="true"
      >
        <div
          className="autoplay-progress-bar"
          style={{ width: `${autoPlayProgress}%` }}
        />
      </div>

      {/* Main Carousel */}
      <div className={`main-carousel-container transition-${transitionType} slide-direction-${slideDirection}`}>
        {images.map((image, index) => {
          const imageUrl = getImageUrl(image);
          const placeholderUrl = image.smallAvifUrl || image.smallUrl || image.thumbnailAvifUrl || image.thumbnailUrl || null;
          const isActive = index === currentSlide;
          const loadState = imageLoadStateRef.current.get(image._id) || imageLoadStates.get(image._id) || 'loading';
          const isLoaded = loadState === 'loaded';
          const showBlurUp = placeholderUrl && !isLoaded;

          return (
            <div
              key={image._id}
              className={`main-slide ${isActive ? "active" : ""} transition-${transitionType}`}
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {(placeholderUrl || imageUrl) && (
                <div
                  className="blur-background-layer"
                  style={{
                    backgroundImage: `url("${placeholderUrl || imageUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 1,
                  }}
                />
              )}

              {imageUrl && (
                <div
                  className={`main-image-layer ${isLoaded ? 'loaded' : 'loading'}`}
                  style={{
                    backgroundImage: `url("${imageUrl}")`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: isLoaded ? 1 : 0,
                    transition: isLoaded ? 'opacity 0.5s ease-in-out' : 'none',
                    zIndex: 2,
                  }}
                />
              )}

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
          {bottomCarouselImages.map((image, index) => {
            if (!image) return null;
            const thumbnailUrl = getImageUrl(image, true);
            const slideIndex = index === 0 ? currentSlide : (currentSlide + 1) % images.length;
            const isActive = index === 0;

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
