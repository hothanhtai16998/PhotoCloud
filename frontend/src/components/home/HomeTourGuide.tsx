import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { Camera, ArrowRight, X } from 'lucide-react';
import { openBookingModal } from '@/utils/bookingModalEvent';
import type { GuideAction, PhotographerController } from './createPhotographer';
import './HomeTourGuide.css';
import { stops, contentState, type Choice, type Dialogue } from './homeGuideDialogue';

/** One character, one current scene, and a temporary response to the visitor. */
export function HomeTourGuide() {
  const navigate = useNavigate();
  const actor = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<PhotographerController | null>(null);
  const current = useRef(0);
  const feedbackTimer = useRef(0);
  const feedbackTarget = useRef<HTMLElement | null>(null);
  const pinned = useRef(false);
  const reduced = Boolean(useReducedMotion());
  const [stop, setStop] = useState(0);
  const [reaction, setReaction] = useState<Dialogue | null>(null);
  const [availability, setAvailability] = useState<Dialogue | null>(null);
  const [hidden, setHidden] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const [dismissedHint, setDismissedHint] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const clearFeedback = useCallback(() => {
    window.clearTimeout(feedbackTimer.current);
    feedbackTarget.current = null;
    pinned.current = false;
    setReaction(null);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const element = canvas.current;
    if (!element) return;
    void import('./createPaperGuide').then(async ({ createPaperGuide }) => {
      if (abort.signal.aborted) return;
      const guide = await createPaperGuide(element, abort.signal);
      if (abort.signal.aborted) { guide.dispose(); return; }
      controller.current = guide;
      guide.setAction(stops[current.current].action);
      setStatus('ready');
    }).catch(() => { if (!abort.signal.aborted) setStatus('fallback'); });
    return () => { abort.abort(); controller.current?.dispose(); controller.current = null; };
  }, []);

  useEffect(() => {
    const element = actor.current;
    if (!element) return;
    clearFeedback();
    const home = document.querySelector('.homepage');
    let frame = 0, settle = 0, stateKey = '', lastScrollAt = 0;
    const update = () => {
      frame = 0;
      // Read below the header. A midpoint skips short sections such as the process.
      const readingLine = Math.max(120, Math.min(innerHeight * .3, 280));
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const anchors = stops.map(item => {
        const node = document.querySelector(item.selector);
        return node ? Math.min(maxScroll, node.getBoundingClientRect().top + scrollY - readingLine) : null;
      });
      let index = 0;
      anchors.forEach((anchor, i) => { if (anchor !== null && scrollY >= anchor) index = i; });
      if (index !== current.current) {
        current.current = index; setStop(index); clearFeedback(); setAssistOpen(false); setCompactOpen(false);
      }
      stops.forEach((item, i) => document.querySelector(item.selector)?.setAttribute('data-tour-active', String(i === index)));
      const available = contentState(index);
      const key = index + ':' + (available?.caption ?? '') + ':' + (available?.choices.map(choice => choice.label + String(choice.target instanceof HTMLElement ? choice.target.textContent : choice.target)).join('|') ?? '');
      if (key !== stateKey) { stateKey = key; setAvailability(available); }
      const modal = document.querySelector<HTMLElement>('.booking-modal-backdrop, [role="dialog"][aria-modal="true"]');
      const typing = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
      const passive = Boolean(modal || typing);
      // Anchor to the viewport bottom, independently of section rectangles and
      // speech height. Only the horizontal track changes between authored scenes.
      const compact = innerWidth < 1100 || innerHeight < 560;
      const collapsed = element.classList.contains('is-collapsed');
      const popup = element.dataset.popupOpen === 'true';
      const portrait = passive || collapsed || compact && !popup;
      const side = 'left';
      const bottomNav = document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect();
      const bottomInset = bottomNav && bottomNav.height > 0 ? Math.max(24, innerHeight - bottomNav.top + 16) : 24;
      const intro = Math.max(0, 1 - scrollY / 420);
      const width = portrait ? (passive ? 52 : 76) : Math.min(innerWidth - 48, 440 + 120 * intro);
      element.style.setProperty('--guide-intro', String(intro));
      element.dataset.compact = String(compact);
      element.dataset.mode = portrait ? 'portrait' : 'full';
      element.dataset.passive = String(passive);
      element.dataset.side = side;
      element.style.width = width + 'px';
      element.style.bottom = bottomInset + 'px';
      const character = element.querySelector<HTMLButtonElement>('.home-tour-character');
      character?.style.setProperty('border-radius', portrait ? '50%' : '0', 'important');
      element.querySelectorAll<HTMLButtonElement>('.home-tour-actions button, .home-tour-ask').forEach(button => button.style.setProperty('border-radius', '24px', 'important'));
      element.querySelector<HTMLButtonElement>('.home-tour-close')?.style.setProperty('border-radius', '50%', 'important');
      const targetX = 24;
      // A passive portrait remains at the same bottom corner outside form fields.
      element.style.zIndex = modal ? '2300' : '1400';
      element.inert = passive;
      element.dataset.moving = 'false';
      element.style.transform = `translate3d(${targetX}px,0,0)`;
      element.dataset.scene = String(index);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const scroll = () => {
      lastScrollAt = performance.now();
      const selected = feedbackTarget.current?.getBoundingClientRect();
      if (selected && (selected.bottom < 100 || selected.top > innerHeight - 80)) clearFeedback();
      schedule();
    };
    const react = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const item = target?.closest<HTMLElement>('[data-guide-caption], .home-package-card, .hero-collection-item, .home-faq-item button, .home-journey-photo-pair figure, .home-shoot-story li') ?? target?.closest<HTMLElement>('.homepage a, .homepage button');
      if (!item || item.matches(':disabled')) return;
      if (item.closest('.home-package-navigation')) { clearFeedback(); schedule(); return; }
      if (item.matches('.travel-stage')) return;
      if (item.closest('#home-packages [role="status"]')) return;
      if (event.type === 'pointermove' && (pinned.current || performance.now() - lastScrollAt < 180)) return;
      const pkg = item.closest<HTMLElement>('.home-package-card');
      if (event.type === 'pointermove' && feedbackTarget.current === (pkg ?? item)) return;
      // A click/focus may scroll its target into view before the scheduled frame.
      // Commit that scene first so the next frame cannot erase this new response.
      if (frame) cancelAnimationFrame(frame);
      update();
      const faq = item.matches('.home-faq-item button');
      const photo = Boolean(item.closest('.home-journey-photo-pair'));
      const album = item.dataset.guideAction === 'album' || Boolean(item.closest('.hero-collection, #home-chapter-2'));
      const title = (pkg?.querySelector('h3, h4')?.textContent || item.querySelector('h3, h4')?.textContent || item.textContent || '').trim();
      const action: GuideAction = faq ? 'listen' : item.dataset.guideAction === 'calendar' ? 'calendar' : photo || item.dataset.guideAction === 'photo' ? 'photo' : album ? 'album' : 'point';
      const caption = item.dataset.guideCaption || pkg?.dataset.guideCaption || (faq ? 'Cùng tìm câu trả lời cho câu hỏi này nhé.' : album ? 'Bạn thích bộ ảnh này? Tôi có thể dẫn bạn xem thêm.' : title ? `Bạn có thể chọn “${title.slice(0, 80)}” để tiếp tục.` : stops[current.current].caption);
      // Generic toggles (save/pause/slider) must not become a misleading "view" action.
      const control = pkg?.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? (item.matches('a[href]') ? item : item.querySelector<HTMLElement>('a[href]'));
      const choices: Choice[] = photo ? [{ label: 'Mở ảnh đang chọn', target: '.home-photo-details a', click: true }, { label: 'Thông tin bức ảnh', target: '.home-photo-details' }]
        : faq ? [{ label: 'Câu hỏi khác', target: '.home-booking-faq' }, { label: 'Liên hệ studio', target: '/contact' }]
        : album ? [{ label: 'Mở bộ sưu tập này', target: item.closest<HTMLAnchorElement>('a[href]') ?? '.home-collection-open', click: true }, { label: 'Xem bộ khác', target: '#home-chapter-2' }]
        : pkg ? [...(pkg.querySelector('summary') ? [{ label: 'Xem gồm những gì', target: pkg.querySelector<HTMLElement>('summary')!, click: true }] : []), ...(control ? [{ label: 'Chọn gói này', target: control, click: true }] : [{ label: 'Liên hệ studio', target: '/contact' }])]
        : control ? [{ label: 'Xem mục này', target: control, click: true }] : stops[current.current].choices;
      clearFeedback();
      pinned.current = event.type === 'click';
      feedbackTarget.current = pkg ?? item;
      setReaction({ caption, action, choices }); setAssistOpen(false);
      feedbackTimer.current = window.setTimeout(clearFeedback, 6500);
    };
    window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule); document.addEventListener('focusout', schedule);
    home?.addEventListener('pointermove', react); home?.addEventListener('focusin', react); home?.addEventListener('click', react);
    const resize = new ResizeObserver(schedule); if (home) resize.observe(home); resize.observe(element);
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open', 'data-guide-auto', 'data-guide-caption', 'data-guide-target', 'aria-pressed', 'disabled'] });
    schedule(); settle = window.setTimeout(schedule, 800);
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(settle); window.clearTimeout(feedbackTimer.current);
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule); document.removeEventListener('focusout', schedule);
      home?.removeEventListener('pointermove', react); home?.removeEventListener('focusin', react); home?.removeEventListener('click', react);
      resize.disconnect(); mutations.disconnect();
      stops.forEach(item => document.querySelector(item.selector)?.removeAttribute('data-tour-active'));
    };
  }, [reduced, clearFeedback]);

  const scene = stops[stop];
  const dialogue = reaction ?? availability ?? scene;
  useEffect(() => { controller.current?.setAction(assistOpen ? 'wave' : dialogue.action); }, [assistOpen, dialogue.action, status]);
  useEffect(() => {
    if (!assistOpen && !compactOpen) return;
    const returnFocus = () => {
      const selector = '.home-tour-character';
      actor.current?.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true });
    };
    const close = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); setAssistOpen(false); setCompactOpen(false); returnFocus();
    };
    const outside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !actor.current?.contains(event.target)) { setAssistOpen(false); setCompactOpen(false); }
    };
    actor.current?.querySelector<HTMLButtonElement>('.home-tour-actions button')?.focus({ preventScroll: true });
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); };
  }, [assistOpen, compactOpen]);
  useEffect(() => {
    if (hidden) actor.current?.querySelector<HTMLButtonElement>('.home-tour-character')?.focus({ preventScroll: true });
  }, [hidden]);

  const activate = (choice: Choice) => {
    setAssistOpen(false);
    if (choice.target === 'intro') { clearFeedback(); setReaction(availability ?? scene); return; }
    setCompactOpen(false);
    if (choice.target instanceof HTMLElement) { if (choice.target.isConnected && !choice.target.matches(':disabled')) choice.target.click(); return; }
    if (choice.target === 'booking') { openBookingModal(); return; }
    if (choice.target.startsWith('/')) { navigate(choice.target); return; }
    const target = document.querySelector<HTMLElement>(choice.target);
    if (choice.click) { if (target && !target.matches(':disabled')) target.click(); }
    else target?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  };
  useEffect(() => {
    const timer = window.setTimeout(() => setDismissedHint(dialogue.caption), 6500);
    return () => window.clearTimeout(timer);
  }, [stop, dialogue.caption]);
  const choices = assistOpen ? [{ label: 'Giới thiệu phần đang xem', target: 'intro' }, { label: 'Dẫn tôi đi xem ảnh', target: '/explore' }, { label: 'Tôi muốn tìm gói chụp', target: '#home-packages' }] : dialogue.choices;
  return createPortal(<div id="home-tour-root" ref={actor} className={`home-tour${hidden ? ' is-collapsed' : ''}`} data-popup-open={compactOpen} aria-label="Người bạn dẫn đường PhotoCloud">
    <div className="home-tour-expanded">
      {(compactOpen || !hidden) && <button className="home-tour-close" type="button" onClick={() => { setHidden(true); setAssistOpen(false); setCompactOpen(false); }} aria-label="Thu gọn hội thoại" title="Thu gọn hội thoại"><X size={16} /></button>}
      <button type="button" className="home-tour-character" onClick={() => { setHidden(false); setCompactOpen(true); setAssistOpen(value => !value); }} aria-label="Hỏi người bạn PhotoCloud" aria-expanded={assistOpen} aria-controls="paper-guide-actions">
        <canvas ref={canvas} className={status === 'ready' ? 'is-ready' : ''} aria-hidden="true" />
        {status !== 'ready' && <span className="home-tour-fallback"><Camera size={42} strokeWidth={1.2} /><span>{status === 'loading' ? 'Chào bạn!' : 'Cùng khám phá nhé.'}</span></span>}
      </button>
      {dismissedHint !== dialogue.caption && !hidden && <span className="home-tour-hint" aria-hidden="true">{dialogue.caption}</span>}
      <div id="paper-guide-dialogue" className={`home-tour-speech${reaction ? ' is-reacting' : ''}`}>
        <div className="home-tour-message">
          <svg className="home-tour-shape" viewBox="0 0 440 190" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="paper-guide-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fef8f0" /><stop offset="1" stopColor="#fbf2e4" /></linearGradient></defs><path d="M81 14 C165 3 310 6 360 15 C407 21 425 54 422 106 C420 154 399 178 349 181 C269 184 142 184 81 176 C43 171 28 152 25 130 C18 137 6 140 0 135 C12 127 22 120 23 103 C17 58 34 24 81 14 Z" fill="url(#paper-guide-fill)" stroke="#e9dac4" strokeWidth="1.5" /></svg>
          <span className="home-tour-location">Bạn ảnh</span>
          <p>{assistOpen ? 'Bạn muốn tôi giúp gì? Chọn một việc bên dưới nhé.' : dialogue.caption}</p>
          <span className="home-tour-continue" aria-hidden="true" />
        </div>
        <div id="paper-guide-actions" className="home-tour-actions" role="group" aria-label="Chọn việc cần hướng dẫn">{choices.map(choice => <button type="button" key={choice.label} disabled={choice.target instanceof HTMLElement && choice.target.matches(':disabled')} onClick={() => activate(choice)}>{choice.label}<ArrowRight size={14} aria-hidden="true" /></button>)}</div>
        {!assistOpen && <button type="button" className="home-tour-ask" onClick={() => setAssistOpen(true)}>Bấm để hỏi tôi</button>}
      </div>
    </div>
  </div>, document.body);
}
