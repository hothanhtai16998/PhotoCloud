import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { downloadImage } from '@/utils/downloadService';
import { generateImageSlug, slugify } from '@/lib/utils';
import { toast } from 'sonner';
import { t, getLocale } from '@/i18n';
import { useIsMobile } from '@/hooks/useIsMobile';
import { saveScrollPosition, prepareModalNavigationState, setModalActive } from '@/utils/modalNavigation';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import { useContext } from 'react';
import type { Image } from '@/types/image';
import { useDownloadHistoryStore } from '@/stores/useDownloadHistoryStore';
import emptyImage from '@/assets/empty.avif';
import './DownloadHistory.css';

interface DownloadHistoryProps {
    className?: string;
}

interface GroupedDownloads {
    [date: string]: DownloadHistoryItem[];
}

export function DownloadHistory({ className = '' }: DownloadHistoryProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const actualLocation = useContext(ActualLocationContext);
    const isMobile = useIsMobile();
    
    const {
        downloads,
        loading,
        loadingMore,
        page,
        hasMore,
        total,
        hasLoaded,
        fetchDownloads,
        resetLoading,
        checkAndRefreshIfStale,
    } = useDownloadHistoryStore();

    useEffect(() => {
        // Only fetch if we're on the downloads page
        if (location.pathname !== '/downloads') {
            return;
        }

        // On mount, if we have data, ensure loading is false
        if (downloads.length > 0) {
            resetLoading();
        }

        // Only fetch if we haven't loaded yet
        if (!hasLoaded) {
            fetchDownloads(1, false);
        } else {
            // Unsplash-style: Silent background refresh if stale
            checkAndRefreshIfStale();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Unsplash-style: Periodic check for stale data (every minute)
    useEffect(() => {
        if (!hasLoaded || location.pathname !== '/downloads') return;
        
        const interval = setInterval(() => {
            checkAndRefreshIfStale();
        }, 1 * 60 * 1000); // Check every 1 minute (matches stale threshold)
        
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLoaded, location.pathname]);

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            fetchDownloads(page + 1, true);
        }
    }, [fetchDownloads, page, hasMore, loadingMore]);

    const handleImageClick = useCallback((image: Image) => {
        const slug = generateImageSlug(image.imageTitle || t('image.untitled') || 'Untitled', image._id);
        const targetPath = `/photos/${slug}`;

        if (isMobile) {
            navigate(targetPath);
            return;
        }

        // Desktop: modal-style with background
        saveScrollPosition();
        setModalActive();

        const backgroundLocation = {
            pathname: actualLocation?.pathname || '/downloads',
            search: actualLocation?.search || '',
            hash: actualLocation?.hash || '',
            state: null,
            key: actualLocation?.key || 'default',
        };
        const modalState = prepareModalNavigationState(backgroundLocation);

        navigate(targetPath, {
            state: { ...modalState, image, fromGrid: true }
        });
    }, [navigate, actualLocation, isMobile]);

    const handleReDownload = useCallback(async (e: React.MouseEvent, image: Image) => {
        e.stopPropagation();
        try {
            await downloadImage(image, 'medium');
            toast.success(t('image.downloadSuccess') || 'Downloaded successfully');
        } catch (error) {
            console.error('Failed to download image:', error);
            toast.error(t('image.downloadFailed') || 'Failed to download image');
        }
    }, []);

    // Group downloads by date
    const groupedDownloads: GroupedDownloads = downloads.reduce((acc, item) => {
        const date = item.date; // YYYY-MM-DD format
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {} as GroupedDownloads);

    // Format date for display (e.g., "December 18, 2025")
    const formatDateHeader = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        const locale = getLocale() === 'vi' ? 'vi-VN' : 'en-US';
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };


    // Generate filename from image
    const getFileName = (image: Image): string => {
        if (image.imageTitle) {
            // Use slugify to properly handle Vietnamese characters
            // Convert to filename format (underscores instead of hyphens)
            const slug = slugify(image.imageTitle);
            const filename = slug.replace(/-/g, '_'); // Use underscores for filename
            const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
            return `${filename}.${urlExtension}`;
        }
        // Fallback to default
        const defaultName = t('image.photo') || 'photo';
        const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        return `${defaultName}.${urlExtension}`;
    };

    // Get uploader name
    const getUploaderName = (image: Image): string => {
        if (typeof image.uploadedBy === 'object' && image.uploadedBy) {
            return image.uploadedBy.displayName || image.uploadedBy.username || t('common.unknown') || 'Unknown';
        }
        return t('common.unknown') || 'Unknown';
    };

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(groupedDownloads).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
    });

    if (loading && downloads.length === 0) {
        return (
            <div className={`download-history ${className}`}>
                <div className="download-history-loading">
                    <Loader2 className="download-history-spinner" size={32} />
                    <p>{t('profile.downloadHistorySection.loading') || 'Loading download history...'}</p>
                </div>
            </div>
        );
    }

    if (downloads.length === 0) {
        return (
            <div className={`download-history ${className}`}>
                <div className="download-history-empty">
                    <img src={emptyImage} alt="" className="download-history-empty-image" />
                    <h2>{t('profile.downloadHistorySection.empty') || 'No downloads yet'}</h2>
                    <p>{t('profile.downloadHistorySection.emptyHint') || 'Your download history will appear here once you start downloading images.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`download-history ${className}`}>
            <div className="download-history-content">
                {sortedDates.map((date) => (
                    <div key={date} className="download-history-group">
                        <h3 className="download-history-date-header">
                            {formatDateHeader(date)}
                        </h3>
                        <div className="download-history-items">
                            {groupedDownloads[date].map((item, index) => {
                                const image = item.image;
                                if (!image) return null;

                                return (
                                    <div
                                        key={item._id}
                                        className="download-history-item"
                                        onClick={() => handleImageClick(image)}
                                    >
                                        <div className="download-history-item-thumbnail-wrapper">
                                            <div className="download-history-item-thumbnail">
                                                <img
                                                    src={image.thumbnailUrl || image.smallUrl || image.regularUrl || image.imageUrl}
                                                    alt={image.imageTitle || t('profile.downloadHistorySection.downloadedImage') || 'Downloaded image'}
                                                    loading="lazy"
                                                />
                                            </div>
                                            <div className="download-history-item-info">
                                                <div className="download-history-item-uploader">
                                                    {getUploaderName(image)}
                                                </div>
                                                <div className="download-history-item-filename">
                                                    {getFileName(image)}
                                                </div>
                                                {image.imageTitle && image.imageTitle !== 'photo' && (
                                                    <div className="download-history-item-title">
                                                        {image.imageTitle}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="download-history-item-meta">
                                            <button
                                                className="download-history-item-download-btn"
                                                onClick={(e) => handleReDownload(e, image)}
                                                title={t('profile.downloadHistorySection.reDownload') || 'Download again'}
                                                aria-label={t('profile.downloadHistorySection.reDownload') || 'Download again'}
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <div className="download-history-load-more">
                        <button
                            className="download-history-load-more-btn"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore
                                ? (t('profile.downloadHistorySection.loadingMore') || 'Loading...')
                                : (t('profile.downloadHistorySection.loadMore') || 'Load More')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DownloadHistory;

