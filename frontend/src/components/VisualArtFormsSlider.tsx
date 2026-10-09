import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useSliderStore } from '@/stores/useSliderStore';
import { t } from '@/i18n';
import './VisualArtFormsSlider.css';

export const VisualArtFormsSlider = memo(function VisualArtFormsSlider() {
  const slides = useSliderStore(state => state.slides);
  const loading = useSliderStore(state => state.loading);
  const hasLoaded = useSliderStore(state => state.hasLoaded);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isZoomingOut, setIsZoomingOut] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState('');
  const [previousImageSrc, setPreviousImageSrc] = useState('');
  const [isImageReady, setIsImageReady] = useState(false);
  const [shouldFadeOutPrevious, setShouldFadeOutPrevious] = useState(false);
  const imageLoadsRef = useRef(new Map<string, Promise<boolean>>());
  const navigationRef = useRef(0);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const imageTriggerRef = useRef<HTMLImageElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const totalSlides = slides.length;

  useEffect(() => {
    if (!previousImageSrc) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setShouldFadeOutPrevious(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [previousImageSrc, currentSlide]);

  useEffect(() => {
    if (!previousImageSrc || !shouldFadeOutPrevious) return;
    const timer = setTimeout(() => setPreviousImageSrc(''), 350);
    return () => clearTimeout(timer);
  }, [previousImageSrc, shouldFadeOutPrevious]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const stopHiddenSlider = () => {
      if (!media.matches) return;
      navigationRef.current++;
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      setIsZoomed(false);
      setIsZoomingOut(false);
    };
    media.addEventListener('change', stopHiddenSlider);
    return () => media.removeEventListener('change', stopHiddenSlider);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const store = useSliderStore.getState();
    if (store.slides.length) store.resetLoading();
    const request = store.hasLoaded
      ? store.checkAndRefreshIfStale(controller.signal)
      : store.fetchSlides(controller.signal);
    void request.catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    const controller = new AbortController();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void useSliderStore.getState().checkAndRefreshIfStale(controller.signal).catch(() => {});
      }
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [hasLoaded]);

  const preloadImage = useCallback((src: string): Promise<boolean> => {
    if (!src) return Promise.resolve(false);
    const existing = imageLoadsRef.current.get(src);
    if (existing) return existing;
    const request = new Promise<boolean>(resolve => {
      const image = new Image();
      image.onload = async () => {
        try { await image.decode?.(); } catch { /* Loaded images can still be displayed. */ }
        resolve(true);
      };
      image.onerror = () => {
        imageLoadsRef.current.delete(src);
        resolve(false);
      };
      image.src = src;
    });
    imageLoadsRef.current.set(src, request);
    return request;
  }, []);

  useEffect(() => {
    if (currentSlide >= slides.length) setCurrentSlide(0);
  }, [currentSlide, slides.length]);

  useEffect(() => {
    navigationRef.current++;
    const slide = slides[currentSlide];
    if (!slide) return;
    let active = true;

    void preloadImage(slide.image).then(async ready => {
      if (!active) return;
      if (!ready) return;
      setCurrentImageSrc(slide.image);
      setIsImageReady(true);
      if (ready && slide.highQualityUrl && slide.highQualityUrl !== slide.image) {
        const upgraded = await preloadImage(slide.highQualityUrl);
        if (active && upgraded) setCurrentImageSrc(slide.highQualityUrl);
      }
    });
    // Only warm the next slide; current and navigation share the same load promise.
    if (slides.length > 1) void preloadImage(slides[(currentSlide + 1) % slides.length].image);
    return () => { active = false; };
  }, [currentSlide, slides, preloadImage]);

  useEffect(() => () => {
    navigationRef.current++;
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
  }, []);

  const goToSlide = useCallback(async (index: number) => {
    if (index === currentSlide || !slides[index]?.image) return;
    const requestId = ++navigationRef.current;
    const ready = await preloadImage(slides[index].image);
    if (!ready || requestId !== navigationRef.current) return;
    setPreviousImageSrc(currentImageSrc);
    setShouldFadeOutPrevious(false);
    setCurrentImageSrc(slides[index].image);
    setIsImageReady(true);
    setCurrentSlide(index);
  }, [currentSlide, slides, currentImageSrc, preloadImage]);
  const nextSlide = useCallback(() => {
    if (totalSlides > 1) void goToSlide((currentSlide + 1) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);
  const goToPrevSlide = useCallback(() => {
    if (totalSlides > 1) void goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);

  const closeZoom = useCallback(() => {
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    setIsZoomingOut(true);
    zoomTimerRef.current = setTimeout(() => {
      setIsZoomed(false);
      setIsZoomingOut(false);
      zoomTimerRef.current = null;
    }, 400);
  }, []);
  const handleImageClick = useCallback(() => {
    if (isZoomed) closeZoom();
    else {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      setIsZoomingOut(false);
      setIsZoomed(true);
    }
  }, [isZoomed, closeZoom]);
  const handleCloseZoom = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) closeZoom();
  }, [closeZoom]);

  useEffect(() => {
    if (!isZoomed) return;
    const previousOverflow = document.body.style.overflow;
    const imageTrigger = imageTriggerRef.current;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (imageTrigger?.getClientRects().length) imageTrigger.focus({ preventScroll: true });
    };
  }, [isZoomed]);
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isZoomed && event.key === 'Escape') { closeZoom(); return; }
      if (event.defaultPrevented || event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      const rect = sliderRef.current?.getBoundingClientRect();
      if (!rect?.width || !rect.height || (!isZoomed && (rect.bottom <= 0 || rect.top >= window.innerHeight))) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goToPrevSlide(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); nextSlide(); }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextSlide, goToPrevSlide, isZoomed, closeZoom]);

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

  return (
    <div ref={sliderRef} className="visual-art-slider">
      <main className="slider-main">
        <div className="image-container">
          {/* Previous image for smooth transition */}
          {previousImageSrc && (
            <img
              key={previousImageSrc}
              src={previousImageSrc}
              alt=""
              className="slide-image slide-image-previous slide-image-common"
              style={{
                opacity: shouldFadeOutPrevious ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out',
              }}
              aria-hidden="true"

            />
          )}
          {/* Current image */}
          {currentSlideData && currentImageSrc && (
            <img
              ref={imageTriggerRef}
              role="button"
              tabIndex={0}
              aria-label={`Phóng to ảnh: ${currentSlideData.title}`}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleImageClick();
                }
              }}
              src={currentImageSrc}
              alt={currentSlideData.title}
              loading="eager"
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
      {(isZoomed || isZoomingOut) && currentSlideData && createPortal(
        <div 
          className={`zoom-overlay ${isZoomingOut ? 'zooming-out' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh phóng to: ${currentSlideData.title}`}
          onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }}
          onClick={handleCloseZoom}
        >
          <button ref={closeButtonRef} type="button" className="slider-zoom-close" aria-label="Đóng ảnh phóng to" onClick={closeZoom}>×</button>
          <button type="button" className="slider-zoom-image-button" aria-label="Thu nhỏ ảnh" onClick={closeZoom}>
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

          />
          </button>
        </div>, document.body
      )}

      {/* Navigation */}
      <div className="left-navigation-bottom">
        <button
          type="button"
          disabled={totalSlides < 2}
          className="nav-arrow nav-arrow-left"
          onClick={goToPrevSlide}
          aria-label={t('visualArtSlider.previousSlide')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Progress Line */}
        <div className="progress-line-container" aria-label={`Ảnh ${currentSlide + 1} trên ${totalSlides}`}>
          <div className="progress-line-numbers">
            {slides.map((_, index) => (
              <div 
                key={index} 
                className={`progress-line-number ${index === currentSlide ? 'visible' : 'hidden'}`}
                style={{
                  left: '50%'
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
                width: `${100 / totalSlides}%`,
                transform: `translateX(${currentSlide * 100}%)`,
              }}
            >
              <div className="progress-segment-fill filled" />
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={totalSlides < 2}
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
});
