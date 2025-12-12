/**
 * Unified hook for image modal navigation
 * Handles opening, closing, and state management for image modals
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Image } from '@/types/image';
import { generateImageSlug } from '@/lib/utils';
import { isMobileViewport } from '@/utils/responsive';
import { appConfig } from '@/config/appConfig';
import {
  saveScrollPosition,
  restoreScrollPosition,
  setModalActive,
  clearModalActive,
  prepareModalNavigationState,
} from '@/utils/modalNavigation';

interface UseImageModalNavigationProps {
  images?: Image[];
  onImageSelect?: (image: Image) => void;
}

interface UseImageModalNavigationReturn {
  handleImageClick: (image: Image) => void;
  handleCloseModal: () => void;
  handleModalImageSelect: (image: Image) => void;
  isClosing: boolean;
}

/**
 * Unified hook for image modal navigation
 * 
 * Features:
 * - Handles click to open with proper state management
 * - Atomic close handler for all close scenarios
 * - Prevents duplicate opens
 * - Handles refresh detection
 * - Manages scroll position
 */
export function useImageModalNavigation({
  images,
  onImageSelect,
}: UseImageModalNavigationProps = {}): UseImageModalNavigationReturn {
  const navigate = useNavigate();
  const backgroundLocation = useLocation();
  const isClosingRef = useRef(false);
  const isModalOpenRef = useRef(false);

  // DON'T clear modal state on component mount
  // The flag should persist across navigation
  // Only App.tsx should clear it on actual page refresh
  // This hook is used during navigation, not on page load

  // Cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearModalActive();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  /**
   * Handle image click to open modal
   * 
   * Flow:
   * 1. Pre-validation (prevent duplicate opens)
   * 2. Save scroll position
   * 3. Set modal active flag
   * 4. Navigate with proper state
   */
  const handleImageClick = useCallback(
    (image: Image) => {
      // Pre-validation: prevent opening if already open or closing
      if (isModalOpenRef.current || isClosingRef.current) {
        return;
      }

      // Validate image exists
      if (!image?._id) {
        console.warn('[useImageModalNavigation] Cannot open modal: invalid image');
        return;
      }

      const newSlug = generateImageSlug(image.imageTitle || '', image._id);

      // Mobile: full page navigation
      if (isMobileViewport()) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
        }
        navigate(`/photos/${newSlug}`, {
          state: { images, fromGrid: true },
        });
        return;
      }

      // Desktop: modal navigation
      // 1. Save scroll position
      saveScrollPosition();

      // 2. Set modal active flag
      setModalActive();

      // 3. Mark modal as open
      isModalOpenRef.current = true;

      // 4. Navigate with modal state
      const modalState = prepareModalNavigationState(backgroundLocation);
      navigate(`/photos/${newSlug}`, {
        state: modalState,
      });
    },
    [navigate, backgroundLocation, images]
  );

  /**
   * Atomic close handler
   * 
   * Handles all close scenarios:
   * - X button click
   * - Overlay click
   * - ESC key
   * - Browser back button
   * - Programmatic close
   * 
   * Flow:
   * 1. Mark as closing (prevent duplicate closes)
   * 2. Clear modal state
   * 3. Restore scroll position
   * 4. Navigate back
   * 5. Reset flags
   */
  const handleCloseModal = useCallback(() => {
    // Prevent duplicate closes
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;
    isModalOpenRef.current = false;

    // Atomic cleanup sequence
    try {
      // 1. Clear modal active flag
      clearModalActive();

      // 2. Restore scroll position
      restoreScrollPosition();

      // 3. Navigate back
      navigate(-1);
    } catch (error) {
      console.error('Error closing modal:', error);
    } finally {
      // Reset closing flag after a short delay to allow navigation to complete
      setTimeout(() => {
        isClosingRef.current = false;
      }, 100);
    }
  }, [navigate]);

  // Reset modal open state when navigation changes (modal closed via browser back)
  useEffect(() => {
    // This effect will run when the component unmounts or location changes
    // If modal was open but we're no longer on a photo page, reset the flag
    return () => {
      // Component cleanup - modal is no longer open
      isModalOpenRef.current = false;
    };
  }, []);

  /**
   * Handle image selection within modal (navigation to different image)
   * 
   * Flow:
   * 1. Update selected image
   * 2. Navigate with replace (don't add to history)
   * 3. Keep modal state intact
   */
  const handleModalImageSelect = useCallback(
    (image: Image) => {
      // Prevent selection if closing
      if (isClosingRef.current) {
        return;
      }

      // Validate image
      if (!image?._id) {
        console.warn('Cannot select image: invalid image');
        return;
      }

      const newSlug = generateImageSlug(image.imageTitle || '', image._id);

      // Update selected image via callback if provided
      if (onImageSelect) {
        onImageSelect(image);
      }

      // Navigate with replace (don't add to history stack)
      const modalState = prepareModalNavigationState(backgroundLocation);
      navigate(`/photos/${newSlug}`, {
        replace: true,
        state: modalState,
      });
    },
    [navigate, backgroundLocation, onImageSelect]
  );

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (isModalOpenRef.current) {
        // Browser back was pressed while modal was open
        clearModalActive();
        restoreScrollPosition();
        isModalOpenRef.current = false;
        isClosingRef.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return {
    handleImageClick,
    handleCloseModal,
    handleModalImageSelect,
    isClosing: isClosingRef.current,
  };
}
