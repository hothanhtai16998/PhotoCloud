import { useState, useRef, useLayoutEffect, useEffect, useId, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { ImageModalChart } from './ImageModalChart';
import type { Image } from '@/types/image';
import { t } from '@/i18n';
import './ImageModalInfo.css';
import './modal-info.css';

interface ImageModalInfoProps { image: Image }

const ImageModalInfoContent = memo(({ image }: ImageModalInfoProps) => {
  const [openImageId, setOpenImageId] = useState<string | null>(null);
  const showInfoModal = openImageId === image._id;
  const [activeTab, setActiveTab] = useState<'views' | 'downloads'>('views');
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoModalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  useLayoutEffect(() => {
    if (!showInfoModal) return;
    const panel = infoModalRef.current;
    const button = infoButtonRef.current;
    if (!panel || !button) return;
    let frame = 0;
    const updatePosition = () => {
      const anchor = button.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const margin = 12, gap = 8;
      const below = anchor.top < height + gap + margin && window.innerHeight - anchor.bottom >= height + gap + margin;
      const top = below ? anchor.bottom + gap : anchor.top - height - gap;
      panel.style.left = `${Math.max(margin, Math.min(anchor.right - width, window.innerWidth - width - margin))}px`;
      panel.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - height - margin))}px`;
      panel.style.visibility = 'visible';
    };
    const schedulePosition = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; updatePosition(); });
    };
    updatePosition();
    closeButtonRef.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(schedulePosition);
    observer.observe(panel);
    window.addEventListener('scroll', schedulePosition, true);
    window.addEventListener('resize', schedulePosition);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedulePosition, true);
      window.removeEventListener('resize', schedulePosition);
    };
  }, [showInfoModal]);

  useEffect(() => {
    if (!showInfoModal) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !infoButtonRef.current?.contains(target) && !infoModalRef.current?.contains(target)) {
        setOpenImageId(null);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [showInfoModal]);

  const daysAgoText = useMemo(() => {
    const published = new Date(image.createdAt).getTime();
    const days = Number.isFinite(published) ? Math.max(0, Math.floor((new Date().getTime() - published) / 86400000)) : 0;
    return days === 0 ? t('notifications.justNow') : t('notifications.daysAgo', { count: days });
  }, [image.createdAt]);

  const close = () => {
    setOpenImageId(null);
    infoButtonRef.current?.focus({ preventScroll: true });
  };

  return <>
    <button ref={infoButtonRef} type="button" className={`modal-footer-btn image-info-trigger ${showInfoModal ? 'active' : ''}`}
      aria-label={t('image.info')} title={t('image.info')}
      aria-haspopup="dialog" aria-expanded={showInfoModal} aria-controls={showInfoModal ? dialogId : undefined}
      onClick={() => { setActiveTab('views'); setOpenImageId(showInfoModal ? null : image._id); }}>
      <Info size={18} /><span>{t('image.info')}</span>
    </button>
    {showInfoModal && createPortal(
      <div ref={infoModalRef} id={dialogId} className="info-modal-wrapper" style={{ visibility: 'hidden' }} role="dialog" aria-labelledby={`${dialogId}-title`}
        onKeyDown={event => {
          // ImagePage also handles Escape/arrows; keys inside this panel belong to it.
          event.stopPropagation();
          if (event.key === 'Escape') { event.preventDefault(); close(); }
          // Return to the trigger before the browser advances Tab within the photo.
          if (event.key === 'Tab') close();
        }}>
        <div className="info-modal">
          <div className="info-modal-header">
            <h2 id={`${dialogId}-title`} className="info-modal-title">{t('image.info')}</h2>
            <button ref={closeButtonRef} type="button" className="info-modal-close" onClick={close} aria-label="Close info modal">×</button>
          </div>
          <div className="info-modal-content">
            <div className="info-published">{t('image.published')} {daysAgoText}</div>
            <ImageModalChart key={`${image._id}:${activeTab}`} image={image} activeTab={activeTab} />
            <div className="info-tabs" role="group" aria-label={t('image.info')}>
              <button type="button" className={`info-tab ${activeTab === 'views' ? 'active' : ''}`} aria-pressed={activeTab === 'views'} onClick={() => setActiveTab('views')}>{t('image.views')}</button>
              <button type="button" className={`info-tab ${activeTab === 'downloads' ? 'active' : ''}`} aria-pressed={activeTab === 'downloads'} onClick={() => setActiveTab('downloads')}>{t('image.downloads')}</button>
            </div>
          </div>
        </div>
      </div>, document.body)}
  </>;
});
ImageModalInfoContent.displayName = 'ImageModalInfoContent';
// Navigation must dispose panel state/listeners even if the page reuses this slot.
export const ImageModalInfo = memo(({ image }: ImageModalInfoProps) =>
  <ImageModalInfoContent key={image._id} image={image} />);
ImageModalInfo.displayName = 'ImageModalInfo';
