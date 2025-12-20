import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import type { Image } from '@/types/image';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useGlobalLoadingStore } from '@/stores/useGlobalLoadingStore';
import { t } from '@/i18n';
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
type ExtendedImage = Image & { categoryName?: string; category?: string };

export interface NoFlashGridProps {
    images: ExtendedImage[];
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

export function NoFlashGrid({ images, loading: externalLoading, onLoadData, className = '', onImageClick, onImageHover, pagination, onLoadMore }: NoFlashGridProps) {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const isMobile = useIsMobile();
    const [columnCount, setColumnCount] = useState(() => {
        if (typeof window === 'undefined') return GRID_CONFIG.columns.desktop;
        return getColumnCount(window.innerWidth);
    });
    const [containerWidth, setContainerWidth] = useState(0); // Start at 0, will be updated after mount to prevent initial render with wrong dimensions

    // Store image dimensions as they load
    const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
    const loadingDimensionsRef = useRef<Set<string>>(new Set()); // Track which images we're currently loading
    const stableDimensionsRef = useRef<Map<string, { width: number; height: number }>>(new Map()); // Stable ref for dimensions to prevent unnecessary recalculations

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

    // Check cached images synchronously before render to prevent layout shift
    useLayoutEffect(() => {
        if (filteredImages.length === 0) return;

        const cachedDimensionsMap = new Map<string, { width: number; height: number }>();
        
        for (const image of filteredImages.slice(0, 50)) {
            if (imageDimensions.has(image._id) || (image.width && image.height)) continue;

            const imageUrl = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
            if (imageUrl) {
                const cachedDims = getCachedImageDimensions(imageUrl);
                if (cachedDims) {
                    cachedDimensionsMap.set(image._id, cachedDims);
                }
            }
        }

        if (cachedDimensionsMap.size > 0) {
            cachedDimensionsMap.forEach((value, key) => {
                stableDimensionsRef.current.set(key, value);
            });
            
            setImageDimensions(prev => {
                const merged = new Map(prev);
                cachedDimensionsMap.forEach((value, key) => {
                    merged.set(key, value);
                });
                return merged;
            });
        }
    }, [filteredImages, imageDimensions]);

    // Load dimensions asynchronously for non-cached images
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        let isMounted = true;

        const loadDimensions = async () => {
            if (!isMounted || filteredImages.length === 0) return;

            const dimensionsMap = new Map<string, { width: number; height: number }>();
            const imagesToLoad: Array<{ image: ExtendedImage; url: string }> = [];

            const imagesToProcess = filteredImages.slice(0, 50);
            
            for (const image of imagesToProcess) {
                if (imageDimensions.has(image._id)) {
                    const existingDims = imageDimensions.get(image._id)!;
                    if (existingDims.width > 0 && existingDims.height > 0) {
                        dimensionsMap.set(image._id, existingDims);
                        stableDimensionsRef.current.set(image._id, existingDims);
                    }
                    continue;
                }

                if (image.width && image.height && image.width > 0 && image.height > 0) {
                    const imgDims = { width: image.width, height: image.height };
                    dimensionsMap.set(image._id, imgDims);
                    stableDimensionsRef.current.set(image._id, imgDims);
                    continue;
                }

                if (loadingDimensionsRef.current.has(image._id)) continue;

                const imageUrl = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                if (imageUrl) {
                    const cachedDims = getCachedImageDimensions(imageUrl);
                    if (cachedDims && cachedDims.width > 0 && cachedDims.height > 0) {
                        dimensionsMap.set(image._id, cachedDims);
                        stableDimensionsRef.current.set(image._id, cachedDims);
                        continue;
                    }
                    
                    imagesToLoad.push({ image, url: imageUrl });
                    loadingDimensionsRef.current.add(image._id);
                }
            }

            if (dimensionsMap.size > 0) {
                dimensionsMap.forEach((value, key) => {
                    stableDimensionsRef.current.set(key, value);
                });
                
                setImageDimensions(prev => {
                    const merged = new Map(prev);
                    dimensionsMap.forEach((value, key) => {
                        merged.set(key, value);
                    });
                    return merged;
                });
            }

            if (imagesToLoad.length > 0 && isMounted) {
                const priority = imagesToLoad.slice(0, 15);
                const rest = imagesToLoad.slice(15);

                const loadBatch = async (batch: typeof imagesToLoad) => {
                    if (!isMounted) return;
                    
                    const batchSize = 5;
                    for (let i = 0; i < batch.length; i += batchSize) {
                        if (!isMounted) break;
                        
                        const chunk = batch.slice(i, i + batchSize);
                        const promises = chunk.map(async ({ image, url }) => {
                            try {
                                const dims = await loadImageDimensions(url);
                                if (dims && isMounted) {
                                    return { id: image._id, dims };
                                }
                            } catch (_error) {
                                // Silently fail - will use fallback
                            } finally {
                                loadingDimensionsRef.current.delete(image._id);
                            }
                            return null;
                        });

                        const results = await Promise.all(promises);
                        const validResults = results.filter((r): r is { id: string; dims: { width: number; height: number } } => r !== null);

                        if (validResults.length > 0 && isMounted) {
                            validResults.forEach(result => {
                                stableDimensionsRef.current.set(result.id, result.dims);
                            });
                            
                            setImageDimensions(prev => {
                                const merged = new Map(prev);
                                validResults.forEach(result => {
                                    merged.set(result.id, result.dims);
                                });
                                return merged;
                            });
                        }
                        
                        if (i + batchSize < batch.length) {
                            await new Promise(resolve => setTimeout(resolve, 50));
                        }
                    }
                };

                loadBatch(priority).catch(() => {});

                if (rest.length > 0) {
                    setTimeout(() => {
                        if (isMounted) {
                            loadBatch(rest).catch(() => {});
                        }
                    }, 200);
                }
            }
        };

        timeoutId = setTimeout(() => {
            loadDimensions();
        }, 100);

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [filteredImages]);

    // Pre-calculate dimensions synchronously during render to prevent layout shift
    // Uses stable ref to persist dimensions across renders without triggering grid recalculation
    const precalculatedDimensionsMap = useMemo(() => {
        const dims = new Map<string, { width: number; height: number }>();
        
        stableDimensionsRef.current.forEach((value, key) => {
            dims.set(key, value);
        });
        
        for (const image of filteredImages.slice(0, 50)) {
            if (dims.has(image._id)) continue;
            
            if (image.width && image.height && image.width > 0 && image.height > 0) {
                const imgDims = { width: image.width, height: image.height };
                dims.set(image._id, imgDims);
                stableDimensionsRef.current.set(image._id, imgDims);
                continue;
            }
            
            const imageUrl = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
            if (imageUrl) {
                const cachedDims = getCachedImageDimensions(imageUrl);
                if (cachedDims && cachedDims.width > 0 && cachedDims.height > 0) {
                    dims.set(image._id, cachedDims);
                    stableDimensionsRef.current.set(image._id, cachedDims);
                }
            }
        }
        
        return dims;
    }, [filteredImages]);

    // Calculate grid layout for each image (row spans and columns)
    const gridLayout = useMemo(() => {
        if (filteredImages.length === 0) return [];
        if (containerWidth === 0 || !isFinite(containerWidth) || containerWidth < 300) return [];
        if (columnCount < 1 || !isFinite(columnCount)) return [];

        // Check if we're on mobile (1 column)
        const isMobileLayout = columnCount === 1;
        // Mobile UI bars take up space:
        // - Author bar: 12px top + 42px avatar + 12px bottom + text line-height = ~66px
        // - Actions bar: 12px top + 40px buttons + 12px bottom = ~64px
        // Total: ~130px
        // Convert to row units to add to rowSpan
        const mobileUIBarsHeight = 130; // Total height of mobile author + actions bars
        const rowUnit = GRID_CONFIG.baseRowHeight + GRID_CONFIG.gap;
        const mobileUIBarsRowSpan = Math.ceil(mobileUIBarsHeight / rowUnit);

        // Calculate column width
        const gapTotal = GRID_CONFIG.gap * (columnCount - 1);
        const columnWidth = (containerWidth - gapTotal) / columnCount;

        // Track pixel heights in each column for shortest-column algorithm
        // This is more accurate than row-based tracking
        const columnHeights = new Array(columnCount).fill(0); // Start at 0px for each column

        return filteredImages.map((image) => {
            let dimensions = precalculatedDimensionsMap.get(image._id) || null;
            
            if (!dimensions && image.width && image.height && image.width > 0 && image.height > 0) {
                dimensions = { width: image.width, height: image.height };
                stableDimensionsRef.current.set(image._id, dimensions);
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
            const finalRowSpan = isMobileLayout
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
            const exactHeight = finalRowSpan * GRID_CONFIG.baseRowHeight + (finalRowSpan - 1) * GRID_CONFIG.gap;

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
    }, [filteredImages, columnCount, containerWidth, precalculatedDimensionsMap]);

    // Update column count and container width on resize
    useEffect(() => {
        const updateLayout = () => {
            if (!gridRef.current) return;
            // Get actual container width (accounting for padding)
            const container = gridRef.current.parentElement;
            if (container) {
                const width = container.offsetWidth - 32; // Subtract padding (16px * 2)
                setContainerWidth(Math.max(300, width)); // Minimum 300px
            }
            const viewportWidth = window.innerWidth;
            setColumnCount(getColumnCount(viewportWidth));
        };

        // Initial calculation
        updateLayout();

        // Update on resize with debounce
        let timeoutId: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateLayout, 150);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);


    const isLoading = externalLoading ?? false;

    // Calculate if there are more pages to load
    const hasMore = pagination ? pagination.page < pagination.pages : false;

    // Infinite scroll hook
    const { loadMoreRef, isLoadingMore } = useInfiniteScroll({
        hasMore: hasMore && !!onLoadMore,
        isLoading: isLoading,
        onLoadMore: onLoadMore || (async () => {}),
    });

    // Global spinner handles all loading states - no need for local spinner
    // This prevents duplicate spinners and provides consistent UX

    return (
        <div id="image-grid-container" className={`no-flash-grid-container ${className}`}>
            {/* Global spinner handles all loading states - no local spinner needed */}
            {/* Always render grid (global spinner shows as overlay when loading) */}
            <>
                    <div
                        ref={gridRef}
                        className="no-flash-grid"
                        style={{
                            // Unsplash-style: Fixed columns with dynamic row spans
                            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                            gap: `${GRID_CONFIG.gap}px`,
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
                                    key={`${image._id || idx}-${column}-${rowStart}`}
                                    className="grid-item-wrapper"
                                    data-pinned={(image as any).isPinned ? 'true' : 'false'}
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
                                            // Preload on hover for instant click (like Unsplash)
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
                                                : async () => {
                                                    // DESKTOP: Preload before navigation for smoother experience
                                                    if (!onImageClick) return;
                                                    
                                                    const full = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                                    if (full) {
                                                        try {
                                                            // Preload image before navigation
                                                            await preloadImage(full, false);
                                                        } catch {
                                                            // Continue even if preload fails
                                                        }
                                                    }
                                                    onImageClick(image, idx);
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

