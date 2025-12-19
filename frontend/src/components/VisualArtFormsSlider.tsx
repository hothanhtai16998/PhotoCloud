import { useState, useEffect, useRef, useCallback } from 'react';
import { useSliderStore } from '@/stores/useSliderStore';
import { t } from '@/i18n';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import './VisualArtFormsSlider.css';

// Timing Constants
const OPEN_ANIMATION_DURATION = 800;   // 800ms - Open animation
const SLIDE_VISIBLE_TIME = 8000;      // 8000ms - Time slide is fully visible
const CLOSE_ANIMATION_DURATION = 800; // 800ms - Close animation
const PROGRESS_DURATION = OPEN_ANIMATION_DURATION + SLIDE_VISIBLE_TIME + CLOSE_ANIMATION_DURATION; // 9600ms total

export function VisualArtFormsSlider() {
  const {
    slides,
    loading,
    hasLoaded,
    fetchSlides,
    resetLoading,
    checkAndRefreshIfStale,
  } = useSliderStore();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pendingSlideIndex, setPendingSlideIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(1);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoPlayChangeRef = useRef<boolean>(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const preloadedImagesRef = useRef<Set<string>>(new Set());
  const prevSlideIndexRef = useRef<number>(0);
  const [isLoopingFromFirst, setIsLoopingFromFirst] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [isZoomingOut, setIsZoomingOut] = useState<boolean>(false);
  const zoomOutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const startCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (!isAnimating) {
      const interval = Math.floor((PROGRESS_DURATION - 300) / 9);
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return 1;
          }
          return prev - 1;
        });
      }, interval);
    }
  }, [isAnimating]);
  
  useEffect(() => {
    if (isAnimating) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    } else {
      setCountdownSeconds(10);
      if (restartSlideIntervalRef.current) {
        restartSlideIntervalRef.current();
      }
      startCountdown();
    }
  }, [isAnimating, startCountdown]);

  const totalSlides = slides.length;

  // Fetch images from database
  // CRITICAL: Start fetching immediately on mount for better LCP
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
    
    // On mount, if we have slides, ensure loading is false (handles rapid refresh)
    // This prevents spinner from showing when we already have cached data
    if (slides.length > 0 && isMounted) {
      resetLoading();
      // Initialize previous slide ref
      prevSlideIndexRef.current = 0;
      
      // Preload the first slide image for better LCP discovery
      if (slides.length > 0 && slides[0]?.image) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = slides[0].image;
        preloadLink.setAttribute('fetchpriority', 'high');
        document.head.appendChild(preloadLink);
      }
    }
    
    // Simple: if no slides, fetch. If we have slides, check if stale.
    if (slides.length === 0) {
      fetchSlides(abortController.signal).catch(() => {
        // Ignore errors - already handled in store
      });
    } else {
      // If we have slides, check if stale and refresh in background
      checkAndRefreshIfStale(abortController.signal).catch(() => {
        // Ignore errors - already handled in store
      });
    }
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unsplash-style: Periodic check for stale data (every 5 minutes for slider)
  useEffect(() => {
    if (!hasLoaded) return;
    
    const abortController = new AbortController();
    const interval = setInterval(() => {
      checkAndRefreshIfStale(abortController.signal);
    }, 5 * 60 * 1000); // Check every 5 minutes (slider changes less frequently)
    
    return () => {
      clearInterval(interval);
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded]);

  // Helper function to preload and decode image
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!src || preloadedImagesRef.current.has(src)) {
        resolve();
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        img.decode?.()
          .then(() => {
            preloadedImagesRef.current.add(src);
            resolve();
          })
          .catch(() => {
            preloadedImagesRef.current.add(src);
            resolve();
          });
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  }, []);

  // Preload next and previous images
  useEffect(() => {
    if (slides.length === 0) return;
    
    const nextIndex = (currentSlide + 1) % slides.length;
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
    
    preloadImage(slides[currentSlide]?.image || '');
    preloadImage(slides[nextIndex]?.image || '');
    preloadImage(slides[prevIndex]?.image || '');
  }, [currentSlide, slides, preloadImage]);


  useEffect(() => {
    if (isAnimating && wipeProgress === 1 && pendingSlideIndex !== null) {
      const timer = setTimeout(() => {
        setCurrentSlide(pendingSlideIndex);
        setPendingSlideIndex(null);
        setIsAnimating(false);
        setWipeProgress(1);
      }, 850);
      return () => clearTimeout(timer);
    }
    // No cleanup needed when condition is false
    return () => {};
  }, [isAnimating, wipeProgress, pendingSlideIndex]);

  // Track previous slide to detect looping
  useEffect(() => {
    const prevSlide = prevSlideIndexRef.current;
    const isLoopingFromFirstToLast = currentSlide === totalSlides - 1 && prevSlide === 0 && totalSlides > 0;
    const isLoopingFromLastToFirst = currentSlide === 0 && prevSlide === totalSlides - 1 && totalSlides > 0;
    
    if (isLoopingFromFirstToLast || isLoopingFromLastToFirst) {
      setIsLoopingFromFirst(isLoopingFromFirstToLast);
      setIsLooping(true);
      setTimeout(() => setIsLooping(false), 100);
    } else {
      setIsLoopingFromFirst(false);
      setIsLooping(false);
    }
    
    prevSlideIndexRef.current = currentSlide;
  }, [currentSlide, totalSlides]);

  // Ref to store restartSlideInterval function
  const restartSlideIntervalRef = useRef<(() => void) | null>(null);

  const goToSlide = useCallback((index: number) => {
    if (slides.length === 0 || index === currentSlide || isAnimating) {
      return;
    }
    if (index < 0 || index >= slides.length) return;
    
    const nextSlideData = slides[index];
    if (!nextSlideData?.image) return;
    
    // Only reset countdown and interval when manually changing slide (not auto-play)
    if (!isAutoPlayChangeRef.current) {
      // Reset countdown
      startCountdown();
      
      // Restart slide interval for the new slide (full 6850ms)
      if (restartSlideIntervalRef.current) {
        restartSlideIntervalRef.current();
      }
    }
    
    // Preload image first, then start animation
    preloadImage(nextSlideData.image).then(() => {
      // Prepare next slide
      setPendingSlideIndex(index);
      setIsAnimating(true);
      
      setWipeProgress(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWipeProgress(1);
        });
      });
    });
  }, [currentSlide, slides, isAnimating, preloadImage, startCountdown]);

  const nextSlideRef = useRef<(() => void) | undefined>(undefined);
  
  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);
  
  // Update ref whenever nextSlide changes
  useEffect(() => {
    nextSlideRef.current = nextSlide;
  }, [nextSlide]);

  const goToPrevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);

  // Helper functions for iris animation
  const getOldImageClipPath = (progress: number): string => {
    if (progress <= 0.4) {
      const closePercentage = (progress / 0.4) * 100;
      return `inset(0 ${closePercentage}% 0 ${closePercentage}%)`;
    } else {
      return `inset(0 100% 0 100%)`;
    }
  };


  const getNewImageClipPath = (progress: number): string => {
    if (progress <= 0.6) {
      return `inset(0 100% 0 100%)`;
    } else {
      const openProgress = (progress - 0.6) / 0.4;
      const openPercentage = 100 - (openProgress * 100);
      return `inset(0 ${openPercentage}% 0 ${openPercentage}%)`;
    }
  };

  const getNewImageOpacity = (progress: number): number => {
    return progress <= 0.6 ? 0 : 1;
  };

  // navBottom measurement removed; nav now uses fixed CSS offset

  useEffect(() => {
    if (slides.length === 0) return;
    // Don't start interval if zoomed or zooming out
    if (isZoomed || isZoomingOut) return;
    
    const restartSlideInterval = () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
        slideIntervalRef.current = null;
      }
      
      const scheduleNextSlide = () => {
        isAutoPlayChangeRef.current = true;
        if (nextSlideRef.current) {
          nextSlideRef.current();
        }
        setTimeout(() => {
          isAutoPlayChangeRef.current = false;
        }, 100);
      };
      
      slideIntervalRef.current = setInterval(scheduleNextSlide, PROGRESS_DURATION);
    };
    
    restartSlideIntervalRef.current = restartSlideInterval;
    restartSlideInterval();
    
    if (!isAnimating) {
      startCountdown();
    }

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (zoomOutTimeoutRef.current) {
        clearTimeout(zoomOutTimeoutRef.current);
      }
    };
  }, [slides.length, isAnimating, startCountdown, isZoomed, isZoomingOut]);


  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isZoomed && e.key === 'Escape') {
        setIsZoomingOut(true);
        // Wait for zoom out animation (0.4s) before actually closing
        setTimeout(() => {
          setIsZoomed(false);
          setIsZoomingOut(false);
          document.body.style.overflow = '';
          // Resume slide after zoom out animation completes
          if (slides.length > 0 && restartSlideIntervalRef.current) {
            restartSlideIntervalRef.current();
            if (!isAnimating) {
              startCountdown();
            }
          }
        }, 400); // Match zoom animation duration
        return;
      }
      if (e.key === 'ArrowLeft') {
        goToPrevSlide();
      }
      if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextSlide, goToPrevSlide, isZoomed, slides.length, isAnimating, startCountdown]);

  const handleImageClick = useCallback(() => {
    if (isZoomed) {
      // If already zoomed, zoom out
      setIsZoomingOut(true);
      // Wait for zoom out animation (0.4s) before actually closing
      setTimeout(() => {
        setIsZoomed(false);
        setIsZoomingOut(false);
        document.body.style.overflow = '';
        // Resume slide after zoom out animation completes
        if (slides.length > 0 && restartSlideIntervalRef.current) {
          restartSlideIntervalRef.current();
          if (!isAnimating) {
            startCountdown();
          }
        }
      }, 400); // Match zoom animation duration
    } else {
      // Zoom in - pause immediately
      setIsZoomingOut(false);
      setIsZoomed(true);
      document.body.style.overflow = 'hidden';
    }
  }, [isZoomed, slides.length, isAnimating, startCountdown]);

  const handleCloseZoom = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomingOut(true);
      // Wait for zoom out animation (0.4s) before actually closing
      setTimeout(() => {
        setIsZoomed(false);
        setIsZoomingOut(false);
        document.body.style.overflow = '';
        // Resume slide after zoom out animation completes
        if (slides.length > 0 && restartSlideIntervalRef.current) {
          restartSlideIntervalRef.current();
          if (!isAnimating) {
            startCountdown();
          }
        }
      }, 400); // Match zoom animation duration
    }
  }, [slides.length, isAnimating, startCountdown]);

  // Cleanup: restore body scroll when component unmounts or zoom closes
  useEffect(() => {
    if (!isZoomed) {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isZoomed]);

  // Pause slide interval when zoomed or zooming out
  useEffect(() => {
    if (isZoomed || isZoomingOut) {
      // Pause: clear the slide interval immediately
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
        slideIntervalRef.current = null;
      }
      // Pause countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // Clear any pending zoom out timeout
      if (zoomOutTimeoutRef.current) {
        clearTimeout(zoomOutTimeoutRef.current);
        zoomOutTimeoutRef.current = null;
      }
    }
    // Note: Resume is handled in handleImageClick and handleCloseZoom with delay
  }, [isZoomed, isZoomingOut]);

  // Only show loading state if we have no slides - same pattern as NoFlashGrid
  if (loading && slides.length === 0) {
    return (
      <div className="visual-art-slider">
        <div className="slider-loading-message">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if we have no slides (and not loading)
  if (slides.length === 0) {
    return (
      <div className="visual-art-slider">
        <div className="slider-loading-message">
          {t('visualArtSlider.noImagesAvailable')}
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];
  const nextSlideData = pendingSlideIndex !== null ? slides[pendingSlideIndex] : null;
  
  if (!currentSlideData) {
    return (
      <div className="visual-art-slider">
        <div className="slider-error-message">
          {t('visualArtSlider.noSlideData')}
        </div>
      </div>
    );
  }

  return (
    <div className="visual-art-slider">
      <div className="content-left">
        <p className="subtitle">{t('visualArtSlider.subtitle')}</p>
        <h1 className="main-title">{currentSlideData.title}</h1>
        
        {currentSlideData.imageInfo && (
          <div className="image-info">
            {currentSlideData.imageInfo.location && (
              <div className="info-item">
                <span className="info-label">Location:</span>
                <span className="info-value">{currentSlideData.imageInfo.location}</span>
              </div>
            )}
            {currentSlideData.imageInfo.cameraMake && currentSlideData.imageInfo.cameraModel && (
              <div className="info-item">
                <span className="info-label">Camera:</span>
                <span className="info-value">
                  {currentSlideData.imageInfo.cameraMake} {currentSlideData.imageInfo.cameraModel}
                </span>
              </div>
            )}
            {(currentSlideData.imageInfo.focalLength || currentSlideData.imageInfo.aperture || currentSlideData.imageInfo.shutterSpeed || currentSlideData.imageInfo.iso) && (
              <div className="info-item">
                <span className="info-label">Settings:</span>
                <span className="info-value">
                  {[
                    currentSlideData.imageInfo.focalLength && `${currentSlideData.imageInfo.focalLength}mm`,
                    currentSlideData.imageInfo.aperture && `f/${currentSlideData.imageInfo.aperture}`,
                    currentSlideData.imageInfo.shutterSpeed && currentSlideData.imageInfo.shutterSpeed,
                    currentSlideData.imageInfo.iso && `ISO ${currentSlideData.imageInfo.iso}`
                  ].filter(Boolean).join(' • ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <main className="slider-main">
        <div className="image-container">
              {currentSlideData && (
                <img
                  ref={imageRef}
                  src={currentSlideData.image}
                  alt={currentSlideData.title}
                  width={currentSlideData.width}
                  height={currentSlideData.height}
                  loading={currentSlide === 0 ? 'eager' : 'lazy'}
                  // Give the first slide highest priority for better LCP, others default
                  fetchPriority={currentSlide === 0 ? 'high' : 'auto'}
                  decoding="async"
                  className={`slide-image slide-image-current slide-image-common slide-image-current-static ${
                    isAnimating 
                      ? 'slide-image-current-animating' 
                      : 'slide-image-current-not-animating'
                  } ${isZoomed ? 'slide-image-zoomed' : ''}`}
                  style={{
                    clipPath: isAnimating ? getOldImageClipPath(wipeProgress) : undefined,
                  }}
                  onClick={handleImageClick}
                />
              )}
              
              {nextSlideData && isAnimating && (
                <img
                  src={nextSlideData.image}
                  alt={nextSlideData.title}
                  width={nextSlideData.width}
                  height={nextSlideData.height}
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                  className={`slide-image slide-image-current slide-image-common slide-image-next ${
                    wipeProgress <= 0.6 ? 'slide-image-next-hidden' : 'slide-image-next-visible'
                  }`}
                  style={{
                    clipPath: getNewImageClipPath(wipeProgress),
                    opacity: getNewImageOpacity(wipeProgress),
                  }}
                />
              )}
              
              <div className="circular-text">
                <svg viewBox="0 0 200 200" className="circular-svg">
                  <defs>
                    <path
                      id="circle-path"
                      d="M 100, 100 m -60, 0 a 60,60 0 1,1 120,0 a 60,60 0 1,1 -120,0"
                    />
                  </defs>
                  <text className="circular-text-path">
                    <textPath href="#circle-path" startOffset="0%">
                      {t('visualArtSlider.clickToSeeFullImage')}
                    </textPath>
                  </text>
                </svg>
              </div>

              {/* Countdown Number */}
              <div className={`countdown-number ${isAnimating ? 'countdown-hidden' : 'countdown-visible'}`}>
                {countdownSeconds}
              </div>

        </div>
        
      </main>

      {/* Fullscreen Zoom Overlay */}
      {(isZoomed || isZoomingOut) && currentSlideData && (
        <div 
          className={`zoom-overlay ${isZoomingOut ? 'zooming-out' : ''}`}
          onClick={handleCloseZoom}
        >
          <img
            src={currentSlideData.fullImage || currentSlideData.image}
            alt={currentSlideData.title}
            className={`zoom-image ${isZoomingOut ? 'zooming-out' : ''}`}
            width={currentSlideData.width}
            height={currentSlideData.height}
            style={{
              aspectRatio: currentSlideData.width && currentSlideData.height 
                ? `${currentSlideData.width} / ${currentSlideData.height}`
                : undefined,
            }}
            loading="eager"
            decoding="sync"
            onClick={(e) => {
              // Allow clicking the image itself to zoom out
              e.stopPropagation();
              handleImageClick();
            }}
          />
        </div>
      )}

      {/* Navigation and Progress Line - positioned at bottom */}
      <div
        className="left-navigation-bottom"
      >
        <button
          className="nav-arrow nav-arrow-left"
          onClick={goToPrevSlide}
          aria-label={t('visualArtSlider.previousSlide')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Progress Line */}
        <div className="progress-line-container">
          <div className="progress-line-numbers">
            {slides.map((_, index) => (
              <div 
                key={index} 
                className={`progress-line-number ${index === currentSlide ? 'visible' : 'hidden'}`}
                style={{
                  left: `${((index + 0.5) / totalSlides) * 100}%`
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>
            ))}
          </div>
          <div className="progress-line">
            {isLoopingFromFirst ? (
              // When fully filled, show as single continuous black line
              <div className="progress-line-full-fill" />
            ) : (
              // When not fully filled, show connected segments
              <div 
                className="progress-segments-container"
                style={{
                  width: `${((currentSlide + 1) / totalSlides) * 100}%`,
                  transition: isLooping ? 'none' : 'width 0.5s ease-out'
                }}
              >
                <div className="progress-segment-fill filled" />
              </div>
            )}
          </div>
        </div>

        <button
          className="nav-arrow nav-arrow-right"
          onClick={nextSlide}
          aria-label={t('visualArtSlider.nextSlide')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

    </div>
  );
}

