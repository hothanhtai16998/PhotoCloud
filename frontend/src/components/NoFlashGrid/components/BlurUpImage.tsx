import { useEffect, useRef, useState, useCallback } from 'react';
import type { Image } from '@/types/image';
import { preloadImage } from '../utils/imagePreloader';
import { getBestImageUrl } from '@/utils/avifSupport';
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
import type { DownloadSize } from './DownloadSizeSelector';
import './BlurUpImage.css';

type ExtendedImage = Image & { categoryName?: string; category?: string };

interface BlurUpImageProps {
    image: ExtendedImage;
    onClick?: () => void;
    priority?: boolean;
    onLoadComplete?: () => void;
    images?: ExtendedImage[]; // Full images array for preloading adjacent images
    currentIndex?: number; // Current index in images array
}

export function BlurUpImage({
    image,
    onClick,
    priority = false,
    onLoadComplete,
    images,
    currentIndex,
}: BlurUpImageProps) {
    // Use base64 thumbnail for instant placeholder (like Unsplash) - no network request needed
    const base64Placeholder = image.base64Thumbnail || null;
    const networkPlaceholder = image.thumbnailUrl || image.smallUrl || image.imageUrl || null;
    const placeholderInitial = base64Placeholder || networkPlaceholder;
    const [loaded, setLoaded] = useState(false);
    const [fullSrc, setFullSrc] = useState<string | null>(null);
    const [isInView, setIsInView] = useState(priority);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const loadingRef = useRef(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (priority) {
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => setIsInView(true), 0);
            return;
        }

        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '500px', // Start loading 500px before entering viewport (more aggressive)
                threshold: 0.01,
            }
        );

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [priority]);

    // Load full image when in view
    useEffect(() => {
        if (!isInView || loadingRef.current) return;

        // Get best image URL (AVIF if supported, otherwise WebP/JPEG)
        // Use regularUrl for grid view (1080px, optimized for display)
        // This is similar to Unsplash's approach: grid uses "regular" size, not original
        const loadImage = async () => {
            try {
                // Get best format (AVIF if supported, fallback to regularUrl)
                const bestUrl = await getBestImageUrl(image, 'regular');
                const full = bestUrl || image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl || '';

                // If already using full image, no need to reload
                if (fullSrc === full) return;

                loadingRef.current = true;
                // Skip decode for grid images to load faster (like admin page)
                const src = await preloadImage(full, true);
                setFullSrc(src);
                // Check if image is already cached by creating a test image
                const testImg = new Image();
                testImg.onload = () => {
                    // Image is cached - set loaded immediately to prevent flash
                    setLoaded(true);
                };
                testImg.onerror = () => {
                    // Image not cached - will load normally
                };
                testImg.src = src;
            } catch {
                // Keep placeholder on error
            } finally {
                loadingRef.current = false;
            }
        };

        loadImage();
    }, [isInView, image, fullSrc]);

    // Tooltip state
    const [showTooltip, setShowTooltip] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Preload adjacent images on hover for faster modal navigation
    const handleMouseEnter = useCallback(() => {
        if (!images || currentIndex === undefined) return;
        
        // Preload previous and next images (for modal navigation)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
        const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
        
        const prevImage = images[prevIndex];
        const nextImage = images[nextIndex];
        
        // Preload regularUrl for adjacent images (what modal will use)
        if (prevImage) {
            const prevUrl = prevImage.regularUrl || prevImage.imageUrl || prevImage.smallUrl;
            if (prevUrl) {
                preloadImage(prevUrl, true).catch(() => {});
            }
        }
        
        if (nextImage) {
            const nextUrl = nextImage.regularUrl || nextImage.imageUrl || nextImage.smallUrl;
            if (nextUrl) {
                preloadImage(nextUrl, true).catch(() => {});
            }
        }
    }, [images, currentIndex]);

    // Handle mouse move to track position
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMousePosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
    }, []);

    // Handle mouse enter - start 2 second timer
    const handleContainerMouseEnter = useCallback(() => {
        handleMouseEnter();
        // Clear any existing timeout
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        // Set timeout to show tooltip after 2 seconds
        tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 2000);
    }, [handleMouseEnter]);

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
    const uploadedBy = (image as any)?.uploadedBy;
    const username = uploadedBy?.username || '';
    const userAvatar = uploadedBy?.avatar || uploadedBy?.profilePicture || '';

    // Favorite state
    const { user } = useUserStore();
    const isFavorited = useBatchedFavoriteCheck(image?._id);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const touchHandledRef = useRef(false);

    // Handle favorite/save button
    const handleSaveClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !image?._id || isTogglingFavorite) return;

        setIsTogglingFavorite(true);
        try {
            const response = await favoriteService.toggleFavorite(image._id);
            updateFavoriteCache(image._id, response.isFavorited);
            if (response.isFavorited) {
                toast.success(t('favorites.added'));
            } else {
                toast.success(t('favorites.removed'));
            }
        } catch (error: any) {
            console.error('Failed to toggle favorite:', error);
            toast.error(error?.response?.data?.message || t('favorites.error'));
        } finally {
            setIsTogglingFavorite(false);
        }
    }, [user, image?._id, isTogglingFavorite]);

    // Handle bookmark button (using same favorite functionality for now)
    const handleBookmarkClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        // For now, bookmark uses the same favorite functionality
        // Can be changed to use collection service later if needed
        await handleSaveClick(e);
    }, [handleSaveClick]);

    // Handle download button
    const handleDownloadClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!image?._id) return;

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

            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;

            // Generate filename
            const imageTitle = image.imageTitle || 'photo';
            const sanitizedTitle = imageTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const extension = response.headers['content-type']?.includes('webp') ? 'webp' : 'jpg';
            const fileName = `${sanitizedTitle}_${size}.${extension}`;

            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

            toast.success(t('image.downloadSuccess'));
        } catch (error) {
            console.error('Download failed:', error);
            toast.error(t('image.downloadFailed'));
        }
    }, [image]);

    // Handle author info click - navigate to profile
    const handleAuthorClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!uploadedBy) return;

        const userId = uploadedBy._id || uploadedBy;
        if (username) {
            navigate(`/profile/${username}`);
        } else if (userId) {
            navigate(`/profile/user/${userId}`);
        }
    }, [uploadedBy, username, navigate]);

    // Handle touch events on mobile to avoid 300ms click delay
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!isMobile || !onClick) return;
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
        onClick();
        
        // Prevent default click and double-tap zoom
        e.preventDefault();
        e.stopPropagation();
        
        setTimeout(() => {
            touchHandledRef.current = false;
        }, 300);
    }, [isMobile, onClick]);

    return (
        <div
            ref={containerRef}
            className="blur-up-image-container"
            onClick={!isMobile ? onClick : undefined}
            onMouseEnter={handleContainerMouseEnter}
            onMouseLeave={handleContainerMouseLeave}
            onMouseMove={handleMouseMove}
        >
            {/* Mobile Layout: Author at top */}
            {username && (
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
                onTouchStart={isMobile ? handleTouchStart : undefined}
                onTouchEnd={isMobile ? handleTouchEnd : undefined}
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
                    onClick();
                } : undefined}
                style={isMobile ? { cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } : undefined}
            >
                {/* Placeholder Image (Low Quality) */}
                {placeholderInitial && (
                    <img
                        src={placeholderInitial}
                        alt={image.imageTitle || 'photo'}
                        className="blur-up-image placeholder"
                        decoding="async"
                        style={{
                            opacity: loaded ? 0 : 1,
                            /* Disable transition during initial load to prevent flashing */
                            transition: loaded ? 'opacity 0.15s ease-out' : 'opacity 0s',
                            pointerEvents: 'none' // Let wrapper handle clicks
                        }}
                    />
                )}

                {/* Full Image (High Quality) */}
                {fullSrc && (
                    <img
                        ref={(el) => {
                            imgRef.current = el;
                            // Check if image is already loaded (cached) to prevent flash
                            if (el && el.complete && el.naturalWidth > 0 && !loaded) {
                                setLoaded(true);
                            }
                        }}
                        src={fullSrc}
                        alt={image.imageTitle || 'photo'}
                        className={`blur-up-image full ${loaded ? 'loaded' : 'loading'}`}
                        loading={priority ? 'eager' : 'lazy'}
                        fetchPriority={priority ? 'high' : 'auto'}
                        decoding="async"
                        style={{ pointerEvents: 'none' }} // Let wrapper handle clicks
                        onLoad={() => {
                            setLoaded(true);
                            onLoadComplete?.();
                        }}
                        onError={() => {
                            // If image fails to load, still show placeholder
                            setLoaded(false);
                        }}
                    />
                )}

                {/* Desktop Hover Overlay */}
                <div className="blur-up-image-overlay">
                    {/* Top-right buttons */}
                    <div className="blur-up-image-actions">
                        {user && (
                            <button
                                className="blur-up-image-action-btn"
                                onClick={handleSaveClick}
                                disabled={isTogglingFavorite}
                                aria-label="Save"
                            >
                                <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                            </button>
                        )}
                        <button
                            className="blur-up-image-action-btn"
                            onClick={handleDownloadClick}
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
            </div>

            {/* Mobile Layout: Buttons at bottom */}
            <div className="blur-up-image-mobile-actions">
                <div className="blur-up-image-mobile-actions-left">
                    {user && (
                        <button
                            className="blur-up-image-mobile-action-btn"
                            onClick={handleSaveClick}
                            disabled={isTogglingFavorite}
                            aria-label="Favorite"
                        >
                            <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                        </button>
                    )}
                    {user && (
                        <button
                            className="blur-up-image-mobile-action-btn"
                            onClick={handleBookmarkClick}
                            disabled={isTogglingFavorite}
                            aria-label="Bookmark"
                        >
                            <Bookmark size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                        </button>
                    )}
                </div>
                <div className="blur-up-image-mobile-actions-right">
                    <button
                        className="blur-up-image-mobile-action-btn"
                        onClick={handleDownloadClick}
                        aria-label="Download"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Image Title Tooltip - shows after 2 seconds at mouse position */}
            {showTooltip && image.imageTitle && (
                <div
                    className="blur-up-image-title-tooltip"
                    style={{
                        left: `${mousePosition.x}px`,
                        top: `${mousePosition.y}px`,
                    }}
                >
                    {image.imageTitle}
                </div>
            )}
        </div>
    );
}

