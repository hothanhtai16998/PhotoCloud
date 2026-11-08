import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { StudioPackage } from '@/constants/packages';
import { PackageCard } from '../booking/PackageCard';
import './HomePackageStory.css';

/** Scroll progress selects one package; ordinary page scrolling is never blocked. */
export function HomePackageStory({ packages, preview }: { packages: StudioPackage[]; preview: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const current = Math.min(index, packages.length - 1);
  useEffect(() => {
    if (!track.current || !stage.current) return;
    let frame = 0;
    const update = (): void => {
      frame = 0;
      const root = track.current, content = stage.current;
      if (!root || !content) return;
      const fits = innerWidth >= 769 && content.offsetHeight <= innerHeight - 136 && packages.length > 1;
      setScrolling(fits);
      const step = innerHeight * .75;
      root.style.height = fits ? `${content.offsetHeight + step * packages.length}px` : '';
      if (fits) {
        const progress = Math.max(0, 112 - root.getBoundingClientRect().top);
        const next = Math.min(packages.length - 1, Math.floor((progress + 1) / step));
        const panel = content.querySelectorAll<HTMLElement>('.home-package-panel')[next];
        if (content.querySelector('.home-package-panel:not([hidden])')?.contains(document.activeElement) && panel?.hidden) {
          content.querySelector<HTMLButtonElement>('.home-package-navigation button:not(:disabled)')?.focus({ preventScroll: true });
        }
        setIndex(next);
      }
    };
    const schedule = (): void => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule); observer.observe(stage.current);
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    stage.current.addEventListener('focusout', schedule);
    const content = stage.current;
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); content.removeEventListener('focusout', schedule); };
  }, [packages.length]);
  const select = (next: number): void => {
    if (next < 0 || next >= packages.length) return;
    setIndex(next);
    if (scrolling && track.current) window.scrollTo({ top: track.current.getBoundingClientRect().top + scrollY - 112 + innerHeight * .75 * next, behavior: 'instant' });
  };
  return <div ref={track} className="home-package-track" data-scroll-packages={scrolling}>
    <div ref={stage} className="home-package-stage">
      <nav className="home-package-navigation" aria-label="Chuyển gói chụp">
        <button type="button" disabled={current === 0} onClick={() => select(current - 1)} aria-label="Gói trước"><ArrowLeft size={18} /></button>
        <span role="status" aria-live="polite">Gói {current + 1} / {packages.length}</span>
        <button type="button" disabled={current === packages.length - 1} onClick={() => select(current + 1)} aria-label="Gói tiếp theo"><ArrowRight size={18} /></button>
      </nav>
      {packages.map((pkg, item) => <div className="home-package-panel" key={pkg.id} hidden={item !== current} inert={item !== current}>
        <PackageCard pkg={pkg} preview={preview} />
      </div>)}
      {scrolling && <p className="home-package-scroll-hint">Cuộn tiếp để xem gói kế tiếp, hoặc dùng hai nút chuyển gói.</p>}
    </div>
  </div>;
}
