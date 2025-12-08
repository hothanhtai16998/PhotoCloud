import { useState, useEffect, useRef, useCallback } from 'react';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';

interface UseUserProfileCardProps {
  image: Image;
  modalContentRef: React.RefObject<HTMLDivElement | null>;
  onImageSelect: (image: Image) => void;
}

export const useUserProfileCard = ({
  image,
  modalContentRef,
  onImageSelect,
}: UseUserProfileCardProps) => {
  const [showUserProfileCard, setShowUserProfileCard] = useState(false);
  const [isClosingProfileCard, setIsClosingProfileCard] = useState(false);
  const [userImages, setUserImages] = useState<Image[]>([]);
  const [isLoadingUserImages, setIsLoadingUserImages] = useState(false);
  const userInfoRef = useRef<HTMLDivElement>(null);
  const userProfileCardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch user images when hovering over user info
  useEffect(() => {
    if (!showUserProfileCard || !image.uploadedBy._id) return;

    let isMounted = true;
    setIsLoadingUserImages(true);

    const fetchUserImages = async () => {
      try {
        const response = await imageService.fetchUserImages(image.uploadedBy._id, { limit: 3 });
        if (isMounted) {
          // Exclude current image from the list
          const otherImages = (response.images || []).filter(
            (img: Image) => img._id !== image._id
          ).slice(0, 3);
          setUserImages(otherImages);
        }
      } catch (error) {
        console.error('Failed to fetch user images:', error);
        if (isMounted) {
          setUserImages([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUserImages(false);
        }
      }
    };

    fetchUserImages();

    return () => {
      isMounted = false;
    };
  }, [showUserProfileCard, image.uploadedBy._id, image._id]);

  // Close user profile card when clicking outside
  useEffect(() => {
    if (!showUserProfileCard) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Clear hover timeout if any
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Close if click is outside both user info and profile card
      const isInsideUserInfo = userInfoRef.current?.contains(target);
      const isInsideProfileCard = userProfileCardRef.current?.contains(target);

      if (!isInsideUserInfo && !isInsideProfileCard) {
        setIsClosingProfileCard(true);
        // Wait for fade-out animation before actually hiding
        setTimeout(() => {
          setShowUserProfileCard(false);
          setIsClosingProfileCard(false);
        }, 250); // Match CSS transition duration
      }
    };

    // Add listener immediately - clicks outside should always close
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showUserProfileCard]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsClosingProfileCard(false);
    setShowUserProfileCard(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Add a delay before closing to allow moving to the card
    // Increased delay for smoother UX
    hoverTimeoutRef.current = setTimeout(() => {
      setIsClosingProfileCard(true);
      // Wait for fade-out animation before actually hiding
      setTimeout(() => {
        setShowUserProfileCard(false);
        setIsClosingProfileCard(false);
      }, 250); // Match CSS transition duration
    }, 200);
  }, []);

  const handleUserImageClick = useCallback((userImage: Image) => {
    setShowUserProfileCard(false);
    onImageSelect(userImage);
    // Scroll to top instantly to show the new image (like Unsplash)
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [onImageSelect, modalContentRef]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    showUserProfileCard,
    isClosingProfileCard,
    userImages,
    isLoadingUserImages,
    userInfoRef,
    userProfileCardRef,
    handleMouseEnter,
    handleMouseLeave,
    handleUserImageClick,
  };
};

