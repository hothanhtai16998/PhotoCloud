import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Location } from 'react-router-dom';
import { getImagePageScroll, type ImagePageScrollPosition } from '@/utils/imagePageScroll';

/** Restore once content has grown enough; user input always takes priority. */
export function useImagePageScrollRestore(
  location: Location,
  scrollerRef: RefObject<HTMLDivElement | null>,
  ready: boolean,
  isBackground: boolean,
  imageId: string | undefined,
  imageCount: number,
): void {
  const restored = useRef<ImagePageScrollPosition | undefined>(undefined);
  useLayoutEffect(() => {
    const position = getImagePageScroll(location);
    const scroller = scrollerRef.current;
    if (!ready || !scroller || !position || restored.current === position) return;
    let frame = 0;
    let stopped = false;
    const originalRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const stop = (): void => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('keydown', cancel);
      window.history.scrollRestoration = originalRestoration;
    };
    const cancel = (): void => {
      restored.current = position;
      stop();
    };
    const restore = (): void => {
      if (stopped) return;
      scroller.scrollTop = position.contentY;
      window.scrollTo({ top: position.windowY, behavior: 'instant' });
      if (Math.abs(scroller.scrollTop - position.contentY) <= 1 && Math.abs(window.scrollY - position.windowY) <= 1) {
        restored.current = position;
        stop();
      }
    };
    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(restore);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    Array.from(scroller.children).forEach(child => observer.observe(child));
    if (!isBackground) {
      window.addEventListener('wheel', cancel, { passive: true });
      window.addEventListener('touchstart', cancel, { passive: true });
      window.addEventListener('keydown', cancel);
    }
    schedule();
    return stop;
  }, [location, scrollerRef, ready, isBackground, imageId, imageCount]);
}
