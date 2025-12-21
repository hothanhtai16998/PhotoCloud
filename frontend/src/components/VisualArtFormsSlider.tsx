import { useState, useEffect, useRef, useCallback } from 'react';
import { useSliderStore } from '@/stores/useSliderStore';
import { t } from '@/i18n';
import './VisualArtFormsSlider.css';

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
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [isZoomingOut, setIsZoomingOut] = useState<boolean>(false);
  const [currentImageSrc, setCurrentImageSrc] = useState<string>('');
  const [previousImageSrc, setPreviousImageSrc] = useState<string>('');
  const [isImageReady, setIsImageReady] = useState<boolean>(false);
  const [highQualityLoaded, setHighQualityLoaded] = useState<boolean>(false);
  const [shouldFadeOutPrevious, setShouldFadeOutPrevious] = useState<boolean>(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const previousImageRef = useRef<HTMLImageElement>(null);
  const preloadedImagesRef = useRef<Set<string>>(new Set());
  const previousImageSrcRef = useRef<string>('');
  const currentSlideRef = useRef<number>(0);

  // Fetch images from database
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
    
    if (slides.length > 0 && isMounted) {
      resetLoading();
      
      const existing = document.querySelector('link[rel="preload"][as="image"][fetchpriority="high"]');
      if (existing) existing.remove();
      
      if (slides.length > 0 && slides[0]?.image) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = slides[0].image;
        preloadLink.setAttribute('fetchpriority', 'high');
        document.head.appendChild(preloadLink);
      }
    }
    
    const fetchData = () => {
      if (slides.length === 0) {
        fetchSlides(abortController.signal).catch(() => {
          // Ignore errors - already handled in store
        });
      } else {
        checkAndRefreshIfStale(abortController.signal).catch(() => {
          // Ignore errors - already handled in store
        });
      }
    };
    
    const scheduleFetch = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          if (!abortController.signal.aborted) {
            fetchData();
          }
        }, { timeout: 100 });
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!abortController.signal.aborted) {
              fetchData();
            }
          });
        });
      }
    };
    
    scheduleFetch();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic check for stale data
  useEffect(() => {
    if (!hasLoaded) return;
    
    const abortController = new AbortController();
    const interval = setInterval(() => {
      checkAndRefreshIfStale(abortController.signal);
    }, 5 * 60 * 1000);
    
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
    const currentImage = slides[currentSlide]?.image;
    
    if (currentImage) {
      preloadImage(currentImage);
    }
    preloadImage(slides[nextIndex]?.image || '');
    preloadImage(slides[prevIndex]?.image || '');
  }, [currentSlide, slides, preloadImage]);

  // Progressive loading: start with low quality, upgrade to high quality
  useEffect(() => {
    if (slides.length === 0 || currentSlide >= slides.length) return;
    
    const currentSlideData = slides[currentSlide];
    if (!currentSlideData) {
      setCurrentImageSrc('');
      setPreviousImageSrc('');
      setIsImageReady(false);
      setHighQualityLoaded(false);
      previousImageSrcRef.current = '';
      return;
    }
    
    const lowQualityUrl = currentSlideData.image;
    const highQualityUrl = currentSlideData.highQualityUrl || currentSlideData.image;
    
    currentSlideRef.current = currentSlide;
    
    // Reset high quality state
    setHighQualityLoaded(false);
    
    // Load high quality image in background
    const loadHighQuality = () => {
      if (highQualityUrl === lowQualityUrl || highQualityLoaded) return;
      
      const highQualityImg = new Image();
      highQualityImg.src = highQualityUrl;
      
      if (highQualityImg.complete && highQualityImg.naturalWidth > 0) {
        // Already cached, switch immediately
        setCurrentImageSrc(highQualityUrl);
        setHighQualityLoaded(true);
      } else {
        highQualityImg.onload = () => {
          // High quality loaded, switch to it
          setCurrentImageSrc(highQualityUrl);
          setHighQualityLoaded(true);
        };
        highQualityImg.onerror = () => {
          // If high quality fails, keep using low quality
          console.warn('Failed to load high quality image, using low quality');
        };
      }
    };
    
    // Check if low quality image is already loaded/cached
    const img = new Image();
    img.src = lowQualityUrl;
    
    if (img.complete && img.naturalWidth > 0) {
      // Already cached, show immediately (no flash since it's already loaded)
      setCurrentImageSrc(lowQualityUrl);
      setIsImageReady(true);
      // Start fading out previous image now that new one is ready
      setShouldFadeOutPrevious(true);
      // Start loading high quality immediately
      if (highQualityUrl !== lowQualityUrl) {
        loadHighQuality();
      }
    } else {
      // Image needs to load - set src but keep it hidden until loaded
      setCurrentImageSrc(lowQualityUrl);
      setIsImageReady(false);
      setShouldFadeOutPrevious(false);
      // Wait for image to load before showing it
      img.onload = () => {
        setIsImageReady(true);
        // Start fading out previous image now that new one is ready
        setShouldFadeOutPrevious(true);
        // Once low quality is loaded, start loading high quality
        if (highQualityUrl !== lowQualityUrl) {
          loadHighQuality();
        }
      };
      img.onerror = () => {
        setIsImageReady(false);
      };
    }
  }, [currentSlide, slides]);

  const totalSlides = slides.length;

  const goToSlide = useCallback((index: number) => {
    if (slides.length === 0 || index === currentSlide) {
      return;
    }
    if (index < 0 || index >= slides.length) return;
    
    const nextSlideData = slides[index];
    if (!nextSlideData?.image) return;
    
    // Save current image as previous before changing
    if (currentImageSrc) {
      previousImageSrcRef.current = currentImageSrc;
      setPreviousImageSrc(currentImageSrc);
      setShouldFadeOutPrevious(false);
    }
    
    // Preload the low-quality image first, then switch slides once it's ready
    const lowQualityUrl = nextSlideData.image;
    const img = new Image();
    
    // If image is already cached, switch immediately
    img.src = lowQualityUrl;
    if (img.complete && img.naturalWidth > 0) {
      setCurrentSlide(index);
    } else {
      // Wait for image to load before switching
      img.onload = () => {
        setCurrentSlide(index);
      };
      img.onerror = () => {
        // Still switch even if load fails (might be a network issue)
        setCurrentSlide(index);
      };
    }
  }, [currentSlide, slides, currentImageSrc]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);

  const goToPrevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isZoomed && e.key === 'Escape') {
        setIsZoomingOut(true);
        setTimeout(() => {
          setIsZoomed(false);
          setIsZoomingOut(false);
          document.body.style.overflow = '';
        }, 400);
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
  }, [nextSlide, goToPrevSlide, isZoomed]);

  const handleImageClick = useCallback(() => {
    if (isZoomed) {
      setIsZoomingOut(true);
      setTimeout(() => {
        setIsZoomed(false);
        setIsZoomingOut(false);
        document.body.style.overflow = '';
      }, 400);
    } else {
      setIsZoomingOut(false);
      setIsZoomed(true);
      document.body.style.overflow = 'hidden';
    }
  }, [isZoomed]);

  const handleCloseZoom = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomingOut(true);
      setTimeout(() => {
        setIsZoomed(false);
        setIsZoomingOut(false);
        document.body.style.overflow = '';
      }, 400);
    }
  }, []);

  // Cleanup: restore body scroll when component unmounts or zoom closes
  useEffect(() => {
    if (!isZoomed) {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isZoomed]);

  // Reserve space for slider to prevent layout shift when loading
  if (loading && slides.length === 0) {
    return (
      <div className="visual-art-slider">
        <div className="slider-main" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          {/* Placeholder to reserve space - prevents layout shift */}
        </div>
      </div>
    );
  }

  // Don't render anything if we have no slides (and not loading)
  if (slides.length === 0) {
    return null;
  }

  const currentSlideData = slides[currentSlide];
  
  if (!currentSlideData) {
    return (
      <div className="visual-art-slider">
        <div className="slider-error-message">
          {t('visualArtSlider.noSlideData')}
        </div>
      </div>
    );
  }

  // Calculate container height based on image aspect ratio to fill width without cropping
  const containerStyle = currentSlideData && currentSlideData.width && currentSlideData.height
    ? {
        aspectRatio: `${currentSlideData.width} / ${currentSlideData.height}`,
        height: 'auto',
        maxHeight: '100%',
      }
    : {};

  return (
    <div className="visual-art-slider">
      <main className="slider-main">
        <div className="image-container" style={containerStyle}>
          {/* Previous image for smooth transition */}
          {previousImageSrc && (
            <img
              ref={previousImageRef}
              src={previousImageSrc}
              alt=""
              className="slide-image slide-image-previous slide-image-common"
              style={{
                opacity: shouldFadeOutPrevious ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out',
              }}
              aria-hidden="true"
              onTransitionEnd={() => {
                // Remove previous image after fade out completes
                if (shouldFadeOutPrevious) {
                  setPreviousImageSrc('');
                  setShouldFadeOutPrevious(false);
                }
              }}
            />
          )}
          {/* Current image */}
          {currentSlideData && currentImageSrc && (
            <img
              ref={imageRef}
              src={currentImageSrc}
              alt={currentSlideData.title}
              loading={currentSlide === 0 ? 'eager' : 'lazy'}
              fetchPriority={currentSlide === 0 ? 'high' : 'auto'}
              decoding="async"
              className={`slide-image slide-image-current slide-image-common ${isZoomed ? 'slide-image-zoomed' : ''}`}
              onClick={handleImageClick}
              style={{
                opacity: isImageReady ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            />
          )}
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
              e.stopPropagation();
              handleImageClick();
            }}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="left-navigation-bottom">
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
            <div 
              className="progress-segments-container"
              style={{
                width: `${((currentSlide + 1) / totalSlides) * 100}%`
              }}
            >
              <div className="progress-segment-fill filled" />
            </div>
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
