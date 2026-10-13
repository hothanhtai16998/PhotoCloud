import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Image } from '@/types/image';
import './NoFlashGrid.css';

// Import extracted modules
import { GRID_CONFIG } from './constants/gridConfig';
import { preloadImage, preloadImages } from './utils/imagePreloader';
import { loadImageDimensions, getCachedImageDimensions } from './utils/imageDimensions';
import { calculateImageLayout, getColumnCount } from './utils/gridLayout';
import { BlurUpImage } from './components/BlurUpImage';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';

// Simple blur-up image with persistent back layer
type ExtendedImage = Image & { categoryName?: string; category?: string; isPinned?: boolean };

export interface NoFlashGridProps {
    containerId?: string | null;
    images: ExtendedImage[];
    compactMobile?: boolean;
    loading?: boolean;
    onLoadData?: () => Promise<void>;
    className?: string;
    onImageClick?: (image: ExtendedImage, index: number) => void; // Handler for image click (typically navigates to ImagePage)
    onImageHover?: (image: ExtendedImage) => void; // Handler for image hover (for preloading)
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    } | null;
    onLoadMore?: () => Promise<void>; // Handler for loading more images (infinite scroll)
}

export function NoFlashGrid({ images, loading: externalLoading, onLoadData, className = '', onImageClick, onImageHover, pagination, onLoadMore, compactMobile = false, containerId = 'image-grid-container' }: NoFlashGridProps) {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const isMobile = useIsMobile();
    const compactLayout = compactMobile && isMobile;
    const gap = compactLayout ? 12 : GRID_CONFIG.gap;
    const [columnCount, setColumnCount] = useState(() => {
        if (typeof window === 'undefined') return GRID_CONFIG.columns.desktop;
        return compactMobile && window.innerWidth <= 768 ? 2 : getColumnCount(window.innerWidth);
    });
    const [containerWidth, setContainerWidth] = useState(0); // Start at 0, will be updated after mount to prevent initial render with wrong dimensions

    // Store image dimensions as they load
    const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
    const imageDimensionsRef = useRef(imageDimensions);

    // Load data using provided callback
    const loadData = useCallback(async () => {
        if (onLoadData) {
            await onLoadData();
        }
    }, [onLoadData]);

    // Refresh data when tab becomes visible again (after being hidden for a while)
    // This syncs data if it was updated in another tab, but only refreshes when appropriate
    useEffect(() => {
        if (!onLoadData) return;
        
        let hiddenTime: number | null = null;
        const MIN_HIDDEN_TIME = 30000; // Only refresh if hidden for 30+ seconds

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab became hidden - record the time
                hiddenTime = Date.now();
            } else {
                // Tab became visible - check if we should refresh
                if (hiddenTime !== null) {
                    const hiddenDuration = Date.now() - hiddenTime;
                    // Only refresh if tab was hidden for a meaningful duration
                    // This prevents refresh on quick tab switches
                    if (hiddenDuration >= MIN_HIDDEN_TIME) {
                        loadData();
                    }
                    hiddenTime = null;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadData, onLoadData]);

    // Use images directly - no filtering needed currently
    const filteredImages = images;

    // Preload thumbnails for first batch of images when images change
    useEffect(() => {
        if (images.length === 0) return;
        const thumbnails = images.slice(0, 20)
            .map(img => img.thumbnailUrl || img.smallUrl)
            .filter((src): src is string => Boolean(src));
        preloadImages(thumbnails, true);
    }, [images]);

    useEffect(() => {
        let active = true;
        const missing = filteredImages.slice(0, 50).filter(image => !(image.width && image.height) && !imageDimensionsRef.current.has(image._id));
        void (async () => {
            for (let i = 0; i < missing.length && active; i += 5) {
                const results = await Promise.all(missing.slice(i, i + 5).map(async image => {
                    const url = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                    if (!url) return null;
                    try { return {id: image._id, dims: getCachedImageDimensions(url) || await loadImageDimensions(url)}; } catch { return null; }
                }));
                if (!active) return;
                setImageDimensions(previous => {
                    const next = new Map(previous);
                    results.forEach(result => { if (result?.dims) next.set(result.id, result.dims); });
                    imageDimensionsRef.current = next;
                    return next;
                });
            }
        })();
        return () => { active = false; };
    }, [filteredImages]);
    const precalculatedDimensionsMap = useMemo(() => {
        const map = new Map(imageDimensions);
        filteredImages.forEach(image => {
            if (image.width && image.height) map.set(image._id, {width: image.width, height: image.height});
            else {
                const url = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                const cached = url && getCachedImageDimensions(url);
                if (cached) map.set(image._id, cached);
            }
        });
        return map;
    }, [filteredImages, imageDimensions]);

    // Calculate grid layout for each image (row spans and columns)
    const gridLayout = useMemo(() => {
        if (filteredImages.length === 0) return [];
        if (containerWidth === 0 || !isFinite(containerWidth) || containerWidth <= 0) return [];
        if (columnCount < 1 || !isFinite(columnCount)) return [];

        // Check if we're on mobile (1 column)
        const isMobileLayout = columnCount === 1;
        // Mobile UI bars take up space:
        // - Author bar: 12px top + 42px avatar + 12px bottom + text line-height = ~66px
        // - Actions bar: 12px top + 40px buttons + 12px bottom = ~64px
        // Total: ~130px
        // Convert to row units to add to rowSpan
        const mobileUIBarsHeight = 130; // Total height of mobile author + actions bars
        const rowUnit = GRID_CONFIG.baseRowHeight + gap;
        const mobileUIBarsRowSpan = Math.ceil(mobileUIBarsHeight / rowUnit);

        // Calculate column width
        const gapTotal = gap * (columnCount - 1);
        const columnWidth = (containerWidth - gapTotal) / columnCount;

        // Track pixel heights in each column for shortest-column algorithm
        // This is more accurate than row-based tracking
        const columnHeights = new Array(columnCount).fill(0);

        return filteredImages.map((image) => {
            let dimensions = precalculatedDimensionsMap.get(image._id) || null;
            
            if (!dimensions && image.width && image.height && image.width > 0 && image.height > 0) {
                dimensions = { width: image.width, height: image.height };
            }

            // Calculate row span based on aspect ratio
            const layout = calculateImageLayout(
                image,
                columnWidth,
                GRID_CONFIG.baseRowHeight,
                dimensions
            );

            // On mobile only, add extra rowSpan to compensate for mobile UI bars
            // Desktop (3 columns) and tablet (2 columns) are NOT affected - they use original rowSpan
            // This ensures the image itself gets the intended height on mobile
            const naturalDimensions = dimensions || { width: 4, height: 3 };
            const finalRowSpan = compactLayout
                ? Math.max(1, Math.ceil((columnWidth * naturalDimensions.height / naturalDimensions.width + gap) / rowUnit))
                : isMobileLayout
                ? layout.rowSpan + mobileUIBarsRowSpan
                : layout.rowSpan;

            // Find the shortest column (by pixel height)
            let shortestColumnIndex = 0;
            let shortestHeight = columnHeights[0];
            for (let i = 1; i < columnCount; i++) {
                if (columnHeights[i] < shortestHeight) {
                    shortestHeight = columnHeights[i];
                    shortestColumnIndex = i;
                }
            }

            // Place image in the shortest column
            const column = shortestColumnIndex + 1; // CSS Grid columns are 1-indexed

            const rowStart = Math.max(1, Math.floor(shortestHeight / rowUnit) + 1);
            const exactHeight = finalRowSpan * GRID_CONFIG.baseRowHeight + (finalRowSpan - 1) * gap;

            columnHeights[shortestColumnIndex] = shortestHeight + finalRowSpan * rowUnit;

            return {
                image,
                column,
                rowSpan: finalRowSpan,
                rowStart,
                columnWidth,
                exactHeight,
            };
        });
    }, [filteredImages, columnCount, containerWidth, precalculatedDimensionsMap, compactLayout, gap]);

    // Measure the grid itself: mobile and search containers have different padding.
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;
        const updateLayout = () => {
            setContainerWidth(grid.getBoundingClientRect().width);
            setColumnCount(compactMobile && window.innerWidth <= 768 ? 2 : getColumnCount(window.innerWidth));
        };
        updateLayout();
        const observer = new ResizeObserver(updateLayout);
        observer.observe(grid);
        window.addEventListener('resize', updateLayout);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateLayout);
        };
    }, [compactMobile]);

    const isLoading = externalLoading ?? false;

    // Calculate if there are more pages to load
    const hasMore = pagination ? pagination.page < pagination.pages : false;
    // A replacement query may return the same IDs; array identity distinguishes
    // that result from a failed page that made no progress.
    const scrollProgress = useMemo(() => ({ images: filteredImages, page: pagination?.page }), [filteredImages, pagination?.page]);

    // Infinite scroll hook
    const { loadMoreRef, isLoadingMore } = useInfiniteScroll({
        hasMore: hasMore && !!onLoadMore,
        isLoading: isLoading,
        progressKey: scrollProgress,
        onLoadMore: onLoadMore || (async () => {}),
    });

    // Global spinner handles all loading states - no need for local spinner
    // This prevents duplicate spinners and provides consistent UX

    return (
        <div id={containerId || undefined} className={`no-flash-grid-container ${compactMobile ? 'compact-related-grid' : ''} ${className}`}>
            {/* Global spinner handles all loading states - no local spinner needed */}
            {/* Always render grid (global spinner shows as overlay when loading) */}
            <>
                    <div
                        ref={gridRef}
                        className="no-flash-grid"
                        style={{
                            // PHOTOCLOUD-style: Fixed columns with dynamic row spans
                            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                            gap: `${gap}px`,
                            // Base row height for row span calculations - MUST be a string with units
                            gridAutoRows: `${GRID_CONFIG.baseRowHeight}px`,
                            // Don't use grid-auto-flow: dense - we use explicit row positioning
                        }}
                    >
                        {gridLayout.map((layout, idx) => {
                            const { image, column, rowSpan, rowStart, exactHeight } = layout;
                            // Priority loading for first 12 images (above the fold)
                            const isPriority = idx < 12;

                            return (
                                <div
                                    key={image._id || idx}
                                    className="grid-item-wrapper"
                                    data-pinned={image.isPinned ? 'true' : 'false'}
                                    data-image-id={image._id}
                                    style={{
                                        gridColumn: column,
                                        gridRowStart: rowStart,
                                        gridRowEnd: `span ${rowSpan}`,
                                        height: `${exactHeight}px`,
                                        minHeight: `${exactHeight}px`,
                                        maxHeight: `${exactHeight}px`,
                                    }}
                                >
                                    <div
                                        onMouseEnter={() => {
                                            // Preload on hover for instant click (like PHOTOCLOUD)
                                            if (onImageHover) {
                                                onImageHover(image);
                                            }
                                        }}
                                    >
                                        <BlurUpImage
                                            image={image}
                                            images={filteredImages}
                                            currentIndex={idx}
                                            onClick={isMobile && onImageClick
                                                ? () => {
                                                    // Mobile: immediate navigation, preload in background
                                                    onImageClick(image, idx);
                                                    const full = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                                    if (full) {
                                                        preloadImage(full, false).catch(() => {});
                                                    }
                                                }
                                                : () => {
                                                    if (!onImageClick) return;
                                                    
                                                    const full = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                                    onImageClick(image, idx);
                                                    if (full) void preloadImage(full, false).catch(() => {});
                                                }}
                                            priority={isPriority}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Infinite scroll trigger - hidden element at bottom */}
                    {hasMore && onLoadMore && (
                        <div ref={loadMoreRef} style={{ height: '1px', marginTop: '20px' }} />
                    )}
                    {/* Loading indicator for infinite scroll */}
                    {isLoadingMore && (
                        <div className="loading-more-state" style={{ textAlign: 'center', padding: '20px', color: 'hsl(var(--muted-foreground))' }}>
                            Loading more...
                        </div>
                    )}
                </>
        </div>
    );
}
