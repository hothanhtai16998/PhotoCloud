import { useLayoutEffect } from 'react';

export function useHeaderSurface(pathname: string): void {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>('.PHOTOCLOUD-header');
    const root = document.getElementById('root');
    if (!header || !root) return;
    // Admin has no heading wash; chart mutations must not trigger layout reads.
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      header.dataset.surface = 'canvas';
      return () => { delete header.dataset.surface; };
    }
    let frame = 0;
    let boundary = 0;
    let canvas = false;
    let observedBand: HTMLElement | null = null;
    const update = () => {
      frame = 0;
      // At the top, always restore the heading surface. With boundary=0 the
      // hysteresis threshold becomes -3 and would otherwise keep canvas forever.
      const next = window.scrollY > 0 && window.scrollY >= boundary + (canvas ? -3 : 3);
      if (next !== canvas) {
        canvas = next;
        header.dataset.surface = next ? 'canvas' : 'heading';
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      // Startup shells outside React can remain hidden on other routes. Their
      // geometry must not determine the active page's header surface.
      const homeHero = root.querySelector<HTMLElement>('.homepage .hero-section');
      const hero = homeHero ?? root.querySelector<HTMLElement>('.explore-hero,.blog-hero,.about-hero,.travel-stage');
      const page = root.querySelector<HTMLElement>('.app-body [class$="-page"],.app-body [class*="-page "]');
      const band = hero ?? page;
      if (band !== observedBand) {
        if (observedBand) resize.unobserve(observedBand);
        observedBand = band;
        if (band) resize.observe(band);
      }
      if (!band) { boundary = 0; schedule(); return; }
      const style = getComputedStyle(band);
      const bandHeight = parseFloat(style.backgroundSize.split(',')[0].trim().split(/\s+/)[1] ?? '0');
      const height = hero ? band.getBoundingClientRect().height : style.backgroundImage !== 'none' ? bandHeight || 0 : 0;
      boundary = Math.max(0, band.getBoundingClientRect().top + window.scrollY + height - header.offsetHeight);
      schedule();
    };
    // Lazy routes may mount after the persistent header. Only measure on layout changes.
    const mutations = new MutationObserver(measure);
    mutations.observe(root, { childList: true, subtree: true });
    const resize = new ResizeObserver(measure);
    resize.observe(header);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', schedule, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', schedule);
      delete header.dataset.surface;
    };
  }, [pathname]);
}
