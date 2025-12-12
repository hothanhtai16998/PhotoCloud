import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import type { Image } from '@/types/image';
import { extractIdFromSlug } from '@/lib/utils';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import { useImageModalNavigation } from '@/hooks/useImageModalNavigation';

interface UseImageGridModalProps {
    images: Image[];
}

export function useImageGridModal({ images }: UseImageGridModalProps) {
    const actualLocation = useContext(ActualLocationContext);
    const actualPathname = actualLocation?.pathname;
    const actualLocationState = actualLocation?.state as { inlineModal?: boolean } | undefined;
    const isInlineModalRoute = Boolean(actualLocationState?.inlineModal);

    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [collectionImage, setCollectionImage] = useState<Image | null>(null);
    const [showCollectionModal, setShowCollectionModal] = useState(false);

    const lastInlineSlugRef = useRef<string | null>(null);

    // Use unified navigation hook
    const {
        handleImageClick: baseHandleImageClick,
        handleCloseModal: baseHandleCloseModal,
        handleModalImageSelect: baseHandleModalImageSelect,
    } = useImageModalNavigation({
        images,
        onImageSelect: setSelectedImage,
    });

    // Wrap handlers to also update local state
    const handleImageClick = useCallback(
        (image: Image) => {
            setSelectedImage(image);
            baseHandleImageClick(image);
        },
        [baseHandleImageClick]
    );

    const handleCloseModal = useCallback(() => {
        setSelectedImage(null);
        baseHandleCloseModal();
    }, [baseHandleCloseModal]);

    const handleModalImageSelect = useCallback(
        (image: Image) => {
            setSelectedImage(image);
            baseHandleModalImageSelect(image);
        },
        [baseHandleModalImageSelect]
    );

    // Sync selected image with URL
    useEffect(() => {
        if (!isInlineModalRoute) {
            if (lastInlineSlugRef.current) {
                lastInlineSlugRef.current = null;
                setSelectedImage(null);
            }
            return;
        }

        if (!actualPathname?.startsWith('/photos/')) {
            return;
        }

        const slugFromPath = actualPathname.slice('/photos/'.length);
        if (!slugFromPath || slugFromPath === lastInlineSlugRef.current) {
            return;
        }

        if (images.length === 0) {
            return;
        }

        const imageId = extractIdFromSlug(slugFromPath);
        const imageFromUrl = images.find(img => img._id.endsWith(imageId));
        if (imageFromUrl) {
            setSelectedImage(imageFromUrl);
            lastInlineSlugRef.current = slugFromPath;
        }
    }, [actualPathname, images, isInlineModalRoute]);

    // Collection handlers
    const handleAddToCollection = useCallback((image: Image, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollectionImage(image);
        setShowCollectionModal(true);
    }, []);

    const handleCollectionModalClose = useCallback(() => {
        setShowCollectionModal(false);
        setCollectionImage(null);
    }, []);

    return {
        selectedImage,
        collectionImage,
        showCollectionModal,
        handleImageClick,
        handleCloseModal,
        handleModalImageSelect,
        handleAddToCollection,
        handleCollectionModalClose,
    };
}

