import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { Info } from 'lucide-react';
import { ImageModalChart } from './ImageModalChart';
import type { Image } from '@/types/image';
import { t } from '@/i18n';
import './ImageModalInfo.css';

interface ImageModalInfoProps {
  image: Image;
}

export const ImageModalInfo = memo(({ image }: ImageModalInfoProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'views' | 'downloads'>('views');
  const [positionBelow, setPositionBelow] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoModalRef = useRef<HTMLDivElement>(null);

  // Check available space and position modal accordingly
  useEffect(() => {
    if (!showInfoModal || !infoButtonRef.current) return;

    const checkPosition = () => {
      const buttonRect = infoButtonRef.current?.getBoundingClientRect();

      if (buttonRect) {
        const spaceAbove = buttonRect.top;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        // Estimate modal height (usually around 400-500px, but can be up to 60vh)
        const estimatedModalHeight = Math.min(500, window.innerHeight * 0.6);
        const requiredSpace = estimatedModalHeight + 20; // 20px for gap

        // If not enough space above but enough below, position below
        if (spaceAbove < requiredSpace && spaceBelow >= requiredSpace) {
          setPositionBelow(true);
        } else {
          setPositionBelow(false);
        }
      }
    };

    // Check position immediately and after modal renders
    checkPosition();
    const timer = setTimeout(checkPosition, 50);
    const timer2 = setTimeout(checkPosition, 200); // Check again after animation

    // Also check on scroll/resize
    window.addEventListener('scroll', checkPosition, true);
    window.addEventListener('resize', checkPosition);

    // Use ResizeObserver for more accurate detection
    let resizeObserver: ResizeObserver | null = null;
    if (infoModalRef.current) {
      resizeObserver = new ResizeObserver(checkPosition);
      resizeObserver.observe(infoModalRef.current);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('scroll', checkPosition, true);
      window.removeEventListener('resize', checkPosition);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [showInfoModal]);

  // Calculate days ago using useMemo to avoid calling Date.now() during render
  const daysAgoText = useMemo(() => {
    const now = new Date().getTime();
    const daysAgo = Math.floor((now - new Date(image.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return t('notifications.justNow');
    if (daysAgo === 1) return t('notifications.daysAgo', { count: 1 });
    return t('notifications.daysAgo', { count: daysAgo });
  }, [image.createdAt]);

  // Close info modal when clicking outside
  useEffect(() => {
    if (!showInfoModal) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        infoButtonRef.current &&
        !infoButtonRef.current.contains(target) &&
        !target.closest('.info-modal')
      ) {
        setShowInfoModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoModal]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={infoButtonRef}
        className={`modal-footer-btn ${showInfoModal ? 'active' : ''}`}
        onClick={() => setShowInfoModal(!showInfoModal)}
      >
        <Info size={18} />
        <span>{t('image.info')}</span>
      </button>
      {/* Info Modal */}
      {showInfoModal && (
        <div
          ref={infoModalRef}
          className={`info-modal-wrapper ${positionBelow ? 'position-below' : ''}`}
        >
          <div className="info-modal">
            <div className="info-modal-header">
              <h2 className="info-modal-title">{t('image.info')}</h2>
              <button
                className="info-modal-close"
                onClick={() => setShowInfoModal(false)}
                aria-label="Close info modal"
              >
                ×
              </button>
            </div>
            <div className="info-modal-content">
              <div className="info-published">
                {t('image.published')} {daysAgoText}
              </div>

              {/* Chart Container */}
              <ImageModalChart image={image} activeTab={activeTab} />

              {/* Tabs */}
              <div className="info-tabs">
                <button
                  className={`info-tab ${activeTab === 'views' ? 'active' : ''}`}
                  onClick={() => setActiveTab('views')}
                >
                  {t('image.views')}
                </button>
                <button
                  className={`info-tab ${activeTab === 'downloads' ? 'active' : ''}`}
                  onClick={() => setActiveTab('downloads')}
                >
                  {t('image.downloads')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ImageModalInfo.displayName = 'ImageModalInfo';

