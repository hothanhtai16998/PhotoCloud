import { useEffect, useRef } from 'react';
import type { Image } from '@/types/image';

interface UseKeyboardNavigationOptions {
  onClose: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onToggleFavorite?: () => void;
  onFocusSearch?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  images?: Image[];
  currentImageIndex?: number;
  isEnabled?: boolean;
  isModalOpen?: boolean; // Whether modal is currently open
}

/**
 * Custom hook for keyboard navigation and shortcuts
 * Handles Escape, Arrow keys, and other keyboard shortcuts
 */
export const useKeyboardNavigation = ({
  onClose,
  onNavigateLeft,
  onNavigateRight,
  onDownload,
  onShare,
  onToggleFavorite,
  onFocusSearch,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  images = [],
  currentImageIndex = -1,
  isEnabled = true,
  isModalOpen = false,
}: UseKeyboardNavigationOptions) => {
  const isEnabledRef = useRef(isEnabled);
  const imagesRef = useRef(images);
  const currentImageIndexRef = useRef(currentImageIndex);
  const isModalOpenRef = useRef(isModalOpen);

  // Update refs when values change
  useEffect(() => {
    isEnabledRef.current = isEnabled;
    imagesRef.current = images;
    currentImageIndexRef.current = currentImageIndex;
    isModalOpenRef.current = isModalOpen;
  }, [isEnabled, images, currentImageIndex, isModalOpen]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Focus search with / key (only when modal is not open and not typing in inputs)
      if (e.key === '/' && !isModalOpenRef.current && !isInputFocused && onFocusSearch) {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      // Close modal on Escape - DISABLED: removed to prevent navigation to homepage
      // if (e.key === 'Escape' && isModalOpenRef.current) {
      //   onClose();
      //   return;
      // }

      // Only handle modal shortcuts when modal is open (not typing in inputs)
      if (!isModalOpenRef.current || isInputFocused) {
        return;
      }

      // Arrow keys for navigation (if multiple images)
      if (e.key === 'ArrowLeft' && onNavigateLeft && imagesRef.current.length > 1) {
        if (currentImageIndexRef.current > 0) {
          e.preventDefault();
          onNavigateLeft();
        }
        return;
      }

      if (e.key === 'ArrowRight' && onNavigateRight && imagesRef.current.length > 1) {
        if (currentImageIndexRef.current < imagesRef.current.length - 1) {
          e.preventDefault();
          onNavigateRight();
        }
        return;
      }

      // Download with Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && onDownload) {
        e.preventDefault();
        const downloadBtn = document.querySelector('.modal-download-btn') as HTMLElement;
        if (downloadBtn) {
          downloadBtn.click();
        } else {
          onDownload();
        }
        return;
      }

      // Share with Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && onShare) {
        e.preventDefault();
        const shareBtn = document.querySelector('.modal-share-btn') as HTMLElement;
        if (shareBtn) {
          shareBtn.click();
        } else {
          onShare();
        }
        return;
      }

      // Toggle favorite with F
      if ((e.key === 'f' || e.key === 'F') && onToggleFavorite) {
        e.preventDefault();
        onToggleFavorite();
        return;
      }

      // Zoom controls with + and -
      if ((e.key === '+' || e.key === '=') && onZoomIn) {
        e.preventDefault();
        onZoomIn();
        return;
      }

      if (e.key === '-' && onZoomOut) {
        e.preventDefault();
        onZoomOut();
        return;
      }

      // Reset zoom with 0
      if (e.key === '0' && onResetZoom) {
        e.preventDefault();
        onResetZoom();
        return;
      }
    };

    // Handle wheel events to scroll modal content when scrolling on overlay or anywhere
    const handleWheel = (e: Event) => {
      const modalContent = document.querySelector('.image-modal-content') as HTMLElement;
      if (!modalContent) return;

      const wheelEvent = e as WheelEvent;
      const target = e.target as HTMLElement;

      // Don't interfere if scrolling inside the modal content itself
      if (modalContent.contains(target)) {
        return;
      }

      // Prevent default scrolling
      wheelEvent.preventDefault();

      // Scroll the modal content instead
      modalContent.scrollTop += wheelEvent.deltaY;
    };

    document.addEventListener('keydown', handleKeyboard);
    
    // Prevent page/body scrolling when modal is open
    // DON'T change body overflow - it causes scrollbar flash
    // Use event handlers instead to prevent scrolling
    
    // Prevent scrolling on the image grid container
    const gridContainer = document.querySelector('.image-grid-container');
    if (gridContainer) {
      (gridContainer as HTMLElement).style.overflow = 'hidden';
    }

    // Prevent scroll events on body/window
    const preventBodyScroll = (e: Event) => {
      // Allow scrolling within modal content
      const target = e.target;
      // Check if target is an HTMLElement and has closest method
      if (target && typeof target === 'object' && 'closest' in target && typeof (target as HTMLElement).closest === 'function') {
        const htmlTarget = target as HTMLElement;
        if (htmlTarget.closest('.image-modal-content') || htmlTarget.closest('.image-modal')) {
          return;
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Add wheel event listener to document to catch all scroll events
    document.addEventListener('wheel', handleWheel, { passive: false });
    // Prevent body scrolling via event handlers (no style changes = no flash)
    window.addEventListener('wheel', preventBodyScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', preventBodyScroll, { passive: false, capture: true });
    window.addEventListener('scroll', preventBodyScroll, { passive: false, capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      document.removeEventListener('wheel', handleWheel);
      window.removeEventListener('wheel', preventBodyScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('touchmove', preventBodyScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('scroll', preventBodyScroll, { capture: true } as EventListenerOptions);
      // Restore grid container
      const gridContainer = document.querySelector('.image-grid-container');
      if (gridContainer) {
        (gridContainer as HTMLElement).style.overflow = '';
      }
    };
  }, [isEnabled, onClose, onNavigateLeft, onNavigateRight, onDownload, onShare, onToggleFavorite, onFocusSearch, onZoomIn, onZoomOut, onResetZoom, isModalOpen]);
};

