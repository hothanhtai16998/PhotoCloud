import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Image } from '@/types/image';
import './NoFlashGrid.css';

// Import extracted modules
import { GRID_CONFIG } from './constants/gridConfig';
import { preloadImage, preloadImages, loadedImages } from './utils/imagePreloader';
import { loadImageDimensions } from './utils/imageDimensions';
import { calculateImageLayout, getColumnCount } from './utils/gridLayout';
import { BlurUpImage } from './components/BlurUpImage';
import { ImageModal } from './components/ImageModal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { getBestImageUrl } from '@/utils/avifSupport';

// Simple blur-up image with persistent back layer
type ExtendedImage = Image & { categoryName?: string; category?: string };

export interface NoFlashGridProps {
    images: ExtendedImage[];
    loading?: boolean;
    onLoadData?: () => Promise<void>;
    className?: string;
    onImageClick?: (image: ExtendedImage, index: number) => void; // Optional: if provided, use this instead of modal
    // Infinite scroll props
    hasMore?: boolean; // Whether there are more images to load
    onLoadMore?: () => void | Promise<void>; // Callback to load more images
    isLoadingMore?: boolean; // Whether more images are currently loading
}

export function NoFlashGrid({ 
    images, 
    loading: externalLoading, 
    onLoadData, 
    className = '', 
    onImageClick,
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
}: NoFlashGridProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const isMobile = useIsMobile();
    const [columnCount, setColumnCount] = useState(() => {
        if (typeof window === 'undefined') return GRID_CONFIG.columns.desktop;
        return getColumnCount(window.innerWidth);
    });
    const [containerWidth, setContainerWidth] = useState(1400); // Default, will be updated

    // Store image dimensions as they load
    const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
    const loadingDimensionsRef = useRef<Set<string>>(new Set()); // Track which images we're currently loading

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
    // Note: We use WebP thumbnails here (not AVIF) since they're small and load fast
    useEffect(() => {
        if (images.length === 0) return;
        const thumbnails = images.slice(0, 20)
            .map(img => img.thumbnailUrl || img.smallUrl)
            .filter((src): src is string => Boolean(src));
        preloadImages(thumbnails, true);
    }, [images]);

    // Load dimensions for images that don't have them
    useEffect(() => {
        const loadDimensions = async () => {
            if (filteredImages.length === 0) return;

            const dimensionsMap = new Map<string, { width: number; height: number }>();
            const imagesToLoad: Array<{ image: ExtendedImage; url: string }> = [];

            // First pass: collect images that need dimensions loaded
            filteredImages.forEach((image) => {
                // Skip if already has dimensions in state
                if (imageDimensions.has(image._id)) {
                    dimensionsMap.set(image._id, imageDimensions.get(image._id)!);
                    return;
                }

                // Skip if already has dimensions in image object
                if (image.width && image.height) {
                    dimensionsMap.set(image._id, { width: image.width, height: image.height });
                    return;
                }

                // Skip if already loading
                if (loadingDimensionsRef.current.has(image._id)) {
                    return;
                }

                // Try to load dimensions from image URL
                // Use regularUrl or imageUrl for accurate dimensions (aspect ratio is what matters)
                const imageUrl = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                if (imageUrl) {
                    imagesToLoad.push({ image, url: imageUrl });
                    loadingDimensionsRef.current.add(image._id);
                }
            });

            // If we have dimensions from state/image, update immediately
            if (dimensionsMap.size > 0) {
                setImageDimensions(prev => {
                    const merged = new Map(prev);
                    dimensionsMap.forEach((value, key) => {
                        merged.set(key, value);
                    });
                    return merged;
                });
            }

            // Load dimensions for images that need it (prioritize first 20 for faster initial render)
            if (imagesToLoad.length > 0) {
                // Split into priority (first 20) and non-priority
                const priority = imagesToLoad.slice(0, 20);
                const rest = imagesToLoad.slice(20);

                const loadBatch = async (batch: typeof imagesToLoad) => {
                    const promises = batch.map(async ({ image, url }) => {
                        try {
                            const dims = await loadImageDimensions(url);
                            if (dims) {
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

                    if (validResults.length > 0) {
                        setImageDimensions(prev => {
                            const merged = new Map(prev);
                            validResults.forEach(result => {
                                merged.set(result.id, result.dims);
                            });
                            return merged;
                        });
                    }
                };

                // Load priority batch first
                await loadBatch(priority);

                // Load rest with slight delay to not block
                if (rest.length > 0) {
                    setTimeout(() => {
                        loadBatch(rest);
                    }, 100);
                }
            }
        };

        loadDimensions();
    }, [filteredImages]); // Only depend on filteredImages, not imageDimensions

    // Calculate grid layout for each image (row spans and columns)
    const gridLayout = useMemo(() => {
        if (filteredImages.length === 0 || containerWidth === 0) return [];

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
            // Get dimensions (from state or image properties)
            const dimensions = imageDimensions.get(image._id) || null;

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

            // Convert pixel position to grid row using full row unit (height + gap)
            const rowStart = Math.max(1, Math.floor(shortestHeight / rowUnit) + 1);
            // Use rowStart only, let grid-row-end: span X handle the rest
            // This ensures CSS Grid handles gaps correctly

            // Update the column's height for the next item
            // Move by an exact number of full row units to the next top line
            columnHeights[shortestColumnIndex] =
                shortestHeight + finalRowSpan * rowUnit;

            return {
                image,
                column,
                rowSpan: finalRowSpan,
                rowStart,
                columnWidth,
            };
        });
    }, [filteredImages, columnCount, containerWidth, imageDimensions]);

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

    // Preload images near the selected index when modal opens
    useEffect(() => {
        if (selectedIndex === null) return;

        const nearbyIndices = [
            (selectedIndex + 1) % filteredImages.length,
            (selectedIndex - 1 + filteredImages.length) % filteredImages.length,
            (selectedIndex + 2) % filteredImages.length,
            (selectedIndex - 2 + filteredImages.length) % filteredImages.length,
        ];

        const sources: string[] = [];
        nearbyIndices.forEach((i) => {
            const img = filteredImages[i];
            if (!img) return;
            const src = img.regularUrl || img.imageUrl || img.smallUrl || img.thumbnailUrl;
            if (src && !loadedImages.has(src)) {
                sources.push(src);
            }
        });

        if (sources.length > 0) {
            preloadImages(sources, true);
        }
    }, [selectedIndex, filteredImages]);

    const isLoading = externalLoading ?? false;

    // Infinite scroll: detect when user scrolls near bottom
    const { loadMoreRef } = useInfiniteScroll({
        hasMore: hasMore && !isLoading,
        isLoading: isLoading || isLoadingMore,
        onLoadMore: onLoadMore || (async () => {}),
        rootMargin: '600px', // Start loading 600px before reaching bottom
        threshold: 0.1,
    });

    return (
        <div id="image-grid-container" className={`no-flash-grid-container ${className}`}>
            {/* Only show loading state if we have no images - keep grid visible during category change */}
            {/* Use skeleton grid instead of text to avoid duplicate loading states */}
            {isLoading && filteredImages.length === 0 ? (
                <div 
                    className="skeleton-grid" 
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                        gap: `${GRID_CONFIG.gap}px`,
                        gridAutoRows: `${GRID_CONFIG.baseRowHeight}px`,
                    }}
                >
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                            key={i} 
                            className="skeleton-image-card" 
                            style={{
                                aspectRatio: '3/4',
                                borderRadius: '8px',
                            }} 
                        />
                    ))}
                </div>
            ) : (
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
                        const { image, column, rowSpan, rowStart } = layout;
                        // Priority loading for first 12 images (above the fold)
                        const isPriority = idx < 12;

                        return (
                            <div
                                key={`${image._id || idx}-${column}-${rowStart}`}
                                className="grid-item-wrapper"
                                data-pinned={(image as any).isPinned ? 'true' : 'false'}
                                style={{
                                    // Explicit column and row start, use span for row end
                                    // This lets CSS Grid handle gaps automatically
                                    gridColumn: column,
                                    gridRowStart: rowStart,
                                    gridRowEnd: `span ${rowSpan}`,
                                    // Let the grid area determine height (includes internal row gaps)
                                    // to avoid mismatch and sticking
                                    height: 'auto',
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
                                            // Preload AVIF if supported to match modal behavior
                                            (async () => {
                                                const bestRegular = await getBestImageUrl(image, 'regular');
                                                const bestOriginal = await getBestImageUrl(image, 'original');
                                                const full = bestRegular || bestOriginal || image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                                if (full) {
                                                    preloadImage(full, false).catch(() => {});
                                                }
                                            })();
                                        }
                                        : async () => {
                                            // DESKTOP: Use async with preload
                                            // If onImageClick is provided, use it (for navigation)
                                            if (onImageClick) {
                                                // DESKTOP: Preload before navigation for smoother experience
                                                // Use AVIF if supported to match modal behavior
                                                const bestRegular = await getBestImageUrl(image, 'regular');
                                                const bestOriginal = await getBestImageUrl(image, 'original');
                                                const full = bestRegular || bestOriginal || image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                                if (full) {
                                                    try {
                                                        // Preload image before navigation
                                                        await preloadImage(full, false);
                                                    } catch {
                                                        // Continue even if preload fails
                                                    }
                                                }
                                                onImageClick(image, idx);
                                                return;
                                            }

                                            // Otherwise, use modal (default behavior)
                                            // Unsplash technique: Preload image COMPLETELY before opening modal
                                            // Use AVIF if supported to prevent format mismatch flash
                                            const bestRegular = await getBestImageUrl(image, 'regular');
                                            const bestOriginal = await getBestImageUrl(image, 'original');
                                            const full = bestRegular || bestOriginal || image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                            if (full) {
                                                try {
                                                    // Wait for image to be fully loaded and decoded before opening modal
                                                    // Keep decode to ensure smooth modal opening
                                                    await preloadImage(full, false);
                                                    // Image is ready - open modal smoothly
                                                    setSelectedIndex(idx);
                                                } catch {
                                                    // On error, still open modal (will show placeholder)
                                                    setSelectedIndex(idx);
                                                }
                                            } else {
                                                setSelectedIndex(idx);
                                            }
                                        }}
                                    priority={isPriority}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Infinite scroll sentinel - triggers loadMore when scrolled into view */}
            {hasMore && onLoadMore && (
                <div 
                    ref={loadMoreRef}
                    style={{
                        gridColumn: `1 / -1`, // Span all columns
                        height: '1px',
                        marginTop: '40px',
                    }}
                    aria-hidden="true"
                />
            )}

            {/* Loading more indicator */}
            {isLoadingMore && (
                <div 
                    style={{
                        gridColumn: `1 / -1`, // Span all columns
                        padding: '40px',
                        textAlign: 'center',
                        color: '#666',
                    }}
                >
                    Loading more images...
                </div>
            )}

            {/* Only render ImageModal if onImageClick is NOT provided (use internal modal) */}
            {!onImageClick && selectedIndex !== null && filteredImages[selectedIndex] && (
                <ImageModal
                    key={filteredImages[selectedIndex]._id || selectedIndex}
                    images={filteredImages}
                    index={selectedIndex}
                    onClose={() => setSelectedIndex(null)}
                    onNavigate={(next) => setSelectedIndex(next)}
                    onSelectIndex={(idx) => setSelectedIndex(idx)}
                />
            )}
        </div>
    );
}

