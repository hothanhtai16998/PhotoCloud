import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface SwipeableProps {
  children: ReactNode;
  items: unknown[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  showIndicators?: boolean;
  showArrows?: boolean;
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}

export function Swipeable({
  children,
  items,
  currentIndex,
  onIndexChange,
  showIndicators = true,
  showArrows = true,
  className = '',
  autoPlay = false,
  interval = 5000,
}: SwipeableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [, setIsDragging] = useState(false);
  const autoPlayRef = useRef<number | null>(null);

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    if (!e.touches[0]) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }
  };

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current) return;
    if (!e.changedTouches[0]) return;

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        onIndexChange(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < items.length - 1) {
        // Swipe left - go to next
        onIndexChange(currentIndex + 1);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    setIsDragging(false);
  };

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && items.length > 1) {
      autoPlayRef.current = window.setInterval(() => {
        onIndexChange((currentIndex + 1) % items.length);
      }, interval);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
    return undefined;
  }, [autoPlay, currentIndex, items.length, interval, onIndexChange]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    } else {
      onIndexChange(items.length - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1);
    } else {
      onIndexChange(0);
    }
  };

  const goToIndex = (index: number) => {
    onIndexChange(index);
  };

  return (
    <div className={`swipe-container ${className}`}>
      <div
        ref={containerRef}
        className="swipe-container horizontal"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>

      {/* Navigation arrows */}
      {showArrows && items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="swipe-arrow left"
            onClick={goToPrevious}
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="swipe-arrow right"
            onClick={goToNext}
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </Button>
        </>
      )}

      {/* Swipe indicators */}
      {showIndicators && items.length > 1 && (
        <div className="swipe-indicator">
          {items.map((_, index) => (
            <button
              key={index}
              className={`swipe-indicator-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Swipe hint (mobile only) */}
      {items.length > 1 && (
        <div className="swipe-hint">
          <ChevronLeft size={16} className="swipe-hint-icon" />
          <span>Swipe to navigate</span>
          <ChevronRight size={16} className="swipe-hint-icon" />
        </div>
      )}
    </div>
  );
}

