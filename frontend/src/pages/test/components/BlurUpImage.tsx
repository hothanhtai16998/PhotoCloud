import { useEffect, useRef, useState, useCallback } from 'react';
import type { Image } from '@/types/image';
import { preloadImage } from '../utils/imagePreloader';
import { Heart, Download } from 'lucide-react';
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
    const [backSrc, setBackSrc] = useState<string | null>(placeholderInitial);
    const [isInView, setIsInView] = useState(priority);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const frontRef = useRef<HTMLImageElement | null>(null);
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
        if (backSrc === full && loaded) return;

        loadingRef.current = true;
        // Skip decode for grid images to load faster (like admin page)
        preloadImage(full, true)
            .then((src) => {
                setBackSrc(src);
                setLoaded(true);
                onLoadComplete?.();
            })
            .catch(() => {
                // Keep placeholder on error
                setLoaded(true);
            })
            .finally(() => {
                loadingRef.current = false;
            });
    }, [isInView, image, backSrc, loaded, onLoadComplete]);

    // Preload on hover for better UX
    const handleMouseEnter = useCallback(() => {
        if (!loaded && isInView) {
            // Use regularUrl for hover preload (grid images)
            const full = image.regularUrl || image.imageUrl || image.thumbnailUrl || image.smallUrl;
            if (full && full !== backSrc) {
                // Skip decode for hover preload (grid images)
                preloadImage(full, true).catch(() => { });
            }
        }
    }, [loaded, isInView, image, backSrc]);

    // Get user info
    const uploadedBy = (image as any)?.uploadedBy;
    const username = uploadedBy?.username || '';
    const userAvatar = uploadedBy?.avatar || uploadedBy?.profilePicture || '';

    // Handle button clicks (stop propagation to prevent opening modal)
    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implement save/favorite functionality
    };

    const handleDownloadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implement download functionality
    };

    return (
        <div
            ref={containerRef}
            className="blur-up-image-container"
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
        >
            {backSrc && (
                <img
                    src={backSrc}
                    alt={image.imageTitle || 'photo'}
                    className={`blur-up-image ${loaded ? 'loaded' : 'loading'}`}
                    ref={frontRef}
                    loading="lazy"
                />
            )}

            {/* Hover Overlay */}
            <div className="blur-up-image-overlay">
                {/* Top-right buttons */}
                <div className="blur-up-image-actions">
                    <button
                        className="blur-up-image-action-btn"
                        onClick={handleSaveClick}
                        aria-label="Save"
                    >
                        <Heart size={18} />
                    </button>
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
                    <div className="blur-up-image-user-info">
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
    );
}
