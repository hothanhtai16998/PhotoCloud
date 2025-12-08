import { useState, useEffect, useCallback } from 'react';

interface UseVirtualScrollOptions {
  itemHeight?: number;
  containerRef?: React.RefObject<HTMLElement>;
  overscan?: number; // Number of items to render outside visible area
}

/**
 * Custom hook for virtual scrolling
 * Calculates which items should be visible based on scroll position
 */
export const useVirtualScroll = <T>(
  items: T[],
  options: UseVirtualScrollOptions = {}
) => {
  const { itemHeight = 300, overscan = 3 } = options;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(items.length, 20) });

  // Update visible range based on scroll
  const updateVisibleRange = useCallback(() => {
    if (!options.containerRef?.current) return;

    const container = options.containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    setVisibleRange({ start, end });
  }, [itemHeight, overscan, items.length, options.containerRef]);

  // Setup scroll listener
  useEffect(() => {
    const container = options.containerRef?.current;
    if (!container) return;

    // Initial calculation
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateVisibleRange();

    // Listen to scroll events
    container.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [updateVisibleRange, options.containerRef]);

  // Get visible items
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return {
    visibleItems,
    startIndex: visibleRange.start,
    endIndex: visibleRange.end,
    totalItems: items.length,
  };
};

