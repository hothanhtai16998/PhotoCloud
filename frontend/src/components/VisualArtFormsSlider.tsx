import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useSliderStore } from '@/stores/useSliderStore';
import { sliderLayoutTransition } from '@/utils/sliderLayoutTransition';
import { t } from '@/i18n';
import '@fontsource-variable/manrope';
import './VisualArtFormsSlider.css';
import { FixedSlideStage } from './FixedSlideStage';
import { CardOpeningStage } from './CardOpeningStage';
import { SliderZoomImage } from './SliderZoomImage';
import { ImmersiveHomeChrome } from './ImmersiveHomeChrome';
import { RefreshCw } from 'lucide-react';

export const VisualArtFormsSlider = memo(function VisualArtFormsSlider({collapsed = false}: {collapsed?: boolean}) {
  const slides = useSliderStore(state => state.slides);
  const loading = useSliderStore(state => state.loading);
  const error = useSliderStore(state => state.error);
  const reducedMotion = useReducedMotion();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 769px)').matches);
  const sliderRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const transition = reducedMotion ? {duration: 0} : sliderLayoutTransition;
  const active = slides[currentSlide] || slides[0];
  const paginationStart = Math.min(Math.max(currentSlide - 2, 0), Math.max(slides.length - 5, 0));
  const closeZoom = useCallback(() => setIsZoomed(false), []);
  const selectSlide = useCallback((index: number) => {
    if (slides.length) setCurrentSlide((index + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!collapsed || !playing || isZoomed || slides.length < 2 || reducedMotion) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') selectSlide(currentSlide + 1);
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [playing, collapsed, isZoomed, slides.length, currentSlide, selectSlide, reducedMotion]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 769px)');
    const resize = () => { setIsDesktop(media.matches); if (!media.matches) setIsZoomed(false); };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const store = useSliderStore.getState();
    if (store.slides.length) store.resetLoading();
    void (store.hasLoaded ? store.checkAndRefreshIfStale(controller.signal) : store.fetchSlides(controller.signal)).catch(() => {});
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void useSliderStore.getState().checkAndRefreshIfStale(controller.signal).catch(() => {});
    }, 5 * 60 * 1000);
    return () => {controller.abort(); clearInterval(timer);};
  }, []);
  useEffect(() => {
    if (!isZoomed) return;
    const overflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({preventScroll: true});
    return () => {document.body.style.overflow = overflow; if (trigger?.getClientRects().length) trigger.focus({preventScroll: true});};
  }, [isZoomed]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isZoomed) { if (event.key === 'Escape') closeZoom(); return; }
      if (event.defaultPrevented || event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      const rect = sliderRef.current?.getBoundingClientRect();
      if (!rect?.height || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      if (event.key === 'ArrowLeft') {event.preventDefault(); selectSlide(currentSlide - 1);}
      if (event.key === 'ArrowRight') {event.preventDefault(); selectSlide(currentSlide + 1);}
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isZoomed, closeZoom, selectSlide, currentSlide]);

  if (!isDesktop && collapsed) return null;
  return <motion.div ref={sliderRef} layout layoutDependency={collapsed} initial={false} transition={transition}
    className={`visual-art-slider${collapsed ? ' visual-art-slider-collapsed' : ''}`} style={{originX: 0, originY: 0}}>
    {!collapsed && <ImmersiveHomeChrome />}
    {slides.length ? collapsed ? <FixedSlideStage slides={slides} current={Math.min(currentSlide, slides.length - 1)}
      collapsed={collapsed} select={selectSlide}
      zoom={button => {triggerRef.current = button; setIsZoomed(true);}} />
      : <CardOpeningStage slides={slides} current={Math.min(currentSlide, slides.length - 1)} select={selectSlide}
        playing={playing} togglePlaying={() => setPlaying(value => !value)}
        zoom={button => {triggerRef.current = button; setIsZoomed(true);}} />
      : <div className="travel-empty"><div role={error ? 'alert' : 'status'}>
        <p>{loading ? 'Đang tải ảnh…' : error ? 'Không tải được ảnh nổi bật.' : 'Chưa có ảnh nổi bật'}</p>
        {error && !loading && <button type="button" className="slider-retry" onClick={() => void useSliderStore.getState().fetchSlides()}><RefreshCw size={18} /> Thử lại</button>}
      </div></div>}
    {collapsed && <div className="travel-controls">
      <button className="slider-previous" type="button" disabled={slides.length < 2} aria-label={t('visualArtSlider.previousSlide')} onClick={() => selectSlide(currentSlide - 1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
      </button>
      <span aria-live="polite" aria-label={`Ảnh ${currentSlide + 1} trên ${slides.length}`}>{String(currentSlide + 1).padStart(2, '0')} <i><b>/</b> {String(slides.length).padStart(2, '0')}</i></span>
      <button className="slider-next" type="button" disabled={slides.length < 2} aria-label={t('visualArtSlider.nextSlide')} onClick={() => selectSlide(currentSlide + 1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>
    {!collapsed && slides.length > 1 && <div className="minimal-pagination" role="group" aria-label="Chọn ảnh"
      style={{width: Math.min(5, slides.length) * 24}}>
      <div className="minimal-pagination-track" style={{transform: `translateX(${-paginationStart * 24}px)`}}>
        {slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`Đến ảnh ${index + 1}: ${slide.title}`}
          aria-pressed={index === currentSlide} aria-hidden={index < paginationStart || index >= paginationStart + 5}
          tabIndex={index < paginationStart || index >= paginationStart + 5 ? -1 : 0}
          data-distance={Math.min(Math.abs(index - currentSlide), 2)} onClick={() => selectSlide(index)} />)}
      </div>
    </div>}
    </div>}
    {isZoomed && active && createPortal(<div className="zoom-overlay" role="dialog" aria-modal="true" aria-label={`Ảnh phóng to: ${active.title}`}
      onClick={event => {if (event.target === event.currentTarget) closeZoom();}}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
        if (event.shiftKey && document.activeElement === buttons[0]) {event.preventDefault(); buttons[buttons.length - 1]?.focus();}
        else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {event.preventDefault(); buttons[0]?.focus();}
      }}>
      <button ref={closeRef} className="slider-zoom-close" aria-label="Đóng ảnh phóng to" onClick={closeZoom}>×</button>
      <SliderZoomImage key={active.fullImage || active.image} src={active.fullImage || active.image} preview={active.image} alt={active.title} close={closeZoom} />
    </div>, document.body)}
  </motion.div>;
});
