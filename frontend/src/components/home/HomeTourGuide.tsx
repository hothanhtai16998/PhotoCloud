import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { Camera, ArrowRight, X, MessageCircle } from 'lucide-react';
import { openBookingModal } from '@/utils/bookingModalEvent';
import type { GuideAction, PhotographerController } from './createPhotographer';
import './HomeTourGuide.css';

const stops: { selector: string; action: GuideAction; caption: string; label: string; next?: string }[] = [
  { selector: '.travel-stage', action: 'wave', caption: 'Chào bạn. Cùng khám phá PhotoCloud nhé?', label: 'Cùng bắt đầu', next: '.home-wayfinding' },
  { selector: '.home-wayfinding', action: 'point', caption: 'Bạn có thể xem ảnh, khám phá bộ sưu tập hoặc tìm dịch vụ chụp. Chọn một lối đi nhé.', label: 'Xem bộ sưu tập nổi bật', next: '.hero-section' },
  { selector: '.hero-section', action: 'album', caption: 'Mở một bộ sưu tập để khám phá những ảnh bên trong, hoặc tiếp tục xem cách sử dụng PhotoCloud.', label: 'Tìm lối khám phá', next: '.home-journey' },
  { selector: '.home-journey', action: 'point', caption: 'Bạn muốn xem ảnh, bộ sưu tập hay tìm dịch vụ? Mỗi lựa chọn đều có lối đi riêng.', label: 'Thử xem một bức ảnh', next: '.home-journey-gallery' },
  { selector: '.home-journey-gallery', action: 'photo', caption: 'Chọn một ảnh: thông tin bên dưới sẽ đổi theo. Bạn cũng có thể mở trang ảnh thật.', label: 'Tìm hiểu bộ sưu tập', next: '#home-chapter-2' },
  { selector: '.home-shoot-story', action: 'album', caption: 'Chọn từng bước để xem cách đi từ một bộ sưu tập đến ảnh chi tiết.', label: 'Tìm dịch vụ chụp', next: '.home-journey-invitation' },
  { selector: '.home-journey-invitation', action: 'calendar', caption: 'Giờ đến buổi chụp của bạn. Cùng xem các gói nhé.', label: 'Xem gói chụp', next: '#home-packages' },
  { selector: '#home-packages', action: 'point', caption: 'Xem giá, thời lượng và nội dung từng gói trước khi chọn.', label: 'Xem quy trình', next: '.home-booking-flow' },
  { selector: '.home-booking-flow', action: 'calendar', caption: 'Chọn gói, gửi yêu cầu và theo dõi lịch chụp của bạn.', label: 'Đặt lịch chụp' },
  { selector: '.testimonials-carousel', action: 'album', caption: 'Phần câu chuyện này đang dùng nội dung minh họa.', label: 'Điều cần chuẩn bị', next: '.home-booking-faq' },
  { selector: '.home-booking-faq', action: 'listen', caption: 'Bạn còn băn khoăn? Mở một câu hỏi để tìm hiểu thêm.', label: 'Trao đổi với studio', next: '/contact' },
  { selector: '.home-bottom-cta', action: 'calendar', caption: 'Sẵn sàng rồi? Bắt đầu yêu cầu đặt lịch tại đây.', label: 'Đặt lịch chụp' },
];

/** One paper character persists; actual content geometry owns the current scene. */
export function HomeTourGuide() {
  const navigate = useNavigate();
  const actor = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<PhotographerController | null>(null);
  const current = useRef(0);
  const reduced = useReducedMotion();
  const [stop, setStop] = useState(0);
  const [reaction, setReaction] = useState('');
  const [hidden, setHidden] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  useEffect(() => {
    let cancelled = false;
    const element = canvas.current;
    if (!element) return;
    void import('./createPaperGuide').then(async ({ createPaperGuide }) => {
      if (cancelled) return;
      const guide = await createPaperGuide(element);
      if (cancelled) { guide.dispose(); return; }
      controller.current = guide;
      guide.setAction(stops[current.current].action);
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, [reduced]);
  useEffect(() => {
    const element = actor.current;
    if (!element) return;
    let previousTime = performance.now();
    let viewportWidth = innerWidth;
    let frame = 0, settle = 0, x = 0, y = 0, initialized = false, reactionTimer = 0;
    const update = () => {
      frame = 0;
      const mobile = innerWidth < 769;
      const anchors = stops.map(item => {
        const node = document.querySelector(item.selector);
        return node ? node.getBoundingClientRect().top + scrollY - innerHeight * .5 : null;
      });
      let index = 0;
      stops.forEach((item, i) => { const node = document.querySelector(item.selector); if (node && node.getBoundingClientRect().top < innerHeight * .5) index = i; });
      if (index !== current.current) {
        current.current = index; setStop(index); setReaction(''); controller.current?.setAction(stops[index].action);
      }
      stops.forEach((item, i) => document.querySelector(item.selector)?.setAttribute('data-tour-active', String(i === index)));
      const content = document.querySelector('#home-packages')?.getBoundingClientRect();
      const gutter = content ? Math.max(0, innerWidth - content.right) : 0;
      const compact = mobile || gutter < 140;
      const width = compact ? 28 : Math.min(210, gutter - 20);
      const height = compact ? 36 : element.getBoundingClientRect().height || 360;
      const railX = compact ? Math.min(innerWidth - 34, (content?.right ?? innerWidth - 40) + 4) : (content?.right ?? 0) + (gutter - width) / 2;
      const firstAnchor = Math.max(1, anchors[1] ?? innerHeight);
      const arrival = Math.min(1, Math.max(0, scrollY / firstAnchor));
      const smooth = (value: number): number => value * value * (3 - 2 * value);
      const targetX = compact ? railX : innerWidth * .065 + (railX - innerWidth * .065) * smooth(arrival);
      const docks = [.5, .25, .5, .2, .58, .32, .58, .25, .5, .3, .55, .35];
      const dockY = (i: number): number => i === 0 ? Math.max(105, innerHeight - height - 26) : Math.max(105, (innerHeight - height) * docks[i]);
      let before = 0;
      anchors.forEach((anchor, i) => { if (anchor !== null && scrollY >= anchor) before = i; });
      const after = Math.min(stops.length - 1, before + 1);
      const start = before === 0 ? 0 : anchors[before] ?? scrollY;
      const end = anchors[after] ?? start + innerHeight;
      const progress = after === before ? 1 : Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start)));
      const targetY = compact ? Math.max(100, innerHeight - 190) : dockY(before) + (dockY(after) - dockY(before)) * smooth(progress);
      const now = performance.now();
      const blend = reduced ? 1 : 1 - Math.exp(-Math.min(64, now - previousTime) / 120);
      previousTime = now;
      const viewportChanged = viewportWidth !== innerWidth;
      viewportWidth = innerWidth;
      if (!initialized || reduced || viewportChanged) { x = targetX; y = targetY; initialized = true; }
      const distance = Math.abs(targetY - y) + Math.abs(targetX - x);
      // Follow one continuous scroll route; section changes never reset the actor.
      x += (targetX - x) * blend; y += (targetY - y) * blend;
      element.style.width = width + 'px';
      element.dataset.compact = String(compact);
      element.style.transform = `translate3d(${x}px,${y}px,0)`;
      element.dataset.scene = String(index);
      element.dataset.immersive = String(index === 0 && Boolean(document.querySelector('.travel-stage .landscape')));
      const modal = Boolean(document.querySelector('.booking-modal-backdrop, [role="dialog"][aria-modal="true"]'));
      const typing = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
      element.style.visibility = modal || typing ? 'hidden' : '';
      controller.current?.setTravel(distance / 80);
      if (distance > .5 && !reduced) frame = requestAnimationFrame(update);
      else controller.current?.setTravel(0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const react = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const item = target?.closest<HTMLElement>('[data-guide-caption], .hero-collection-item, .home-package-card, .home-moods button, .home-faq-item button, .home-journey-photo-pair figure, .home-shoot-story li') ?? target?.closest<HTMLElement>('.homepage a, .homepage button');
      if (!item) return;
      if (event instanceof PointerEvent && event.relatedTarget instanceof Node && item.contains(event.relatedTarget)) return;
      const title = item.querySelector('h3, h4')?.textContent || item.textContent?.trim();
      const photo = item.matches('figure') || Boolean(item.querySelector('img'));
      const faq = item.matches('.home-faq-item button');
      const album = Boolean(item.closest('.hero-section, .testimonials-carousel, .home-shoot-story'));
      const message = item.dataset.guideCaption || (item.matches('.home-package-card') ? `Bạn đang xem: ${title?.slice(0, 90)}` : faq ? 'Cùng tìm câu trả lời cho câu hỏi này nhé.' : item.matches('.home-moods button') ? `Ý tưởng bạn chọn: ${title?.slice(0, 80)}` : photo ? 'Mở ảnh hoặc bộ sưu tập để khám phá nội dung và thông tin liên quan.' : title ? `Bạn có thể chọn “${title.slice(0, 90)}” để tiếp tục.` : stops[current.current].caption);
      setReaction(message);
      controller.current?.setAction(faq ? 'listen' : photo ? 'photo' : album ? 'album' : 'point');
      window.clearTimeout(reactionTimer);
      reactionTimer = window.setTimeout(() => { setReaction(''); controller.current?.setAction(stops[current.current].action); }, 3500);
    };
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule); document.addEventListener('focusout', schedule);
    const home = document.querySelector('.homepage');
    const entered = new WeakSet<Element>();
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || entered.has(entry.target)) return;
      entered.add(entry.target);
      if (!reduced) entry.target.animate([{ opacity: .75, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    }), { threshold: .12 });
    home?.querySelectorAll('.home-wayfinding, .home-journey-scene, .home-package-card, .home-booking-flow, .home-booking-faq, .testimonials-carousel, .home-bottom-cta').forEach(node => reveal.observe(node));
    home?.addEventListener('pointerover', react); home?.addEventListener('focusin', react); home?.addEventListener('click', react);
    const resize = new ResizeObserver(schedule); if (home) resize.observe(home);
    const mutations = new MutationObserver(schedule); mutations.observe(document.body, { childList: true, subtree: true });
    schedule();
    // Readiness/layout transitions can settle after a CSS animation without resizing the root.
    settle = window.setTimeout(schedule, 800);
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(settle); window.clearTimeout(reactionTimer);
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule); document.removeEventListener('focusout', schedule);
      home?.removeEventListener('pointerover', react); home?.removeEventListener('focusin', react); home?.removeEventListener('click', react);
      resize.disconnect(); mutations.disconnect(); reveal.disconnect();
      stops.forEach(item => document.querySelector(item.selector)?.removeAttribute('data-tour-active'));
    };
  }, [reduced]);
  const scene = stops[stop];
  const next = () => {
    if (!scene.next) { openBookingModal(); return; }
    if (scene.next.startsWith('/')) { navigate(scene.next); return; }
    document.querySelector(scene.next)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  };
  return createPortal(<div ref={actor} className={`home-tour${hidden ? ' is-collapsed' : ''}`} aria-label="Người bạn dẫn đường PhotoCloud">
    <button type="button" className="home-tour-compact" onClick={next} aria-label={scene.label} title={reaction || scene.caption}><MessageCircle size={18} /></button>
    {hidden && <button className="home-tour-reopen" type="button" onClick={() => setHidden(false)} aria-label="Mở người bạn dẫn đường"><MessageCircle size={20} /></button>}<div className="home-tour-expanded" hidden={hidden}>
      <button className="home-tour-close" type="button" onClick={() => setHidden(true)} aria-label="Ẩn người bạn dẫn đường"><X size={14} /></button>
      <button type="button" className="home-tour-character" onClick={() => controller.current?.greet()} aria-label="Chào người bạn dẫn đường">
        <canvas ref={canvas} className={status === 'ready' ? 'is-ready' : ''} aria-hidden="true" />
        {status !== 'ready' && <span className="home-tour-fallback"><Camera size={54} strokeWidth={1.2} /><span>{status === 'loading' ? 'Chào bạn!' : 'Cùng khám phá nhé.'}</span></span>}
      </button>
      <div className="home-tour-speech"><span className="home-tour-location">{stop + 1} / {stops.length} · {scene.label}</span><p key={reaction || scene.caption}>{reaction || scene.caption}</p><button type="button" onClick={next}>{scene.label}<ArrowRight size={14} /></button></div>
    </div>
  </div>, document.body);
}
