import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMasonry } from '../hooks/useMasonry';
import type { Image } from '../types/image';
import './MasonryGrid.css';
import ProgressiveImage from './ProgressiveImage';
import { VideoPlayer } from './VideoPlayer';
import { Download, Plus, Bookmark, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { t } from '@/i18n';

export type DownloadSize = 'small' | 'medium' | 'large' | 'original';

interface MasonryGridProps {
    images: Image[];
    columnCount?: number;
    gap?: number;
    onImageClick?: (image: Image) => void;
    onDownload?: (image: Image, e: React.MouseEvent) => void;
    onDownloadWithSize?: (image: Image, size: DownloadSize) => void;
    onAddToCollection?: (image: Image, e: React.MouseEvent) => void;
}

const MasonryGrid: React.FC<MasonryGridProps> = ({
    images,
    columnCount = 3,
    gap = 24,
    onImageClick,
    onDownload,
    onDownloadWithSize,
    onAddToCollection,
}) => {
    const columns = useMasonry(images, columnCount, gap);
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= appConfig.mobileBreakpoint;
    });

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        const checkMobile = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
            }, 150);
        };
        window.addEventListener('resize', checkMobile);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const handleOverlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="masonry-grid" style={{ gap: `${gap}px` }}>
            {columns.map((column, colIndex) => (
                <div key={colIndex} className="masonry-column" style={{ gap: `${gap}px` }}>
                    {column.map((image) => {
                        if (isMobile) {
                            // Mobile: 3-section card structure
                            return (
                                <MobileImageCard
                                    key={image._id}
                                    image={image}
                                    onImageClick={onImageClick}
                                    onDownload={onDownload}
                                    onDownloadWithSize={onDownloadWithSize}
                                    onAddToCollection={onAddToCollection}
                                />
                            );
                        } else {
                            // Desktop: Hover overlay structure
                            return (
                                <div
                                    key={image._id}
                                    className="masonry-item"
                                    onClick={() => onImageClick?.(image)}
                                >
                                    {image.isVideo && image.videoUrl ? (
                                        <VideoPlayer
                                            src={image.videoUrl}
                                            thumbnail={image.videoThumbnail || image.thumbnailUrl}
                                            alt={image.imageTitle || 'video'}
                                            className="progressive-image"
                                            autoplay={true}
                                            loop={true}
                                            muted={true}
                                        />
                                    ) : (
                                        <ProgressiveImage
                                            src={image.imageUrl}
                                            smallUrl={image.smallUrl}
                                            thumbnailUrl={image.thumbnailUrl}
                                            regularUrl={image.regularUrl}
                                            imageAvifUrl={image.imageAvifUrl}
                                            smallAvifUrl={image.smallAvifUrl}
                                            thumbnailAvifUrl={image.thumbnailAvifUrl}
                                            regularAvifUrl={image.regularAvifUrl}
                                            alt={image.imageTitle || 'image'}
                                            eager={false}
                                            className="progressive-image"
                                        />
                                    )}
                                    <div className="image-card-overlay" onClick={handleOverlayClick}>
                                        <div className="overlay-top">
                                            <div /> {/* For spacing */}
                                            <div className="overlay-actions">
                                                {onAddToCollection && (
                                                    <button
                                                        aria-label="Add to collection"
                                                        onClick={(e) => onAddToCollection(image, e)}
                                                    >
                                                        <Plus size={16} className="text-gray-700" />
                                                    </button>
                                                )}
                                                {onDownload && (
                                                    <button
                                                        aria-label="Download image"
                                                        onClick={(e) => onDownload(image, e)}
                                                    >
                                                        <Download size={16} className="text-gray-700" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="overlay-bottom">
                                            {image.uploadedBy && (
                                                <Link to={`/profile/${image.uploadedBy.username}`} className="user-info">
                                                    <img
                                                        src={image.uploadedBy.avatarUrl || '/default-avatar.png'}
                                                        alt={image.uploadedBy.username}
                                                    />
                                                    <span>{image.uploadedBy.username}</span>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    })}
                </div>
            ))}
        </div>
    );
};

// Mobile-only 3-section card component
interface MobileImageCardProps {
    image: Image;
    onImageClick?: (image: Image) => void;
    onDownload?: (image: Image, e: React.MouseEvent) => void;
    onDownloadWithSize?: (image: Image, size: DownloadSize) => void;
    onAddToCollection?: (image: Image, e: React.MouseEvent) => void;
}

const MobileImageCard: React.FC<MobileImageCardProps> = ({
    image,
    onImageClick,
    onDownload,
    onDownloadWithSize,
    onAddToCollection,
}) => {
    const isFavorited = useBatchedFavoriteCheck(image._id);
    const { accessToken } = useAuthStore();
    const [togglingFavorites, setTogglingFavorites] = useState<Set<string>>(new Set());
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLButtonElement>(null);

    const handleBookmarkClick = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!accessToken || !image._id || togglingFavorites.has(image._id)) return;

        setTogglingFavorites(prev => new Set(prev).add(image._id));
        try {
            const imageId = String(image._id);
            const response = await favoriteService.toggleFavorite(imageId);
            updateFavoriteCache(imageId, response.isFavorited);

            if (response.isFavorited) {
                toast.success(t('favorites.added'));
            } else {
                toast.success(t('favorites.removed'));
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            toast.error(t('favorites.updateFailed'));
        } finally {
            setTogglingFavorites(prev => {
                const next = new Set(prev);
                next.delete(image._id);
                return next;
            });
        }
    }, [accessToken, image._id, togglingFavorites]);

    const handleDownloadClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDownload) {
            onDownload(image, e);
        }
    }, [onDownload, image]);

    const handleCollectionClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddToCollection) {
            onAddToCollection(image, e);
        }
    }, [onAddToCollection, image]);

    useEffect(() => {
        if (!showDownloadMenu) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setShowDownloadMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDownloadMenu]);

    useEffect(() => {
        setShowDownloadMenu(false);
    }, [image._id]);

    const handleDropdownClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDownloadMenu(!showDownloadMenu);
    };

    const handleSizeSelect = (size: DownloadSize, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDownloadMenu(false);
        if (onDownloadWithSize) {
            onDownloadWithSize(image, size);
        }
    };

    const sizeOptions: { value: DownloadSize; label: string }[] = [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'original', label: 'Original' },
    ];

    return (
        <figure className="masonry-card-mobile">
            {/* A. Author Section (Top) - Always Visible */}
            <div className="card-author-section-mobile">
                {image.uploadedBy && (
                    <Link
                        to={`/profile/${image.uploadedBy.username}`}
                        className="author-info-mobile"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={image.uploadedBy.avatarUrl || '/default-avatar.png'}
                            alt={image.uploadedBy.username}
                            className="author-avatar-mobile"
                        />
                        <span className="author-name-mobile">{image.uploadedBy.username}</span>
                    </Link>
                )}
            </div>

            {/* B. Image Section (Middle) - Always Visible */}
            <div
                className="card-image-section-mobile"
                onClick={() => onImageClick?.(image)}
            >
                {image.isVideo && image.videoUrl ? (
                    <VideoPlayer
                        src={image.videoUrl}
                        thumbnail={image.videoThumbnail || image.thumbnailUrl}
                        alt={image.imageTitle || 'video'}
                        className="card-image-mobile"
                        autoplay={true}
                        loop={true}
                        muted={true}
                    />
                ) : (
                    <ProgressiveImage
                        src={image.imageUrl}
                        smallUrl={image.smallUrl}
                        thumbnailUrl={image.thumbnailUrl}
                        regularUrl={image.regularUrl}
                        imageAvifUrl={image.imageAvifUrl}
                        smallAvifUrl={image.smallAvifUrl}
                        thumbnailAvifUrl={image.thumbnailAvifUrl}
                        regularAvifUrl={image.regularAvifUrl}
                        alt={image.imageTitle || 'image'}
                        eager={false}
                        className="card-image-mobile"
                    />
                )}
            </div>

            {/* C. Action Bar (Bottom) - Always Visible */}
            <div className="card-action-bar-mobile">
                <div className="action-buttons-left-mobile">
                    <button
                        className={`action-btn-mobile bookmark-btn-mobile ${isFavorited ? 'active' : ''}`}
                        aria-label={isFavorited ? 'Remove bookmark' : 'Bookmark image'}
                        title={isFavorited ? 'Remove bookmark' : 'Bookmark'}
                        onClick={handleBookmarkClick}
                    >
                        <Bookmark size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        className="action-btn-mobile collection-btn-mobile"
                        aria-label="Add to collection"
                        title="Add to collection"
                        onClick={handleCollectionClick}
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div className="download-btn-wrapper-mobile">
                    <button
                        className="download-btn-split-mobile download-btn-text-mobile"
                        onClick={handleDownloadClick}
                        aria-label="Download image"
                    >
                        Download
                    </button>
                    <button
                        ref={dropdownRef}
                        className="download-btn-split-mobile download-btn-dropdown-mobile"
                        onClick={handleDropdownClick}
                        aria-label="Download options"
                    >
                        <ChevronDown size={16} />
                    </button>
                    {showDownloadMenu && (
                        <div ref={menuRef} className="card-download-menu-mobile">
                            {sizeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className="card-download-menu-item-mobile"
                                    onClick={(e) => handleSizeSelect(option.value, e)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </figure>
    );
};

export default MasonryGrid;