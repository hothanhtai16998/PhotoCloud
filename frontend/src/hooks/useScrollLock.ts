import { useEffect, useRef } from 'react';

/**
 * Custom hook to lock body scroll when a modal or overlay is open.
 *
 * Features:
 * - Prevents body scrolling while allowing scrolling within a specified container
 * - Handles scrollbar width compensation to prevent layout shift
 * - Restores scroll position on cleanup
 * - Works across all browsers and devices (touch + mouse)
 *
 * @param enabled - Whether scroll lock should be active
 * @param contentSelector - CSS selector for the scrollable content container (default: '.image-modal-content')
 */
export function useScrollLock(
  enabled: boolean,
  contentSelector = '.image-modal-content'
) {
  // Store scroll position in ref to persist across re-renders
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // Capture current scroll position
    scrollYRef.current = window.scrollY;
    const scrollY = scrollYRef.current;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    // Apply scroll lock styles
    const originalStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
      bodyPaddingRight: document.body.style.paddingRight,
    };

    // Lock the body
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.classList.add('scroll-locked');

    // Compensate for scrollbar to prevent layout shift
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Event handler to allow scrolling only within the modal content
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as Element;
      const modalContent = target.closest(contentSelector);

      if (modalContent) {
        // Allow scrolling within modal content
        return;
      }

      // Prevent scrolling outside modal content
      e.preventDefault();
    };

    // Touch event handler for mobile devices
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as Element;
      const modalContent = target.closest(contentSelector);

      if (modalContent) {
        // Allow touch scrolling within modal content
        return;
      }

      // Prevent touch scrolling outside modal content
      e.preventDefault();
    };

    // Keyboard scroll prevention (arrow keys, space, page up/down)
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const scrollKeys = [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
      ];

      // Allow keyboard scrolling within modal content or input fields
      if (
        target.closest(contentSelector) ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Prevent keyboard scrolling on body
      if (scrollKeys.includes(e.key)) {
        e.preventDefault();
      }
    };

    // Add event listeners with passive: false to allow preventDefault
    document.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    });
    document.addEventListener('touchmove', handleTouchMove, {
      passive: false,
      capture: true,
    });
    document.addEventListener('keydown', handleKeyDown, { passive: false });

    // Cleanup function
    return () => {
      // Remove event listeners
      document.removeEventListener('wheel', handleWheel, {
        capture: true,
      } as EventListenerOptions);
      document.removeEventListener('touchmove', handleTouchMove, {
        capture: true,
      } as EventListenerOptions);
      document.removeEventListener('keydown', handleKeyDown);

      // Restore original styles
      document.documentElement.style.overflow = originalStyles.htmlOverflow;
      document.body.style.overflow = originalStyles.bodyOverflow;
      document.body.style.position = originalStyles.bodyPosition;
      document.body.style.top = originalStyles.bodyTop;
      document.body.style.left = originalStyles.bodyLeft;
      document.body.style.right = originalStyles.bodyRight;
      document.body.style.width = originalStyles.bodyWidth;
      document.body.style.paddingRight = originalStyles.bodyPaddingRight;
      document.body.classList.remove('scroll-locked');

      // Restore scroll position only if scroll restoration is not in progress
      // This prevents interfering with grid scroll position restoration
      const scrollRestoreInProgress = sessionStorage.getItem('scrollRestoreInProgress') === 'true';
      if (!scrollRestoreInProgress) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [enabled, contentSelector]);
}
