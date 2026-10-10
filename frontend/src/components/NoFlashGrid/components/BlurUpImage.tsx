import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import type { Image } from '@/types/image';
import type { ApiErrorResponse } from '@/types/errors';
import { preloadImage, isImageLoaded } from '../utils/imagePreloader';
import { Heart, Download, Bookmark } from 'lucide-react';
import { favoriteService } from '@/services/favoriteService';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import { imageStatsService } from '@/services/imageStatsService';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { t } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDownloadHistoryStore } from '@/stores/useDownloadHistoryStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { DownloadSize } from './DownloadSizeSelector';
import { detectAvifSupport } from '@/utils/avifSupport';
import './BlurUpImage.css';

let avifSupportPromise: Promise<boolean> | undefined;

type ExtendedImage = Image & { categoryName?: string; category?: string };

function getRegularImageUrl(image: Image, supportsAvif: boolean): string {
    return supportsAvif
        ? image.regularAvifUrl || image.imageAvifUrl || image.regularUrl || image.imageUrl ||
          image.smallAvifUrl || image.smallUrl || image.thumbnailAvifUrl || image.thumbnailUrl || ''
        : image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl || '';
}

interface BlurUpImageProps {
    image: ExtendedImage;
    onClick?: () => void | Promise<void>;
    priority?: boolean;
    onLoadComplete?: () => void;
    images?: ExtendedImage[]; // Full images array for preloading adjacent images
    currentIndex?: number; // Current index in images array
    minimal?: boolean; // If true, hide overlays, buttons, and tooltips (for covers, pinned images, etc.)
}

export function BlurUpImage({
    image,
    onClick,
    priority = false,
    onLoadComplete,
    images,
    currentIndex,
    minimal = false,
}: BlurUpImageProps) {
    // Use base64 thumbnail for instant placeholder (like Unsplash) - no network request needed
    const base64Placeholder = image.base64Thumbnail || null;
    const networkPlaceholder = image.thumbnailUrl || image.smallUrl || image.imageUrl || null;
    const placeholderInitial = base64Placeholder || networkPlaceholder;
    
    const [supportsAvif, setSupportsAvif] = useState<boolean | null>(() =>
        typeof window === 'undefined' ? false :
            (window as Window & { avifSupport?: boolean }).avifSupport ?? null
    );
    const fullImageUrl = supportsAvif === null ? '' : getRegularImageUrl(image, supportsAvif);
    const [readySrc, setReadySrc] = useState<string | null>(null);
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
    const [isInView, setIsInView] = useState(priority);
    const canLoad = priority || isInView;
    // Cache reads are pure: never create an Image or start requests during render.
    const fullSrc = canLoad && fullImageUrl &&
        (readySrc === fullImageUrl || isImageLoaded(fullImageUrl)) ? fullImageUrl : null;
    const loaded = !!fullSrc && loadedSrc === fullSrc;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const notifiedSrcRef = useRef<string | null>(null);

    useEffect(() => {
        if (canLoad || !containerRef.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                setIsInView(true);
                observer.disconnect();
            }
        }, { rootMargin: '1000px', threshold: 0.01 });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [canLoad]);

    useEffect(() => {
        if (supportsAvif !== null) return;
        let disposed = false;
        (avifSupportPromise ??= detectAvifSupport()).then(result => {
            if (!disposed) setSupportsAvif(result);
        }).catch(() => {
            if (!disposed) setSupportsAvif(false);
        });
        return () => { disposed = true; };
    }, [supportsAvif]);

    useEffect(() => {
        if (!canLoad || !fullImageUrl || isImageLoaded(fullImageUrl)) return;
        let disposed = false;
        const load = () => {
            if (disposed) return;
            preloadImage(fullImageUrl, true).then(src => {
                if (!disposed) setReadySrc(src);
            }).catch(() => { /* Keep the placeholder on failure. */ });
        };
        let idleId: number | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        if (priority) load();
        else if (typeof requestIdleCallback !== 'undefined') {
            idleId = requestIdleCallback(load, { timeout: 1000 });
        } else timeoutId = setTimeout(load, 0);
        return () => {
            disposed = true;
            if (idleId !== undefined) cancelIdleCallback(idleId);
            if (timeoutId !== undefined) clearTimeout(timeoutId);
        };
    }, [canLoad, fullImageUrl, priority]);

    const handleImageLoaded = useCallback(() => {
        if (!fullSrc) return;
        setLoadedSrc(fullSrc);
        if (notifiedSrcRef.current !== fullSrc) {
            notifiedSrcRef.current = fullSrc;
            onLoadComplete?.();
        }
    }, [fullSrc, onLoadComplete, setLoadedSrc]);

    // Covers cache hits where the browser completed before the load listener attached.
    useLayoutEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            handleImageLoaded();
        }
    }, [handleImageLoaded]);

    // Tooltip state
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const mousePositionRef = useRef({ x: 0, y: 0 });
    const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useLayoutEffect(() => {
        if (showTooltip && tooltipRef.current) {
            tooltipRef.current.style.left = mousePositionRef.current.x + 'px';
            tooltipRef.current.style.top = mousePositionRef.current.y + 'px';
        }
    }, [showTooltip]);

    // Share URL selection with the card and avoid preloading the same neighbor twice.
    const handleMouseEnter = useCallback(() => {
        if (!images?.length || currentIndex === undefined || supportsAvif === null) return;
        const neighborIndexes = new Set([
            (currentIndex - 1 + images.length) % images.length,
            (currentIndex + 1) % images.length,
        ]);
        const urls = new Set<string>();
        for (const index of neighborIndexes) {
            if (index === currentIndex || !images[index]) continue;
            const url = getRegularImageUrl(images[index], supportsAvif);
            if (url && url !== fullImageUrl) urls.add(url);
        }
        urls.forEach(url => { preloadImage(url, true).catch(() => {}); });
    }, [images, currentIndex, supportsAvif, fullImageUrl]);

    // Handle mouse move to track position
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!minimal && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const position = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            mousePositionRef.current = position;
            if (tooltipRef.current) {
                tooltipRef.current.style.left = position.x + 'px';
                tooltipRef.current.style.top = position.y + 'px';
            }
        }
    }, [minimal]);

    // Handle mouse enter - start 2 second timer
    const handleContainerMouseEnter = useCallback(() => {
        if (minimal) return;
        handleMouseEnter();
        // Clear any existing timeout
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        // Set timeout to show tooltip after 2 seconds
        tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 2000);
    }, [handleMouseEnter, minimal]);

    // Handle mouse leave - hide tooltip and clear timeout
    const handleContainerMouseLeave = useCallback(() => {
        setShowTooltip(false);
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
        }
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
            }
        };
    }, []);

    // Get user info
    const uploadedBy = image.uploadedBy as (Image['uploadedBy'] & {
        avatar?: string; profilePicture?: string;
    }) | string | null;
    const username = typeof uploadedBy === 'object' ? uploadedBy?.username || '' : '';
    const userAvatar = typeof uploadedBy === 'object'
        ? uploadedBy?.avatar || uploadedBy?.profilePicture || uploadedBy?.avatarUrl || '' : '';

    // Favorite state
    const hasUser = useUserStore(state => !!state.user);
    const accessToken = useAuthStore(state => state.accessToken);
    const addDownloadToHistory = useDownloadHistoryStore(state => state.addDownloadToHistory);
    const isFavorited = useBatchedFavoriteCheck(minimal ? undefined : image._id);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    const openingRef = useRef(false);
    const favoriteBusyRef = useRef(false);
    const downloadBusyRef = useRef(false);
    const mountedRef = useRef(false);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const touchHandledRef = useRef(false);
    const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (touchTimeoutRef.current !== null) clearTimeout(touchTimeoutRef.current);
    }, []);

    const handleOpenImage = useCallback(async () => {
        if (!onClick || openingRef.current) return;
        openingRef.current = true;
        setIsOpening(true);
        try {
            await onClick();
        } catch (error) {
            console.error('Failed to open image:', error);
        } finally {
            openingRef.current = false;
            if (mountedRef.current) setIsOpening(false);
        }
    }, [onClick]);

    // Handle favorite/save button
    const handleSaveClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!image?._id || favoriteBusyRef.current) return;

        // If user is not logged in, redirect to sign-in page
        if (!hasUser) {
            navigate('/signin');
            return;
        }

        favoriteBusyRef.current = true;
        setIsTogglingFavorite(true);
        const requestToken = useAuthStore.getState().accessToken;
        try {
            const response = await favoriteService.toggleFavorite(image._id);
            if (useAuthStore.getState().accessToken !== requestToken) return;
            updateFavoriteCache(image._id, response.isFavorited);
            
            // Update favorite count from response (optimistic update)
            if (response.favoriteCount !== undefined) {
                const { useImageFavoriteCountStore } = await import('@/stores/useImageFavoriteCountStore');
                useImageFavoriteCountStore.getState().updateFavoriteCount(image._id, response.favoriteCount);
            }
            
            // Dispatch event with image data for optimistic favorites list update
            window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
                detail: { 
                    imageId: image._id, 
                    isFavorited: response.isFavorited,
                    image: image // Include full image object for adding to favorites list
                }
            }));
            
            if (response.isFavorited) {
                toast.success(t('favorites.added'));
            } else {
                toast.success(t('favorites.removed'));
            }
        } catch (error: unknown) {
            console.error('Failed to toggle favorite:', error);
            toast.error((error as ApiErrorResponse)?.response?.data?.message || t('favorites.error'));
        } finally {
            favoriteBusyRef.current = false;
            if (mountedRef.current) setIsTogglingFavorite(false);
        }
    }, [hasUser, image, navigate]);

    // Handle download button
    const handleDownloadClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!image?._id || downloadBusyRef.current) return;
        downloadBusyRef.current = true;
        setIsDownloading(true);

        try {
            // Increment download count
            try {
                await imageStatsService.incrementDownload(image._id);
            } catch (error) {
                // Continue with download even if increment fails
                console.error('Failed to increment download count:', error);
            }

            // Download image with medium size (default)
            const size: DownloadSize = 'medium';
            const response = await api.get(`/images/${image._id}/download?size=${size}`, {
                responseType: 'blob',
                withCredentials: true,
            });

            const contentType = typeof response.headers['content-type'] === 'string'
                ? response.headers['content-type'] : 'image/webp';
            const blob = new Blob([response.data], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;

            // Generate filename
            const imageTitle = image.imageTitle || 'photo';
            const sanitizedTitle = imageTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const extension = contentType.includes('webp') ? 'webp' : 'jpg';
            const fileName = `${sanitizedTitle}_${size}.${extension}`;

            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

            // Optimistic update: Add to download history immediately (if authenticated)
            if (accessToken && useAuthStore.getState().accessToken === accessToken) {
                addDownloadToHistory(image);
                
                // Dispatch event for global download history update
                window.dispatchEvent(new CustomEvent('downloadCompleted', {
                    detail: { image }
                }));
            }

            toast.success(t('image.downloadSuccess'));
        } catch (error) {
            console.error('Download failed:', error);
            toast.error(t('image.downloadFailed'));
        } finally {
            downloadBusyRef.current = false;
            if (mountedRef.current) setIsDownloading(false);
        }
    }, [image, accessToken, addDownloadToHistory]);

    // Handle author info click - navigate to profile
    const handleAuthorClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!uploadedBy) return;

        const userId = typeof uploadedBy === 'string' ? uploadedBy : uploadedBy._id;
        if (username) {
            navigate(`/@${username}`);
        } else if (userId) {
            navigate(`/profile/user/${userId}`);
        }
    }, [uploadedBy, username, navigate]);

    // Handle touch events on mobile to avoid 300ms click delay
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!isMobile || !onClick) return;
        if (touchTimeoutRef.current !== null) clearTimeout(touchTimeoutRef.current);
        touchHandledRef.current = false; // Reset flag
        const touch = e.touches[0];
        if (touch) {
            touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            };
        }
    }, [isMobile, onClick]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!isMobile || !onClick || !touchStartRef.current) return;
        
        const touch = e.changedTouches[0];
        if (!touch) {
            touchStartRef.current = null;
            return;
        }

        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
        const deltaTime = Date.now() - touchStartRef.current.time;

        // Only trigger if it's a tap (not a swipe) - allow 10px movement and 300ms
        if (deltaX > 10 || deltaY > 10 || deltaTime > 300) {
            touchStartRef.current = null;
            return;
        }

        const target = e.target as HTMLElement;
        // Don't trigger if touching buttons or author info
        if (target.closest('.blur-up-image-mobile-action-btn') || 
            target.closest('.blur-up-image-mobile-author')) {
            touchStartRef.current = null;
            return;
        }

        // Mark as handled and trigger navigation
        touchHandledRef.current = true;
        touchStartRef.current = null;
        
        // Trigger navigation
        void handleOpenImage();
        
        // Prevent default click and double-tap zoom
        e.preventDefault();
        e.stopPropagation();
        
        touchTimeoutRef.current = setTimeout(() => {
            touchHandledRef.current = false;
        }, 300);
    }, [isMobile, onClick, handleOpenImage]);

    return (
        <div
            ref={containerRef}
            className="blur-up-image-container"
            onClick={!isMobile && onClick ? handleOpenImage : undefined}
            onMouseEnter={handleContainerMouseEnter}
            onMouseLeave={handleContainerMouseLeave}
            onMouseMove={handleMouseMove}
        >
            {/* Mobile Layout: Author at top */}
            {!minimal && username && (
                <div className="blur-up-image-mobile-author">
                    {userAvatar ? (
                        <img
                            src={userAvatar}
                            alt={username}
                            className="blur-up-image-user-avatar"
                            onClick={handleAuthorClick}
                            style={{ cursor: 'pointer' }}
                        />
                    ) : (
                        <div 
                            className="blur-up-image-user-avatar-placeholder"
                            onClick={handleAuthorClick}
                            style={{ cursor: 'pointer' }}
                        >
                            {username[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    <span 
                        className="blur-up-image-username"
                        onClick={handleAuthorClick}
                        style={{ cursor: 'pointer' }}
                    >
                        {username}
                    </span>
                </div>
            )}

            {/* Image Container - clickable wrapper on mobile */}
            <div 
                className="blur-up-image-image-wrapper"
                aria-busy={isOpening}
                onTouchStart={isMobile ? handleTouchStart : undefined}
                onTouchEnd={isMobile ? handleTouchEnd : undefined}
                onTouchCancel={isMobile ? () => {
                    touchStartRef.current = null;
                    touchHandledRef.current = false;
                } : undefined}
                onClick={isMobile && onClick ? (e) => {
                    // On mobile, if touch already handled it, ignore click event
                    if (touchHandledRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    // Fallback for non-touch devices or if touch didn't handle it
                    const target = e.target as HTMLElement;
                    // Don't trigger if clicking on buttons or author info
                    if (target.closest('.blur-up-image-mobile-action-btn') || 
                        target.closest('.blur-up-image-mobile-author')) {
                        return;
                    }
                    void handleOpenImage();
                } : undefined}
                style={isMobile ? { cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } : undefined}
            >
                {/* Placeholder Image (Low Quality) - Hide immediately if image is cached to prevent flash */}
                {placeholderInitial && (base64Placeholder || canLoad) && !loaded ? (
                    <img
                        src={base64Placeholder || (canLoad ? networkPlaceholder : undefined) || undefined}
                        alt={image.imageTitle || 'photo'}
                        className="blur-up-image placeholder"
                        width={minimal ? undefined : (image.width || undefined)}
                        height={minimal ? undefined : (image.height || undefined)}
                        style={{
                            opacity: loaded ? 0 : 1,
                            /* Disable transition during initial load to prevent flashing */
                            transition: loaded ? 'opacity 0.15s ease-out' : 'opacity 0s',
                            pointerEvents: 'none', // Let wrapper handle clicks
                            /* Ensure placeholder has exact same dimensions as full image to prevent scaling */
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            // Don't set aspectRatio when minimal=true (used in collection cards) to prevent layout shifts
                            aspectRatio: minimal ? undefined : (image.width && image.height ? `${image.width} / ${image.height}` : undefined)
                        }}
                    />
                ) : !loaded ? (
                    /* Fallback placeholder if no thumbnail available - only show if not loaded */
                    <div
                        className="blur-up-image placeholder-fallback"
                        style={{
                            width: '100%',
                            height: '100%',
                            background: '#f3f4f6',
                            opacity: loaded ? 0 : 1,
                            transition: loaded ? 'opacity 0.15s ease-out' : 'opacity 0s',
                            pointerEvents: 'none'
                        }}
                    />
                ) : null}

                {/* Full Image (High Quality) */}
                {fullSrc && (
                    <img
                        key={fullSrc}
                        ref={imgRef}
                        src={fullSrc}
                        alt={image.imageTitle || 'photo'}
                        className={`blur-up-image full ${loaded ? 'loaded' : 'loading'}`}
                        width={minimal ? undefined : (image.width || undefined)}
                        height={minimal ? undefined : (image.height || undefined)}
                        loading="eager"
                        style={{ 
                            pointerEvents: 'none',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            // Don't set aspectRatio when minimal=true (used in collection cards) to prevent layout shifts
                            aspectRatio: minimal ? undefined : (image.width && image.height ? `${image.width} / ${image.height}` : undefined)
                        }}
                        onLoad={handleImageLoaded}
                        onError={() => setLoadedSrc(null)}
                    />
                )}

                {isOpening && (
                    <div className="blur-up-image-opening" role="status">
                        <div className="blur-up-image-opening-bar" aria-hidden="true" />
                        <span>Đang mở ảnh…</span>
                    </div>
                )}

                {/* Desktop Hover Overlay */}
                {!minimal && (
                <div className="blur-up-image-overlay">
                    {/* Top-right buttons */}
                    <div className="blur-up-image-actions">
                        <button
                            className="blur-up-image-action-btn"
                            onClick={handleSaveClick}
                            disabled={isTogglingFavorite}
                            aria-label="Save"
                        >
                            <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            className="blur-up-image-action-btn"
                            onClick={handleDownloadClick}
                            disabled={isDownloading}
                            aria-label="Download"
                        >
                            <Download size={18} />
                        </button>
                    </div>

                    {/* Bottom-left user info */}
                    {username && (
                        <div
                            className="blur-up-image-user-info"
                            onClick={handleAuthorClick}
                            style={{ cursor: 'pointer' }}
                        >
                            {userAvatar ? (
                                <img
                                    src={userAvatar}
                                    alt={username}
                                    className="blur-up-image-user-avatar"
                                />
                            ) : (
                                <div className="blur-up-image-user-avatar-placeholder">
                                    {username[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <span className="blur-up-image-username">{username}</span>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Mobile Layout: Buttons at bottom */}
            {!minimal && (
            <div className="blur-up-image-mobile-actions">
                <div className="blur-up-image-mobile-actions-left">
                    <button
                        className="blur-up-image-mobile-action-btn"
                        onClick={handleSaveClick}
                        disabled={isTogglingFavorite}
                        aria-label="Favorite"
                    >
                        <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        className="blur-up-image-mobile-action-btn"
                        onClick={handleSaveClick}
                        disabled={isTogglingFavorite}
                        aria-label="Bookmark"
                    >
                        <Bookmark size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                </div>
                <div className="blur-up-image-mobile-actions-right">
                    <button
                        className="blur-up-image-mobile-action-btn"
                        onClick={handleDownloadClick}
                        disabled={isDownloading}
                        aria-label="Download"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>
            )}

            {/* Image Title Tooltip - shows after 2 seconds at mouse position */}
            {!minimal && showTooltip && image.imageTitle && (
                <div
                    ref={tooltipRef}
                    className="blur-up-image-title-tooltip"
                >
                    {image.imageTitle}
                </div>
            )}
        </div>
    );
}

