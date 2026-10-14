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
    let headerHeight = header?.offsetHeight ?? 80;
    body.classList.remove('home-header-hidden');
    if (header) header.inert = false;
    const measure = () => {
      const stage = slider?.querySelector<HTMLElement>('.travel-stage') ?? slider;
      stageEnd = stage ? stage.getBoundingClientRect().bottom + window.scrollY : window.innerHeight;
      headerHeight = header?.offsetHeight ?? 80;
    };
    const update = () => {
      frame = 0;
      const scroll = Math.max(0, window.scrollY);
      body.classList.toggle('home-cinematic-active', scroll <= 12 && scroll < stageEnd - headerHeight);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = () => {
      measure();
      schedule();
    };
    const observer = new ResizeObserver(resize);
    if (slider) observer.observe(slider);
    measure();
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resize);
      body.classList.remove('home-cinematic-layout', 'home-cinematic-active', 'home-header-hidden');
      if (header) header.inert = false;
    };
  }, []);
  return null;
}
