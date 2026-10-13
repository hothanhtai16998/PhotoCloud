import { useLayoutEffect } from 'react';
import './ImmersiveHomeChrome.css';

export function ImmersiveHomeChrome() {
  useLayoutEffect(() => {
    const body = document.body;
    const header = document.querySelector<HTMLElement>('.PHOTOCLOUD-header');
    const slider = document.querySelector<HTMLElement>('.visual-art-slider');
    body.classList.add('home-cinematic-layout');
    let frame = 0;
    let stageEnd = window.innerHeight;
    let anchor = Math.max(0, window.scrollY);
    let previous = anchor;
    let direction = 0;
    let hidden = false;
    const measure = () => {
      const stage = slider?.querySelector<HTMLElement>('.travel-stage') ?? slider;
      stageEnd = stage ? stage.getBoundingClientRect().bottom + window.scrollY : window.innerHeight;
    };
    const update = () => {
      frame = 0;
      const scroll = Math.max(0, window.scrollY);
      const nextDirection = Math.sign(scroll - previous);
      if (nextDirection && nextDirection !== direction) {
        anchor = previous;
        direction = nextDirection;
      }
      // Accumulate intentional scrolling instead of toggling on wheel noise.
      const interacting = header?.querySelector(':focus-visible, [aria-expanded="true"], [data-state="open"]');
      if (scroll < stageEnd - 16 || interacting || body.classList.contains('scroll-locked') || body.hasAttribute('data-scroll-locked')) {
        hidden = false;
        anchor = scroll;
      } else if (direction > 0 && scroll - anchor > 56) {
        hidden = true;
      } else if (direction < 0 && anchor - scroll > 24) {
        hidden = false;
      }
      body.classList.toggle('home-header-hidden', hidden);
      body.classList.toggle('home-cinematic-active', scroll < stageEnd - 16);
      if (header) header.inert = hidden;
      previous = scroll;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = () => { measure(); schedule(); };
    const observer = new ResizeObserver(resize);
    if (slider) observer.observe(slider);
    measure();
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resize);
    header?.addEventListener('focusin', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resize);
      header?.removeEventListener('focusin', schedule);
      body.classList.remove('home-cinematic-layout', 'home-cinematic-active', 'home-header-hidden');
      if (header) header.inert = false;
    };
  }, []);
  return null;
}
