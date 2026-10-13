import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowRight, Bookmark, Globe2, Pause, Play } from 'lucide-react';
import './TimedCardSlider.css';

export interface TimedCard { place: string; region: string; title: string; image: string; description: string; }
const url = (source: string) => source;
const interval = 5500;
const duration = 500;
const decodedImages = new Map<string, Promise<HTMLImageElement>>();

function loadImage(source: string) {
  let ready = decodedImages.get(source);
  if (!ready) {
    const image = new Image();
    image.src = source;
    ready = image.decode().then(() => image).catch(error => {
      decodedImages.delete(source);
      throw error;
    });
    decodedImages.set(source, ready);
  }
  return ready;
}

export function TimedCardSlider({ slides, brandName = 'PhotoCloud', current = 0, onActiveChange }: { slides: TimedCard[]; brandName?: string; current?: number; onActiveChange?: (index: number) => void }) {
  const [active, setActive] = useState(current);
  const [background, setBackground] = useState(current);
  const [playing, setPlaying] = useState(true);
  const [moving, setMoving] = useState(false);
  const [saved, setSaved] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const busy = useRef(false);
  const activeRef = useRef(current);
  const changeRef = useRef<(index: number) => void>(() => {});
  const pending = useRef<{ cancel: () => void } | null>(null);
  const topProgress = useRef<HTMLDivElement>(null);
  const bottomProgress = useRef<HTMLDivElement>(null);
  const elapsedProgress = useRef(0);
  const slide = slides[active];

  const change = async (index: number) => {
    if (busy.current || index === activeRef.current || !stage.current) return;
    busy.current = true;
    const target = stage.current;
    let image: HTMLImageElement;
    try { image = await loadImage(url(slides[index].image)); } catch { busy.current = false; return; }
    if (!stage.current) { busy.current = false; return; }
    const card = target.querySelector<HTMLElement>(`[data-slide="${index}"]`);
    const bounds = target.getBoundingClientRect();
    const box = card?.getBoundingClientRect();
    const x = box ? box.left - bounds.left : bounds.width * .58;
    const y = box ? box.top - bounds.top : bounds.height * .4;
    const width = box?.width ?? 180;
    const height = box?.height ?? 270;
    const fullScale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
    const cardScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const easing = 'cubic-bezier(.42,0,.25,1)';
    const oldPositions = new Map(Array.from(target.querySelectorAll<HTMLElement>('[data-slide]'), item => [item.dataset.slide, item.getBoundingClientRect().left]));
    const layer = document.createElement('div');
    layer.className = 'opening-layer';
    const picture = document.createElement('div');
    picture.className = 'opening-picture';
    picture.style.backgroundImage = `url("${image.src}")`;
    layer.appendChild(picture);
    target.appendChild(layer);
    const imageWidth = image.naturalWidth * fullScale;
    const imageHeight = image.naturalHeight * fullScale;
    picture.style.width = `${imageWidth}px`;
    picture.style.height = `${imageHeight}px`;
    const initialImageZoom = cardScale / fullScale;
    const draw = (progress: number) => {
      const frameWidth = width + (bounds.width - width) * progress;
      const frameHeight = height + (bounds.height - height) * progress;
      const centerX = (x + width / 2) * (1 - progress) + bounds.width / 2 * progress;
      const centerY = (y + height / 2) * (1 - progress) + bounds.height / 2 * progress;
      const left = centerX - frameWidth / 2;
      const top = centerY - frameHeight / 2;
      layer.style.left = `${left}px`;
      layer.style.top = `${top}px`;
      layer.style.width = `${frameWidth}px`;
      layer.style.height = `${frameHeight}px`;
      layer.style.borderRadius = `${8 * (1 - progress)}px`;
      // All four edges approach the viewport together; the image retains its own aspect ratio.
      const imageZoom = initialImageZoom + (1 - initialImageZoom) * progress;
      picture.style.transform = `translate(-50%,-50%) scale(${imageZoom})`;
    };
    // One frame clock updates geometry and image scale atomically.
    draw(0);
    let frameId = 0;
    let cancel = () => {};
    const finished = new Promise<void>((resolve, reject) => {
      let start: number | undefined;
      const tick = (time: number) => {
        start ??= time;
        const elapsed = Math.min(1, (time - start) / duration);
        const progress = elapsed * elapsed * (3 - 2 * elapsed);
        draw(progress);
        if (elapsed < 1) frameId = requestAnimationFrame(tick);
        else resolve();
      };
      cancel = () => { cancelAnimationFrame(frameId); reject(new Error('Opening cancelled')); };
      frameId = requestAnimationFrame(tick);
    });
    const animation = { finished, cancel };
    pending.current = animation;
    // Leave the source slot open briefly so the opening rectangle stays visible.
    if (card) card.style.visibility = 'hidden';
    const leadIn = 70;
    activeRef.current = index;
    elapsedProgress.current = 0;
    onActiveChange?.(index);
    flushSync(() => { setMoving(true); setActive(index); setSaved(false); });
    const cards = Array.from(target.querySelectorAll<HTMLElement>('[data-slide]'));
    const step = cards.length > 1 ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left : width + 20;
    cards.forEach(item => {
      const previous = oldPositions.get(item.dataset.slide);
      const offset = previous === undefined ? step : previous - item.getBoundingClientRect().left;
      item.animate([{ transform: `translate3d(${offset}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: duration - leadIn, delay: leadIn, easing, fill: 'backwards' });
    });
    try { await animation.finished; } catch { layer.remove(); busy.current = false; return; }
    // Commit the identical final image before removing its animated surface.
    flushSync(() => { setBackground(index); setMoving(false); });
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    layer.remove();
    busy.current = false;
    pending.current = null;
  };
  changeRef.current = change;
  useEffect(() => { if (current !== activeRef.current) void changeRef.current(current); }, [current]);

  useEffect(() => {
    slides.forEach(item => { void loadImage(url(item.image)).catch(() => {}); });
    return () => { pending.current?.cancel(); };
  }, [slides]);
  useEffect(() => {
    const paint = () => {
      const width = `${Math.min(100, elapsedProgress.current / interval * 100)}%`;
      if (topProgress.current) topProgress.current.style.width = width;
      if (bottomProgress.current) bottomProgress.current.style.width = width;
    };
    paint();
    if (!playing || moving || slides.length < 2) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (time: number) => {
      if (previous !== undefined && !busy.current && document.visibilityState === 'visible') {
        elapsedProgress.current += time - previous;
      }
      previous = time;
      paint();
      if (elapsedProgress.current >= interval && !busy.current) {
        elapsedProgress.current = 0;
        changeRef.current((activeRef.current + 1) % slides.length);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, playing, moving, slides.length]);

  return <main className={`travel-stage ${moving ? 'is-moving' : ''}`} ref={stage} style={{ '--slide-interval': `${interval}ms`, '--transition-duration': `${duration}ms` } as React.CSSProperties}>
    <div className="landscape" style={{ backgroundImage: `url("${url(slides[background].image)}")` }} />
    <div className="shade" />
    <header className="travel-header"><a href="/" className="brand"><Globe2 size={20} /> {brandName}</a><span className="header-caption">BỘ SƯU TẬP ẢNH</span></header>
    <section className="destination" key={active}>
      <div className="destination-rule" /><p className="location">{slide.place}</p>
      <h1>{slide.title.split('\n').map(line => <span key={line}>{line}</span>)}</h1>
      <p className="description">{slide.description}</p>
      <div className="destination-actions"><button className={`bookmark ${saved ? 'saved' : ''}`} onClick={() => setSaved(!saved)} title={saved ? 'Remove bookmark' : 'Bookmark destination'} aria-pressed={saved}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button><button className="discover" onClick={() => setPlaying(!playing)}>{playing ? 'PAUSE EXPLORING' : 'CONTINUE EXPLORING'}</button></div>
    </section>
    <div className="card-window"><div className="card-track">
      {Array.from({ length: Math.min(5, slides.length - 1) }, (_, offset) => (active + offset + 1) % slides.length).map((index, position) => <button className="destination-card" data-slide={index} key={index} style={{ '--position': position, backgroundImage: `url("${url(slides[index].image)}")` } as React.CSSProperties} onClick={() => change(index)} aria-label={`Explore ${slides[index].region}`}><div className="card-copy"><i /><span>{slides[index].place}</span><strong>{slides[index].region}</strong></div></button>)}
    </div></div>
    <footer className="slider-controls">
      <button title="Previous destination" onClick={() => change((active + slides.length - 1) % slides.length)} disabled={moving}><ArrowLeft size={20} /></button>
      <button title="Next destination" onClick={() => change((active + 1) % slides.length)} disabled={moving}><ArrowRight size={20} /></button>
      <button title={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <div className="progress-line"><div className="slide-progress" style={{ width: `${((active + 1) / slides.length) * 100}%` }} /><div ref={bottomProgress} className="timer-progress" style={{ animation: 'none' }} /></div>
      <span className="slide-number">{String(active + 1).padStart(2, '0')}</span>
    </footer>
    <div ref={topProgress} className="top-timer" style={{ animation: 'none' }} />
  </main>;
}


