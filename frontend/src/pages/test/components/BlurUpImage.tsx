import { useEffect, useRef, useState, useCallback } from 'react';
import type { Image } from '@/types/image';
import { preloadImage } from '../utils/imagePreloader';
import { Heart, Download } from 'lucide-react';
import { favoriteService } from '@/services/favoriteService';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import { imageStatsService } from '@/services/imageStatsService';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { t } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import type { DownloadSize } from '@/components/image/DownloadSizeSelector';
import './BlurUpImage.css';

type ExtendedImage = Image & { categoryName?: string; category?: string };

interface BlurUpImageProps {
    image: ExtendedImage;
    onClick?: () => void;
    priority?: boolean;
    onLoadComplete?: () => void;
}

export function BlurUpImage({
    image,
    onClick,
    priority = false,
    onLoadComplete,
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

        // Use regularUrl for grid view (1080px, optimized for display)
        // This is similar to Unsplash's approach: grid uses "regular" size, not original
        // Only fallback to imageUrl if regularUrl doesn't exist (for old images)
        const full = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl || '';

        // If already using full image, no need to reload
        if (fullSrc === full) return;

        loadingRef.current = true;
        // Skip decode for grid images to load faster (like admin page)
        preloadImage(full, true)
            .then((src) => {
                setFullSrc(src);
            })
            .catch(() => {
                // Keep placeholder on error
            })
            .finally(() => {
                loadingRef.current = false;
            });
    }, [isInView, image, fullSrc]);

    // Tooltip state
    const [showTooltip, setShowTooltip] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Preload on hover for better UX
    const handleMouseEnter = useCallback(() => {
        if (!loaded && isInView) {
            // Use regularUrl for hover preload (grid images)
            const full = image.regularUrl || image.imageUrl || image.thumbnailUrl || image.smallUrl;
            if (full && full !== fullSrc) {
                // Skip decode for hover preload (grid images)
                preloadImage(full, true).catch(() => { });
            }
        }
    }, [loaded, isInView, image, fullSrc]);

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

    return (
        <div
            ref={containerRef}
            className="blur-up-image-container"
            onClick={onClick}
            onMouseEnter={handleContainerMouseEnter}
            onMouseLeave={handleContainerMouseLeave}
            onMouseMove={handleMouseMove}
        >
            {/* Placeholder Image (Low Quality) */}
            {placeholderInitial && (
                <img
                    src={placeholderInitial}
                    alt={image.imageTitle || 'photo'}
                    className="blur-up-image placeholder"
                    style={{
                        opacity: loaded ? 0 : 1,
                        transition: 'opacity 0.5s ease-out'
                    }}
                />
            )}

            {/* Full Image (High Quality) */}
            {fullSrc && (
                <img
                    src={fullSrc}
                    alt={image.imageTitle || 'photo'}
                    className={`blur-up-image full ${loaded ? 'loaded' : 'loading'}`}
                    loading="lazy"
                    onLoad={() => {
                        setLoaded(true);
                        onLoadComplete?.();
                    }}
                />
            )}

            {/* Hover Overlay */}
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
