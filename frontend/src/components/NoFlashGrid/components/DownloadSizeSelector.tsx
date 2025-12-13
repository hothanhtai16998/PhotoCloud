import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Image } from '@/types/image';
import { t } from '@/i18n';

export type DownloadSize = 'small' | 'medium' | 'large' | 'original';

interface DownloadSizeSelectorProps {
  image: Image;
  onDownload: (size: DownloadSize) => void;
}

interface SizeOption {
  value: DownloadSize;
  label: string;
  dimension: string;
}

const SIZE_OPTIONS: SizeOption[] = [
  { value: 'small', label: 'Small', dimension: '640px' },
  { value: 'medium', label: 'Medium', dimension: '1920px' },
  { value: 'large', label: 'Large', dimension: '2400px' },
  { value: 'original', label: 'Original', dimension: 'Full size' },
];

export const DownloadSizeSelector = memo(({ onDownload }: DownloadSizeSelectorProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [positionBelow, setPositionBelow] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check available space and position menu accordingly
  useEffect(() => {
    if (!showMenu || !buttonRef.current) return;

    const checkPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();

      if (buttonRect) {
        const spaceAbove = buttonRect.top;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const estimatedMenuHeight = 200;
        const requiredSpace = estimatedMenuHeight + 20;

        if (spaceAbove < requiredSpace && spaceBelow >= requiredSpace) {
          setPositionBelow(true);
        } else {
          setPositionBelow(false);
        }
      }
    };

    checkPosition();
    const timer = setTimeout(checkPosition, 50);
    const timer2 = setTimeout(checkPosition, 200);

    window.addEventListener('scroll', checkPosition, true);
    window.addEventListener('resize', checkPosition);

    let resizeObserver: ResizeObserver | null = null;
    if (menuRef.current) {
      resizeObserver = new ResizeObserver(checkPosition);
      resizeObserver.observe(menuRef.current);
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
  }, [showMenu]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !target.closest('.download-size-menu')
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleSizeSelect = useCallback((size: DownloadSize, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDownload(size);
  }, [onDownload]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  }, [showMenu]);

  // Quick download with default size (medium)
  const handleQuickDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload('medium');
  }, [onDownload]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        className={`modal-download-btn ${showMenu ? 'active' : ''}`}
        onClick={handleButtonClick}
        onDoubleClick={handleQuickDownload}
        title={`${t('image.download')} (Ctrl/Cmd + D)`}
      >
        <span>{t('image.download')}</span>
        <ChevronDown size={16} />
        <kbd className="keyboard-hint">⌘D</kbd>
      </button>
      {/* Download Size Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className={`download-size-menu-wrapper ${positionBelow ? 'position-below' : ''}`}
        >
          <div className="download-size-menu">
            <div className="download-size-menu-header">
              <span>Choose download size:</span>
            </div>
            {SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className="download-size-menu-item"
                onClick={(e) => handleSizeSelect(option.value, e)}
              >
                <div className="download-size-menu-item-content">
                  <span className="download-size-menu-item-label">{option.label}</span>
                  <span className="download-size-menu-item-dimension">{option.dimension}</span>
                </div>
                {option.value === 'medium' && (
                  <span className="download-size-menu-item-default">Default</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

DownloadSizeSelector.displayName = 'DownloadSizeSelector';

