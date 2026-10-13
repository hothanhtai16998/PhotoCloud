import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowRight, Bookmark, Globe2, Pause, Play } from 'lucide-react';
import './TimedSlider.css';

const slides = [
  { place: 'Nagano Prefecture', region: 'Japan Alps', title: 'NAGANO\nPREFECTURE', image: 'photo-1493976040374-85c8e12f0c0e', description: 'Ancient streets, quiet temples and mountain silhouettes. Discover a different rhythm beneath the Japanese Alps.' },
  { place: 'Sahara Desert · Morocco', region: 'Marrakech Merzouga', title: 'MARRAKECH\nMERZOUGA', image: 'photo-1509316785289-025f5b846b35', description: 'Beyond the city, a sea of golden dunes stretches to the horizon. Follow the light into the heart of the Sahara.' },
  { place: 'Sierra Nevada · USA', region: 'Yosemite National Park', title: 'YOSEMITE\nNATIONAL PARK', image: 'photo-1472396961693-142e6e269027', description: 'Granite peaks, forest trails and wide open skies. Find your own path through a landscape shaped by time.' },
  { place: 'Tarifa · Spain', region: 'Los Lances Beach', title: 'LOS LANCES\nBEACH', image: 'photo-1473116763249-2faaef81ccda', description: 'Where the Atlantic meets the Mediterranean, the wind carries you towards endless beaches and sunlit evenings.' },
  { place: 'Cappadocia · Turkey', region: 'Göreme Valley', title: 'GÖREME\nVALLEY', image: 'photo-1557972359-152b6ebd3eb3', description: 'Rise above sculpted valleys and hidden cave houses. A hundred balloons welcome the first light of a new day.' },
  { place: 'Switzerland Alps', region: 'Saint Antonien', title: 'SAINT\nANTONIEN', image: 'photo-1464822759023-fed622ff2c3b', description: 'Snow-covered summits, alpine lakes and peaceful mountain villages. Let the world slow down for a while.' },
];
const url = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=85`;
const interval = 5500;
const duration = 500;

function TimedSlider() {
  const [active, setActive] = useState(0);
  const [background, setBackground] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [moving, setMoving] = useState(false);
  const [saved, setSaved] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const busy = useRef(false);
  const activeRef = useRef(0);
  const changeRef = useRef<(index: number) => void>(() => {});
  const pending = useRef<{ cancel: () => void } | null>(null);
  const slide = slides[active];

  const change = async (index: number) => {
    if (busy.current || index === activeRef.current || !stage.current) return;
    busy.current = true;
    const target = stage.current;
    const image = new Image();
    image.src = url(slides[index].image);
    try { await image.decode(); } catch { busy.current = false; return; }
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
    flushSync(() => { setMoving(true); });
    const leadIn = 70;
    try {
      await target.animate([{}, {}], { duration: leadIn }).finished;
    } catch { layer.remove(); busy.current = false; return; }
    if (!stage.current) { layer.remove(); busy.current = false; return; }
    activeRef.current = index;
    flushSync(() => { setActive(index); setSaved(false); });
    const cards = Array.from(target.querySelectorAll<HTMLElement>('[data-slide]'));
    const step = cards.length > 1 ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left : width + 20;
    cards.forEach(item => {
      const previous = oldPositions.get(item.dataset.slide);
      const offset = previous === undefined ? step : previous - item.getBoundingClientRect().left;
      item.animate([{ transform: `translate3d(${offset}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: duration - leadIn, easing });
    });
    try { await animation.finished; } catch { layer.remove(); busy.current = false; return; }
    // Commit the identical final image before removing its animated surface.
    flushSync(() => { setBackground(index); setMoving(false); });
    layer.remove();
    busy.current = false;
    pending.current = null;
  };
  changeRef.current = change;

  useEffect(() => {
    slides.forEach(item => { const image = new Image(); image.src = url(item.image); });
    return () => { pending.current?.cancel(); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => changeRef.current((activeRef.current + 1) % slides.length), interval);
    return () => window.clearInterval(timer);
  }, [playing]);

  return <main className={`travel-stage ${moving ? 'is-moving' : ''}`} ref={stage} style={{ '--slide-interval': `${interval}ms`, '--transition-duration': `${duration}ms` } as React.CSSProperties}>
    <div className="landscape" style={{ backgroundImage: `url("${url(slides[background].image)}")` }} />
    <div className="shade" />
    <header className="travel-header"><a href="/timed-slider.html" className="brand"><Globe2 size={20} /> GLOBE EXPRESS</a><span className="header-caption">THE WORLD IS WAITING</span></header>
    <section className="destination" key={active}>
      <div className="destination-rule" /><p className="location">{slide.place}</p>
      <h1>{slide.title.split('\n').map(line => <span key={line}>{line}</span>)}</h1>
      <p className="description">{slide.description}</p>
      <div className="destination-actions"><button className={`bookmark ${saved ? 'saved' : ''}`} onClick={() => setSaved(!saved)} title={saved ? 'Remove bookmark' : 'Bookmark destination'} aria-pressed={saved}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button><button className="discover" onClick={() => setPlaying(!playing)}>{playing ? 'PAUSE EXPLORING' : 'CONTINUE EXPLORING'}</button></div>
    </section>
    <div className="card-window"><div className="card-track">
      {Array.from({ length: 5 }, (_, offset) => (active + offset + 1) % slides.length).map((index, position) => <button className="destination-card" data-slide={index} key={index} style={{ '--position': position, backgroundImage: `url("${url(slides[index].image)}")` } as React.CSSProperties} onClick={() => change(index)} aria-label={`Explore ${slides[index].region}`}><div className="card-copy"><i /><span>{slides[index].place}</span><strong>{slides[index].region}</strong></div></button>)}
    </div></div>
    <footer className="slider-controls">
      <button title="Previous destination" onClick={() => change((active + slides.length - 1) % slides.length)} disabled={moving}><ArrowLeft size={20} /></button>
      <button title="Next destination" onClick={() => change((active + 1) % slides.length)} disabled={moving}><ArrowRight size={20} /></button>
      <button title={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <div className="progress-line"><div className="slide-progress" style={{ width: `${((active + 1) / slides.length) * 100}%` }} /><div className="timer-progress" key={`${active}-${playing}`} style={{ animationPlayState: playing ? 'running' : 'paused' }} /></div>
      <span className="slide-number">{String(active + 1).padStart(2, '0')}</span>
    </footer>
    <div className="top-timer" key={`timer-${active}-${playing}`} style={{ animationPlayState: playing ? 'running' : 'paused' }} />
  </main>;
}

createRoot(document.getElementById('root')!).render(<TimedSlider />);
