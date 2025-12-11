import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import type { Image } from '@/types/image';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { appConfig } from '@/config/appConfig';
import { isMobileViewport } from '@/utils/responsive';

const GRID_SCROLL_POSITION_KEY = 'imageGridScrollPosition';

interface UseImageGridModalProps {
    images: Image[];
}

export function useImageGridModal({ images }: UseImageGridModalProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isModal = searchParams.get('modal') === 'true';

    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [collectionImage, setCollectionImage] = useState<Image | null>(null);
    const [showCollectionModal, setShowCollectionModal] = useState(false);

    const lastInlineSlugRef = useRef<string | null>(null);

    const saveScrollPosition = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (!sessionStorage.getItem(GRID_SCROLL_POSITION_KEY)) {
            sessionStorage.setItem(GRID_SCROLL_POSITION_KEY, window.scrollY.toString());
        }
    }, []);

    const restoreScrollPosition = useCallback(() => {
        if (typeof window === 'undefined') return;
        const savedScroll = sessionStorage.getItem(GRID_SCROLL_POSITION_KEY);
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
            sessionStorage.removeItem(GRID_SCROLL_POSITION_KEY);
        }
    }, []);


    const handleImageClick = useCallback((image: Image) => {
        const newSlug = generateImageSlug(image.imageTitle || '', image._id);

        if (isMobileViewport()) {
            // Mobile: open full ImagePage
            navigate(`/photos/${newSlug}`, { state: { images } });
            return;
        }

        // Desktop: open with modal query param
        saveScrollPosition();
        setSelectedImage(image);
        navigate(`/photos/${newSlug}?modal=true`, {
            state: { images }
        });
    }, [navigate, saveScrollPosition, images]);

    const handleCloseModal = useCallback(() => {
        setSelectedImage(null);
        restoreScrollPosition();
        navigate(-1);
    }, [navigate, restoreScrollPosition]);

    const handleModalImageSelect = useCallback((image: Image) => {
        setSelectedImage(image);
        const newSlug = generateImageSlug(image.imageTitle || '', image._id);
        navigate(`/photos/${newSlug}?modal=true`, {
            replace: true,
            state: { images }
        });
    }, [navigate, images]);

    // Sync selected image with URL
    useEffect(() => {
        if (!isModal) {
            if (lastInlineSlugRef.current) {
                lastInlineSlugRef.current = null;
                setSelectedImage(null);
                restoreScrollPosition();
            }
            return;
        }

        if (!location.pathname?.startsWith('/photos/')) {
            return;
        }

        const slugFromPath = location.pathname.slice('/photos/'.length);
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
    }, [location.pathname, images, isModal, restoreScrollPosition]);

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

