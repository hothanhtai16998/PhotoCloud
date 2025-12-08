import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Image } from '@/types/image';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { appConfig } from '@/config/appConfig';
import { isMobileViewport } from '@/utils/responsive';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import { INLINE_MODAL_FLAG_KEY } from '@/constants/modalKeys';

const GRID_SCROLL_POSITION_KEY = 'imageGridScrollPosition';

interface UseImageGridModalProps {
    images: Image[];
}

export function useImageGridModal({ images }: UseImageGridModalProps) {
    const navigate = useNavigate();
    const backgroundLocation = useLocation();
    const actualLocation = useContext(ActualLocationContext);
    const actualPathname = actualLocation?.pathname;
    const actualLocationState = actualLocation?.state as { inlineModal?: boolean } | undefined;
    const isInlineModalRoute = Boolean(actualLocationState?.inlineModal);

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

    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const handleImageClick = useCallback((image: Image) => {
        const newSlug = generateImageSlug(image.imageTitle || '', image._id);

        if (isMobileViewport()) {
            // Mobile: open full ImagePage but remember it's from grid (for back behavior)
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
            }
            navigate(`/photos/${newSlug}`, { state: { fromGrid: true } });
            return;
        }

        saveScrollPosition();
        setSelectedImage(image);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(INLINE_MODAL_FLAG_KEY, 'true');
        }
        navigate(`/photos/${newSlug}`, {
            state: {
                background: backgroundLocation,
                inlineModal: true,
            },
        });
    }, [navigate, saveScrollPosition, backgroundLocation]);

    const handleCloseModal = useCallback(() => {
        setSelectedImage(null);
        restoreScrollPosition();
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
        }
        navigate(-1);
    }, [navigate, restoreScrollPosition]);

    const handleModalImageSelect = useCallback((image: Image) => {
        setSelectedImage(image);
        const newSlug = generateImageSlug(image.imageTitle || '', image._id);
        navigate(`/photos/${newSlug}`, {
            replace: true,
            state: {
                background: backgroundLocation,
                inlineModal: true,
            },
        });
    }, [navigate, backgroundLocation]);

    // Sync selected image with URL
    useEffect(() => {
        if (!isInlineModalRoute) {
            if (lastInlineSlugRef.current) {
                lastInlineSlugRef.current = null;
                setSelectedImage(null);
                restoreScrollPosition();
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
                }
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
    }, [actualPathname, images, isInlineModalRoute, restoreScrollPosition]);

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

