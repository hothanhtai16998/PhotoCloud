import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { downloadHistoryService, type DownloadHistoryItem } from '@/services/downloadHistoryService';
import { downloadImage } from '@/utils/downloadService';
import { generateImageSlug } from '@/lib/utils';
import { toast } from 'sonner';
import { t, getLocale } from '@/i18n';
import { useIsMobile } from '@/hooks/useIsMobile';
import { saveScrollPosition, prepareModalNavigationState, setModalActive } from '@/utils/modalNavigation';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import { useContext } from 'react';
import type { Image } from '@/types/image';
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
    const actualLocation = useContext(ActualLocationContext);
    const isMobile = useIsMobile();
    const [downloads, setDownloads] = useState<DownloadHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const fetchDownloads = useCallback(async (pageNum: number = 1, append: boolean = false) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await downloadHistoryService.getDownloadHistory(pageNum, 20);
            
            if (append) {
                setDownloads(prev => [...prev, ...response.downloads]);
            } else {
                setDownloads(response.downloads);
            }

            setPage(response.pagination.page);
            setHasMore(response.pagination.hasMore);
            setTotal(response.pagination.total);
        } catch (error) {
            console.error('Failed to fetch download history:', error);
            toast.error(t('downloadHistory.loadFailed') || 'Failed to load download history');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchDownloads(1, false);
    }, [fetchDownloads]);

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            fetchDownloads(page + 1, true);
        }
    }, [fetchDownloads, page, hasMore, loadingMore]);

    const handleImageClick = useCallback((image: Image) => {
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
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

    // Format date for item (e.g., "17 Dec 2025")
    const formatDateItem = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        const locale = getLocale() === 'vi' ? 'vi-VN' : 'en-US';
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Generate filename from image
    const getFileName = (image: Image): string => {
        const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        return `${sanitizedTitle}.${urlExtension}`;
    };

    // Get uploader name
    const getUploaderName = (image: Image): string => {
        if (typeof image.uploadedBy === 'object' && image.uploadedBy) {
            return image.uploadedBy.displayName || image.uploadedBy.username || 'Unknown';
        }
        return 'Unknown';
    };

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(groupedDownloads).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
    });

    if (loading && downloads.length === 0) {
        return (
            <div className={`download-history ${className}`}>
                <div className="download-history-loading">
                    <p>{t('downloadHistory.loading') || 'Loading download history...'}</p>
                </div>
            </div>
        );
    }

    if (downloads.length === 0) {
        return (
            <div className={`download-history ${className}`}>
                <div className="download-history-empty">
                    <img src={emptyImage} alt="" className="download-history-empty-image" />
                    <h2>{t('downloadHistory.empty') || 'No downloads yet'}</h2>
                    <p>{t('downloadHistory.emptyHint') || 'Your download history will appear here once you start downloading images.'}</p>
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
                            {groupedDownloads[date].map((item) => {
                                const image = item.image;
                                if (!image) return null;

                                return (
                                    <div
                                        key={item._id}
                                        className="download-history-item"
                                        onClick={() => handleImageClick(image)}
                                    >
                                        <div className="download-history-item-thumbnail">
                                            <img
                                                src={image.thumbnailUrl || image.smallUrl || image.regularUrl || image.imageUrl}
                                                alt={image.imageTitle || 'Downloaded image'}
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
                                        </div>
                                        <div className="download-history-item-meta">
                                            <div className="download-history-item-date">
                                                {formatDateItem(item.date)}
                                            </div>
                                            <button
                                                className="download-history-item-download-btn"
                                                onClick={(e) => handleReDownload(e, image)}
                                                title={t('downloadHistory.reDownload') || 'Download again'}
                                                aria-label={t('downloadHistory.reDownload') || 'Download again'}
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
                                ? (t('downloadHistory.loadingMore') || 'Loading...')
                                : (t('downloadHistory.loadMore') || 'Load More')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

