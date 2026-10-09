import { useRef, useState } from 'react';
import type { SlideData } from '@/stores/useSliderStore';

export function FixedSlideStage({slides, current, collapsed, select, zoom}: {
  slides: SlideData[]; current: number; collapsed: boolean;
  select: (index: number) => void; zoom: (button: HTMLButtonElement) => void;
}) {
  const pointer = useRef<{x: number; id: number} | null>(null);
  const dragged = useRef(false);
  // Keep the outgoing photograph opaque underneath the incoming one.
  // Fading both layers exposes the light card background at the midpoint.
  const [frame, setFrame] = useState<{current: number; previous: number | null}>({current, previous: null});
  if (frame.current !== current) setFrame({current, previous: frame.current});
  const previous = (current - 1 + slides.length) % slides.length;
  const next = (current + 1) % slides.length;
  return <div className={`fixed-stage stage-fade${frame.previous !== null ? ' has-previous' : ''}`}>
    <div className="fixed-stage-row">
      <button type="button" className="travel-card fixed-stage-main" aria-label={`Phóng to ảnh: ${slides[current].title}`}
        onPointerDown={event => {pointer.current = {x: event.clientX, id: event.pointerId}; dragged.current = false;}}
        onPointerUp={event => {
          if (pointer.current?.id !== event.pointerId) return;
          const delta = event.clientX - pointer.current.x;
          pointer.current = null;
          if (Math.abs(delta) > 45) {dragged.current = true; select(delta > 0 ? previous : next);}
        }}
        onPointerCancel={() => {pointer.current = null;}}
        onClick={event => {if (!dragged.current) zoom(event.currentTarget); dragged.current = false;}}>
        {slides.map((slide, index) => <span key={slide.id} aria-hidden={index !== current}
          className={`fixed-stage-layer${index === current ? ' is-current' : index === frame.previous ? ' is-previous' : ''}`}>
          <img className="slide-image" src={slide.image} alt={slide.title} draggable={false} loading="eager" decoding="async" />
          {collapsed && <span className="travel-caption"><strong>{slide.title}</strong></span>}
        </span>)}
      </button>
    </div>
  </div>;
}
