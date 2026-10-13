import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import './ImmersiveHomeChrome.css';

export function ImmersiveHomeChrome() {
  const [immersive, setImmersive] = useState(true);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    document.body.classList.add('home-cinematic-layout');
    let frame = 0;
    const update = () => {
      frame = 0;
      const stage = document.querySelector('.visual-art-slider .travel-stage');
      const header = document.querySelector('.PHOTOCLOUD-header');
      const active = !!stage && stage.getBoundingClientRect().bottom > (header?.getBoundingClientRect().height ?? 80);
      document.body.classList.toggle('home-cinematic-active', active);
      setImmersive(active);
      if (!active) setOpen(false);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.body.classList.remove('home-cinematic-layout', 'home-cinematic-active', 'home-cinematic-menu');
    };
  }, []);
  useLayoutEffect(() => {
    document.body.classList.toggle('home-cinematic-menu', open);
    const sidebar = document.querySelector<HTMLElement>('.image-page-sidebar');
    if (sidebar) sidebar.inert = immersive && !open;
    if (open) sidebar?.querySelector<HTMLElement>('a,button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('keydown', close); if (sidebar) sidebar.inert = false; };
  }, [open, immersive]);
  return createPortal(immersive ? <>
    <button ref={trigger} type="button" className="cinematic-menu-toggle" aria-label={open ? 'Đóng điều hướng' : 'Mở điều hướng'} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
    {open && <button type="button" className="cinematic-menu-backdrop" aria-label="Đóng điều hướng" onClick={() => { setOpen(false); trigger.current?.focus(); }} />}
  </> : null, document.body);
}
