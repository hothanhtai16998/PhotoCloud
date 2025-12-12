import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import type { Image } from '@/types/image';
import { Heart, Share2, ChevronDown, MapPin, ExternalLink, Tag } from 'lucide-react';
import { favoriteService } from '@/services/favoriteService';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import type { DownloadSize } from '@/components/image/DownloadSizeSelector';
import { shareService } from '@/utils/shareService';
import { generateImageSlug } from '@/lib/utils';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/useUserStore';
import { imageFetchService } from '@/services/imageFetchService';
import { imageStatsService } from '@/services/imageStatsService';
import { useNavigate } from 'react-router-dom';
import { t, getLocale } from '@/i18n';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import leftArrowIcon from '@/assets/left-arrow.svg';
import rightArrowIcon from '@/assets/right-arrow.svg';
import closeIcon from '@/assets/close.svg';
import cameraIcon from '@/assets/camera.svg';
import dateIcon from '@/assets/date.svg';
import { preloadImage, loadedImages, preloadImageWithProgress, cancelImageLoad } from '../utils/imagePreloader';
import { ImageProgressBar } from './ImageProgressBar';
import { ImageModalInfo } from '@/components/image/ImageModalInfo';
import { BlurUpImage } from './BlurUpImage';
import { GRID_CONFIG } from '../constants/gridConfig';
import { calculateImageLayout, getColumnCount } from '../utils/gridLayout';
import { loadImageDimensions } from '../utils/imageDimensions';
import '@/components/image/modal-info.css';
import '@/components/image/modal-footer.css';
import './ImageModal.css';

// Module-level cache to persist API stats across component unmounts
// This ensures stats persist when modal closes and reopens
const apiStatsCache = new Map<string, { views?: number; downloads?: number }>();

type ExtendedImage = Image & { categoryName?: string; category?: string };

interface ImageModalProps {
    images: ExtendedImage[];
    index: number;
    onClose: () => void;
    onNavigate: (next: number) => void;
    onSelectIndex?: (idx: number) => void;
}

// Modal with double-buffer, no opacity drops
export function ImageModal({
    images,
    index,
    onClose,
    onNavigate,
    onSelectIndex,
}: ImageModalProps) {
    // Create a state for the current image so we can update it when stats change
    const initialImage = images[index] || images[0];
    if (!initialImage) {
        throw new Error('ImageModal: No images provided');
    }
    const [currentImage, setCurrentImage] = useState<ExtendedImage>(initialImage);

    // Fetch full image details when modal opens or image changes (to get dailyViews/dailyDownloads)
    useEffect(() => {
        const imageId = images[index]?._id;
        if (!imageId) return;

        // Fetch full image details to get dailyViews and dailyDownloads
        api.get(`/images/${imageId}`)
            .then((response) => {
                // Backend returns { image: {...} }
                const fullImageData = response.data?.image || response.data;
                if (fullImageData) {
                    setCurrentImage(prev => ({
                        ...prev,
                        ...fullImageData,
                        // Preserve any stats we've already updated (prefer updated values)
                        views: prev.views ?? fullImageData.views,
                        downloads: prev.downloads ?? fullImageData.downloads,
                        // Merge dailyViews and dailyDownloads (prefer updated values)
                        dailyViews: {
                            ...(fullImageData.dailyViews || {}),
                            ...(prev.dailyViews || {})
                        },
                        dailyDownloads: {
                            ...(fullImageData.dailyDownloads || {}),
                            ...(prev.dailyDownloads || {})
                        }
                    }));
                }
            })
            .catch((error) => {
                console.error('Failed to fetch image details:', error);
                // Fallback to using the image from the array
                const newImage = images[index];
                if (newImage) {
                    setCurrentImage(newImage);
                }
            });
    }, [index, images]);

    // Update currentImage when index changes, but preserve stats if we have cached data
    useEffect(() => {
        const newImage = images[index];
        if (!newImage) return;

        // Check if we have cached stats for this image
        const apiStats = apiStatsCache.get(newImage._id);
        if (apiStats) {
            // Merge cached stats with the new image
            setCurrentImage(prev => ({
                ...prev,
                ...newImage,
                views: apiStats.views ?? newImage.views,
                downloads: apiStats.downloads ?? newImage.downloads,
            }));
        }
    }, [index, images]);

    const img = currentImage;

    // Calculate initial state based on current image
    const calculateInitialState = () => {
        if (!img) return { src: null, isFullQuality: false };
        // Use base64 thumbnail for instant display (no network delay)
        // Then immediately load network thumbnail (larger, better quality)
        const base64Placeholder = img.base64Thumbnail || null;
        const networkThumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || '';

        // Start with base64 for instant display (prevents blank space)
        // Network thumbnail will load immediately after (fast, small file)
        return {
            src: base64Placeholder || networkThumbnail || full,
            isFullQuality: false,
            isBase64: !!base64Placeholder
        };
    };

    const [imageState, setImageState] = useState(calculateInitialState);
    const [frontSrc, setFrontSrc] = useState<string | null>(null); // Full-quality image (front layer)
    const [frontLoaded, setFrontLoaded] = useState(false); // Track if front image is actually loaded and ready
    const [backSrc, setBackSrc] = useState<string | null>(imageState.src); // Low-quality placeholder (back layer)
    const backSrcRef = useRef<string | null>(imageState.src); // Track current backSrc to prevent unnecessary updates
    // const isFullQuality = imageState.isFullQuality || frontSrc !== null; // True if front layer is ready

    // Initialize refs (simplified - no aspect ratio calculations needed)
    const imgElementRef = useRef<HTMLImageElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const scrollPosRef = useRef(0);
    const previousImgRef = useRef<ExtendedImage | null>(img);
    const frontImageLoadedRef = useRef<boolean>(false); // Track if front image is loaded for current image
    const currentLoadingUrlRef = useRef<string | null>(null); // Track current image URL being loaded for progress
    const [isScrolled, setIsScrolled] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [showProgressBar, setShowProgressBar] = useState(false);
    const [imageProgress, setImageProgress] = useState(0);
    const { user } = useUserStore();
    const isFavorited = useBatchedFavoriteCheck(img?._id);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

    // Related images grid layout state
    const relatedImages = useMemo(() => {
        return images.filter((_, i) => i !== index).slice(0, 8);
    }, [images, index]);
    const relatedGridRef = useRef<HTMLDivElement | null>(null);
    const relatedSectionRef = useRef<HTMLDivElement | null>(null);
    const [relatedColumnCount, setRelatedColumnCount] = useState(() => {
        if (typeof window === 'undefined') return GRID_CONFIG.columns.desktop;
        return getColumnCount(window.innerWidth);
    });
    const [relatedContainerWidth, setRelatedContainerWidth] = useState(1400);
    const [relatedImageDimensions, setRelatedImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
    const [isAtRelatedSection, setIsAtRelatedSection] = useState(false);

    // Load dimensions for related images
    useEffect(() => {
        const loadDimensions = async () => {
            if (relatedImages.length === 0) return;

            const dimensionsMap = new Map<string, { width: number; height: number }>();
            const imagesToLoad: Array<{ image: ExtendedImage; url: string }> = [];

            relatedImages.forEach((image) => {
                if (relatedImageDimensions.has(image._id)) {
                    dimensionsMap.set(image._id, relatedImageDimensions.get(image._id)!);
                    return;
                }

                if (image.width && image.height) {
                    dimensionsMap.set(image._id, { width: image.width, height: image.height });
                    return;
                }

                const imageUrl = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                if (imageUrl) {
                    imagesToLoad.push({ image, url: imageUrl });
                }
            });

            if (dimensionsMap.size > 0) {
                setRelatedImageDimensions(prev => {
                    const merged = new Map(prev);
                    dimensionsMap.forEach((value, key) => {
                        merged.set(key, value);
                    });
                    return merged;
                });
            }

            if (imagesToLoad.length > 0) {
                const promises = imagesToLoad.map(async ({ image, url }) => {
                    try {
                        const dims = await loadImageDimensions(url);
                        if (dims) {
                            return { id: image._id, dims };
                        }
                    } catch {
                        // Silently fail
                    }
                    return null;
                });

                const results = await Promise.all(promises);
                const validResults = results.filter((r): r is { id: string; dims: { width: number; height: number } } => r !== null);

                if (validResults.length > 0) {
                    setRelatedImageDimensions(prev => {
                        const merged = new Map(prev);
                        validResults.forEach(result => {
                            merged.set(result.id, result.dims);
                        });
                        return merged;
                    });
                }
            }
        };

        loadDimensions();
    }, [relatedImages]);

    // Calculate grid layout for related images
    const relatedGridLayout = useMemo(() => {
        if (relatedImages.length === 0 || relatedContainerWidth === 0) return [];

        const gapTotal = GRID_CONFIG.gap * (relatedColumnCount - 1);
        const columnWidth = (relatedContainerWidth - gapTotal) / relatedColumnCount;
        const columnHeights = new Array(relatedColumnCount).fill(0);

        return relatedImages.map((image) => {
            const dimensions = relatedImageDimensions.get(image._id) || null;
            const layout = calculateImageLayout(
                image,
                columnWidth,
                GRID_CONFIG.baseRowHeight,
                dimensions
            );

            let shortestColumnIndex = 0;
            let shortestHeight = columnHeights[0];
            for (let i = 1; i < relatedColumnCount; i++) {
                if (columnHeights[i] < shortestHeight) {
                    shortestHeight = columnHeights[i];
                    shortestColumnIndex = i;
                }
            }

            const column = shortestColumnIndex + 1;
            const rowUnit = GRID_CONFIG.baseRowHeight + GRID_CONFIG.gap;
            const rowStart = Math.max(1, Math.floor(shortestHeight / rowUnit) + 1);

            columnHeights[shortestColumnIndex] = shortestHeight + layout.rowSpan * rowUnit;

            return {
                image,
                column,
                rowSpan: layout.rowSpan,
                rowStart,
                columnWidth,
            };
        });
    }, [relatedImages, relatedColumnCount, relatedContainerWidth, relatedImageDimensions]);

    // Update related grid column count and container width on resize
    useEffect(() => {
        const updateLayout = () => {
            if (!relatedGridRef.current) return;
            const container = relatedGridRef.current.parentElement;
            if (container) {
                const width = container.offsetWidth - 32;
                setRelatedContainerWidth(Math.max(300, width));
            }
            const viewportWidth = window.innerWidth;
            setRelatedColumnCount(getColumnCount(viewportWidth));
        };

        updateLayout();

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
    const locale = getLocale();
    const formattedDate = useFormattedDate(img?.createdAt, {
        locale: locale === 'vi' ? 'vi-VN' : 'en-US',
        format: 'long',
    });
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [, setShowShareMenu] = useState(false);
    const [showAuthorTooltip, setShowAuthorTooltip] = useState(false);
    const [tooltipAnimating, setTooltipAnimating] = useState(false);
    const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const authorAreaRef = useRef<HTMLDivElement | null>(null);
    const topInfoRef = useRef<HTMLDivElement | null>(null);
    const [authorImages, setAuthorImages] = useState<ExtendedImage[]>([]);
    const [loadingAuthorImages, setLoadingAuthorImages] = useState(false);
    const [, setLocaleUpdate] = useState(0);
    const navigate = useNavigate();
    const authorName =
        (img as any)?.uploadedBy?.username ||
        (img as any)?.author ||
        (img as any)?.user ||
        'Author';

    const incrementedViewIds = useRef<Set<string>>(new Set());
    const currentImageIdRef = useRef<string | null>(img?._id || null);

    // Initialize state - use API stats from cache if available, otherwise use img data as fallback
    // For views: img data might be stale (will be updated by API)
    // For downloads: img data is usually accurate (only updates when user downloads)
    const getInitialStats = () => {
        if (!img?._id) return { views: 0, downloads: 0 };
        const apiStats = apiStatsCache.get(img._id);
        return {
            // Views: prefer API stats from cache, but use img data as initial value (will update when API responds)
            views: apiStats?.views ?? ((img as any)?.views || 0),
            // Downloads: prefer API stats from cache, but use img data as initial value (usually accurate)
            downloads: apiStats?.downloads ?? ((img as any)?.downloads || 0),
        };
    };

    // Track view and download stats
    const [views, setViews] = useState<number>(getInitialStats().views);
    const [downloads, setDownloads] = useState<number>(getInitialStats().downloads);

    // No aspect ratio calculations needed - browser handles it with object-fit: contain

    // Update stats when image changes - prioritize API stats, fallback to img data
    // Use useLayoutEffect to update synchronously before browser paint to prevent flash
    useLayoutEffect(() => {
        if (!img?._id) return;

        const imageId = img._id;
        const isNewImage = currentImageIdRef.current !== imageId;

        if (isNewImage) {
            currentImageIdRef.current = imageId;
            // Reset the incremented set for the new image
            incrementedViewIds.current.delete(imageId);
        }

        // Check if we have API-updated stats for this image from cache (highest priority)
        const apiStats = apiStatsCache.get(imageId);

        // Always update to the correct value immediately (before paint)
        if (apiStats) {
            // Use API-updated values if available (they're the most accurate)
            if (apiStats.views !== undefined) {
                setViews(apiStats.views);
            } else if (isNewImage) {
                // New image, no API views yet - use img data as initial value
                setViews((img as any)?.views || 0);
            }

            if (apiStats.downloads !== undefined) {
                setDownloads(apiStats.downloads);
            } else if (isNewImage) {
                // New image, no API downloads yet - use img data as initial value
                setDownloads((img as any)?.downloads || 0);
            }
        } else if (isNewImage) {
            // New image, no API stats - use img data as initial value
            // Views will update when API responds, downloads usually stay the same
            setViews((img as any)?.views || 0);
            setDownloads((img as any)?.downloads || 0);
        }
        // If same image and no API stats, keep current state (don't reset from stale img)
    }, [img?._id]);

    // Increment view count when image is viewed (only once per image)
    // This also fetches the current stats, so we use the response to update our state
    useEffect(() => {
        if (!img?._id) return;

        const imageId = img._id;
        // Only increment if we haven't incremented for this image ID before
        if (!incrementedViewIds.current.has(imageId)) {
            incrementedViewIds.current.add(imageId);

            // Call API to increment and get updated stats
            imageStatsService.incrementView(imageId)
                .then((response) => {
                    // Update state with API response (this is the correct value)
                    setViews(response.views);
                    // Track that this stat was updated via API in module-level cache
                    const stats = apiStatsCache.get(imageId) || {};
                    stats.views = response.views;
                    apiStatsCache.set(imageId, stats);

                    // Update the current image with new views and dailyViews
                    setCurrentImage(prev => ({
                        ...prev,
                        views: response.views,
                        dailyViews: {
                            ...(prev.dailyViews || {}),
                            ...(response.dailyViews || {})
                        }
                    }));
                })
                .catch((error: any) => {
                    // Handle rate limiting gracefully
                    if (error.response?.status === 429) {
                        const rateLimitData = error.response.data;
                        if (rateLimitData.views !== undefined) {
                            // Even if rate limited, we got the current view count
                            setViews(rateLimitData.views);
                            // Track that this stat was updated via API in module-level cache (even if rate limited)
                            const stats = apiStatsCache.get(imageId) || {};
                            stats.views = rateLimitData.views;
                            apiStatsCache.set(imageId, stats);

                            // Update the current image with new views if dailyViews provided
                            if (rateLimitData.dailyViews) {
                                setCurrentImage(prev => ({
                                    ...prev,
                                    views: rateLimitData.views,
                                    dailyViews: {
                                        ...(prev.dailyViews || {}),
                                        ...(rateLimitData.dailyViews || {})
                                    }
                                }));
                            } else {
                                setCurrentImage(prev => ({
                                    ...prev,
                                    views: rateLimitData.views
                                }));
                            }
                        }
                        // Show user-friendly message if available
                        if (rateLimitData.message) {
                            toast.info(rateLimitData.message, {
                                duration: 3000,
                            });
                        }
                        // Don't remove from set on rate limit - we don't want to retry immediately
                    } else {
                        console.error('Failed to increment view:', error);
                        // Remove from set on other errors so it can be retried
                        incrementedViewIds.current.delete(imageId);
                    }
                });
        }
    }, [img?._id]);

    // lock body scroll
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('image-modal-open');
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove('image-modal-open');
        };
    }, []);

    // Keyboard navigation: Arrow keys to navigate (stop at boundaries), Escape to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (index < images.length - 1) {
                    onNavigate(index + 1);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (index > 0) {
                    onNavigate(index - 1);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [index, images.length, onNavigate, onClose]);

    // Enhanced preloading: next/prev + nearby images
    useEffect(() => {
        const preloadIndices = [
            (index + 1) % images.length,
            (index - 1 + images.length) % images.length,
            (index + 2) % images.length,
            (index - 2 + images.length) % images.length,
        ];

        const fullSources: string[] = [];
        const thumbnailSources: string[] = [];

        preloadIndices.forEach((i) => {
            const target = images[i];
            if (!target) return;

            // Preload full quality image
            const fullSrc = target.regularUrl || target.imageUrl || target.smallUrl || target.thumbnailUrl;
            if (fullSrc && !loadedImages.has(fullSrc)) {
                fullSources.push(fullSrc);
            }

            // Also preload thumbnail for instant display on navigation
            const thumbSrc = target.thumbnailUrl || target.smallUrl;
            if (thumbSrc && thumbSrc !== fullSrc && !loadedImages.has(thumbSrc)) {
                thumbnailSources.push(thumbSrc);
            }
        });

        // Preload thumbnails first (small, fast) - these show immediately on navigation
        thumbnailSources.forEach(src => {
            if (src) preloadImage(src, true).catch(() => { }); // Skip decode for faster loading
        });

        // Preload full quality with priority for next/prev
        if (fullSources.length > 0 && fullSources[0]) {
            preloadImage(fullSources[0], false); // Next image - decode for smooth transition
            if (fullSources.length > 1 && fullSources[1]) {
                preloadImage(fullSources[1], false); // Prev image - decode for smooth transition
            }
            // Preload nearby images with delay
            if (fullSources.length > 2) {
                setTimeout(() => {
                    fullSources.slice(2).forEach(src => {
                        if (src) preloadImage(src, true).catch(() => { });
                    });
                }, 200);
            }
        }
    }, [index, images]);

    useLayoutEffect(() => {
        if (!img) return;

        // Track current image to prevent race conditions
        const currentImageId = img._id;
        previousImgRef.current = img;
        frontImageLoadedRef.current = false; // Reset loaded flag for new image

        // reset scroll to top when image changes so top bar/author stay visible
        scrollPosRef.current = 0;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        // Reset scroll state when image changes (use requestAnimationFrame to avoid cascading renders)
        requestAnimationFrame(() => {
            setIsScrolled(false);
            setShouldAnimate(false);
            setIsAtRelatedSection(false);
        });

        // Close menus when image changes
        setShowDownloadMenu(false);
        setShowShareMenu(false);
        setShowAuthorTooltip(false);
        // Clear author tooltip timeout
        if (authorTooltipTimeoutRef.current) {
            clearTimeout(authorTooltipTimeoutRef.current);
            authorTooltipTimeoutRef.current = null;
        }
        
        // Cancel any ongoing progress tracking and hide progress bar
        if (currentLoadingUrlRef.current) {
            cancelImageLoad(currentLoadingUrlRef.current);
            currentLoadingUrlRef.current = null;
        }
        setShowProgressBar(false);
        setImageProgress(0);

        // Unsplash technique: Use different image sizes
        // Low-res thumbnail = thumbnailUrl or smallUrl (small file, pixelated when enlarged to full size)
        // High-res = regularUrl or imageUrl (full quality, sharp at full size)
        const thumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';

        // Progressive loading: Thumbnail -> Regular -> Original
        const regular = img.regularUrl;
        const original = img.imageUrl;

        // Calculate what the state should be
        const currentState = calculateInitialState();
        const newBackSrc = currentState.src;

        // Update imageState (for tracking, but don't use it directly for backSrc)
        setImageState(currentState);

        // Don't reset frontSrc immediately - keep old image visible until new backSrc is ready
        // This prevents flash when both layers change at once
        // We'll clear it after the new backSrc is set

        // Update backSrc: Use base64 for instant display, then immediately load network thumbnail
        if (newBackSrc && newBackSrc !== backSrcRef.current) {
            const isBase64 = newBackSrc.startsWith('data:');

            if (isBase64) {
                // Base64 thumbnails are instant (embedded in JSON) - update synchronously
                backSrcRef.current = newBackSrc;
                setBackSrc(newBackSrc);

                // Immediately load network thumbnail (larger, better quality) to replace base64
                const networkThumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
                if (networkThumbnail && networkThumbnail !== newBackSrc) {
                    // Preload network thumbnail immediately (small file, loads fast)
                    preloadImage(networkThumbnail, true) // Skip decode for faster loading
                        .then((src) => {
                            // Replace base64 with network thumbnail once loaded
                            if (previousImgRef.current?._id === currentImageId) {
                                backSrcRef.current = src;
                                setBackSrc(src);
                            }
                        })
                        .catch(() => {
                            // Keep base64 if network thumbnail fails
                        });
                }

                // Clear front layer after back layer is updated (prevents flash)
                requestAnimationFrame(() => {
                    if (previousImgRef.current?._id === currentImageId && !frontImageLoadedRef.current) {
                        setFrontSrc(null);
                    }
                });
            } else {
                // For network thumbnails, check cache first
                if (loadedImages.has(newBackSrc)) {
                    // Already cached - update immediately (no flash)
                    backSrcRef.current = newBackSrc;
                    setBackSrc(newBackSrc);
                    // Clear front layer after back layer is updated
                    requestAnimationFrame(() => {
                        if (previousImgRef.current?._id === currentImageId && !frontImageLoadedRef.current) {
                            setFrontSrc(null);
                        }
                    });
                } else {
                    // Not cached - keep old placeholder visible, preload new one
                    // Only update backSrc after new thumbnail is ready to prevent flash
                    // Keep decode for modal images to prevent flashing
                    preloadImage(newBackSrc, false)
                        .then((src) => {
                            // Only update if still showing the same image
                            if (previousImgRef.current?._id === currentImageId) {
                                backSrcRef.current = src;
                                setBackSrc(src);
                                // Clear front layer after back layer is updated
                                requestAnimationFrame(() => {
                                    if (previousImgRef.current?._id === currentImageId && !frontImageLoadedRef.current) {
                                        setFrontSrc(null);
                                    }
                                });
                            }
                        })
                        .catch(() => {
                            // On error, still set it (better than blank)
                            if (previousImgRef.current?._id === currentImageId) {
                                backSrcRef.current = newBackSrc;
                                setBackSrc(newBackSrc);
                                if (!frontImageLoadedRef.current) {
                                    setFrontSrc(null);
                                }
                            }
                        });
                }
            }
        } else if (!newBackSrc) {
            // If no backSrc, clear it
            backSrcRef.current = null;
            setBackSrc(null);
        }

        // Load full image in background (front layer)
        // Progressive loading strategy:
        // 1. Load regularUrl first (faster, good quality)
        // 2. Then upgrade to imageUrl (best quality)
        const loadFrontImage = async () => {
            let loadedAny = false;

            // Cancel any existing progress tracking
            if (currentLoadingUrlRef.current) {
                cancelImageLoad(currentLoadingUrlRef.current);
                currentLoadingUrlRef.current = null;
            }

            // Reset progress
            setImageProgress(0);
            setShowProgressBar(true);

            // Step 1: Load Regular URL (if available and different from thumbnail)
            if (regular && regular !== thumbnail) {
                try {
                    if (loadedImages.has(regular)) {
                        // Already cached - no progress needed
                        setShowProgressBar(false);
                        if (previousImgRef.current?._id === currentImageId) {
                            setFrontSrc(regular);
                            setFrontLoaded(true);
                            frontImageLoadedRef.current = true;
                            loadedAny = true;
                        }
                    } else {
                        // Preload regular with progress tracking
                        currentLoadingUrlRef.current = regular;
                        const src = await preloadImageWithProgress(
                            regular,
                            (progress) => {
                                if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === regular) {
                                    setImageProgress(progress);
                                }
                            },
                            false
                        );
                        if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === regular) {
                            setFrontSrc(src);
                            // If we don't have an original to upgrade to, mark as loaded
                            if (!original || original === regular) {
                                setFrontLoaded(true);
                                setShowProgressBar(false);
                            }
                            frontImageLoadedRef.current = true;
                            loadedAny = true;
                        }
                    }
                } catch (e) {
                    // Ignore error, try original next
                    if (previousImgRef.current?._id === currentImageId) {
                        setShowProgressBar(false);
                    }
                }
            }

            // Step 2: Load Original URL (if available and different from regular)
            if (original && original !== thumbnail && original !== regular) {
                try {
                    // Reset progress for original (starts from 0 or continue from regular)
                    if (!loadedAny) {
                        setImageProgress(0);
                    }
                    
                    // Preload original with progress tracking (this might take longer)
                    currentLoadingUrlRef.current = original;
                    const src = await preloadImageWithProgress(
                        original,
                        (progress) => {
                            if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === original) {
                                setImageProgress(progress);
                            }
                        },
                        false
                    );
                    if (previousImgRef.current?._id === currentImageId && currentLoadingUrlRef.current === original) {
                        setFrontSrc(src);
                        setFrontLoaded(true);
                        setShowProgressBar(false);
                        frontImageLoadedRef.current = true;
                        loadedAny = true;
                    }
                } catch (e) {
                    // Ignore
                    if (previousImgRef.current?._id === currentImageId) {
                        setShowProgressBar(false);
                    }
                }
            }

            // If no image to load, hide progress bar
            if (!regular && !original) {
                setShowProgressBar(false);
            } else if (!loadedAny && (regular || original) && previousImgRef.current?._id === currentImageId) {
                // If we have URLs but they match thumbnail, just use them
                const target = original || regular;
                if (target === thumbnail) {
                    setShowProgressBar(false);
                }
            }

            // If we failed to load anything or didn't have anything to load
            if (!loadedAny && !regular && !original) {
                if (previousImgRef.current?._id === currentImageId) {
                    setFrontSrc(null);
                    setFrontLoaded(false);
                }
            } else if (!loadedAny && (regular || original) && previousImgRef.current?._id === currentImageId) {
                // If we have URLs but they match thumbnail, just use them
                const target = original || regular;
                if (target === thumbnail) {
                    setFrontSrc(target);
                    setFrontLoaded(true);
                    frontImageLoadedRef.current = true;
                }
            }
        };

        loadFrontImage();
    }, [img]);

    // No need for resize calculations - CSS handles it automatically

    // Cleanup author tooltip timeout on unmount
    useEffect(() => {
        return () => {
            if (authorTooltipTimeoutRef.current) {
                clearTimeout(authorTooltipTimeoutRef.current);
            }
        };
    }, []);

    // Trigger animation when tooltip appears
    useEffect(() => {
        if (showAuthorTooltip) {
            // Small delay to ensure DOM is ready, then trigger animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTooltipAnimating(true);
                });
            });
        } else {
            setTooltipAnimating(false);
        }
    }, [showAuthorTooltip]);

    // Listen for locale changes to re-render translations
    useEffect(() => {
        const handleLocaleChange = () => {
            setLocaleUpdate(prev => prev + 1);
        };
        window.addEventListener('localeChange', handleLocaleChange);
        return () => window.removeEventListener('localeChange', handleLocaleChange);
    }, []);

    // Close download menu when clicking outside
    useEffect(() => {
        if (!showDownloadMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-download-menu]')) {
                setShowDownloadMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDownloadMenu]);

    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        },
        [onClose]
    );

    // Handle download
    const handleDownload = useCallback(async (size: DownloadSize) => {
        if (!img?._id) return;
        try {
            // Increment download count first
            try {
                const statsResponse = await imageStatsService.incrementDownload(img._id);
                setDownloads(statsResponse.downloads);
                // Track that this stat was updated via API in module-level cache
                const stats = apiStatsCache.get(img._id) || {};
                stats.downloads = statsResponse.downloads;
                apiStatsCache.set(img._id, stats);

                // Update the current image with new downloads and dailyDownloads
                setCurrentImage(prev => ({
                    ...prev,
                    downloads: statsResponse.downloads,
                    dailyDownloads: {
                        ...(prev.dailyDownloads || {}),
                        ...(statsResponse.dailyDownloads || {})
                    }
                }));
            } catch (error: any) {
                // Handle rate limiting gracefully
                if (error.response?.status === 429) {
                    const rateLimitData = error.response.data;
                    if (rateLimitData.downloads !== undefined) {
                        setDownloads(rateLimitData.downloads);
                        // Track that this stat was updated via API in module-level cache (even if rate limited)
                        const stats = apiStatsCache.get(img._id) || {};
                        stats.downloads = rateLimitData.downloads;
                        apiStatsCache.set(img._id, stats);

                        // Update the current image with new downloads if dailyDownloads provided
                        if (rateLimitData.dailyDownloads) {
                            setCurrentImage(prev => ({
                                ...prev,
                                downloads: rateLimitData.downloads,
                                dailyDownloads: {
                                    ...(prev.dailyDownloads || {}),
                                    ...(rateLimitData.dailyDownloads || {})
                                }
                            }));
                        } else {
                            setCurrentImage(prev => ({
                                ...prev,
                                downloads: rateLimitData.downloads
                            }));
                        }
                    }
                    // Show user-friendly message
                    if (rateLimitData.message) {
                        toast.info(rateLimitData.message, {
                            duration: 4000,
                        });
                    }
                    // Still allow download even if rate limited (don't block the user)
                } else {
                    console.error('Failed to increment download count:', error);
                    // Continue with download even if increment fails
                }
            }

            // Download image with selected size
            const response = await api.get(`/images/${img._id}/download?size=${size}`, {
                responseType: 'blob',
                withCredentials: true,
            });
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'photo.webp';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            } else {
                const sanitizedTitle = (img.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const urlExtension = img.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
                fileName = `${sanitizedTitle}.${urlExtension}`;
            }
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            toast.success(t('image.downloadSuccess'));
            setShowDownloadMenu(false);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error(t('image.downloadFailed'));
        }
    }, [img]);

    // Handle toggle favorite
    const handleToggleFavorite = useCallback(async () => {
        if (!user || !img?._id || isTogglingFavorite) return;
        setIsTogglingFavorite(true);
        try {
            const imageId = String(img._id);
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
            setIsTogglingFavorite(false);
        }
    }, [user, img, isTogglingFavorite]);

    // Handle share
    const handleShare = useCallback(() => {
        if (!img?._id) return;
        const slug = generateImageSlug(img.imageTitle || 'Untitled', img._id);
        const shareUrl = `${window.location.origin}/photos/${slug}`;
        if (navigator.share) {
            navigator.share({
                title: img.imageTitle || 'Photo',
                text: `Check out this photo: ${img.imageTitle || 'Untitled'}`,
                url: shareUrl,
            }).catch(() => { });
        } else {
            shareService.copyToClipboard(shareUrl).then((success) => {
                if (success) {
                    toast.success(t('share.linkCopied'));
                } else {
                    toast.error(t('share.linkCopyFailed'));
                }
            });
        }
        setShowShareMenu(false);
    }, [img]);

    if (!img) return null;

    return (
        <>
            {/* Progress bar at top of viewport */}
            <ImageProgressBar progress={imageProgress} visible={showProgressBar} />
            <div
                onClick={handleOverlayClick}
                className="image-modal-overlay"
            >
                <div
                    ref={modalRef}
                    className={`image-modal-container ${isScrolled ? 'scrolled' : ''} ${shouldAnimate ? 'animate' : ''}`}
                >
                    {/* Scroll area inside modal */}
                    <div
                        ref={scrollRef}
                        className="image-modal-scroll-area"
                        onScroll={(e) => {
                            const top = (e.currentTarget as HTMLDivElement).scrollTop;
                            const prevTop = scrollPosRef.current;
                            const wasScrolled = prevTop > 0;
                            scrollPosRef.current = top;

                            // Check if scrolled past the initial spacer (16px)
                            const nowScrolled = top > 0;

                            // Check if we've reached the related section
                            if (relatedSectionRef.current && scrollRef.current) {
                                const relatedSectionRect = relatedSectionRef.current.getBoundingClientRect();
                                const scrollAreaRect = scrollRef.current.getBoundingClientRect();
                                const topBarHeight = 60; // Height of the sticky top bar
                                // The sticky top bar is at top: 0 of the scroll container
                                // So in viewport coordinates, it's at scrollAreaRect.top
                                // Check if the related section has reached the bottom of the top bar
                                // This triggers the slide-up animation when the related section reaches the top bar
                                const reachedRelated = relatedSectionRect.top <= scrollAreaRect.top + topBarHeight;

                                if (reachedRelated !== isAtRelatedSection) {
                                    setIsAtRelatedSection(reachedRelated);
                                }
                            }

                            // Only update state if it actually changed
                            if (nowScrolled !== wasScrolled) {
                                // State is changing - enable animation before updating
                                setShouldAnimate(true);
                                // Update the scrolled state
                                setIsScrolled(nowScrolled);

                                // Keep animation enabled during the transition, then disable it
                                setTimeout(() => {
                                    setShouldAnimate(false);
                                }, 150); // Slightly longer than CSS transition to ensure it completes
                            } else {
                                // Same state - just update scroll position ref
                                setIsScrolled(nowScrolled);
                            }
                        }}
                    >
                        {/* Top info - Sticky: starts with space, sticks to viewport top when scrolling */}
                        <div ref={topInfoRef} className={`image-modal-top-info ${isAtRelatedSection ? 'slide-up' : ''}`}>
                            <div
                                ref={authorAreaRef}
                                className="image-modal-author-area"
                                onMouseEnter={() => {
                                    // Clear any hide timeout
                                    if ((authorAreaRef.current as any)?.hideTimeout) {
                                        clearTimeout((authorAreaRef.current as any).hideTimeout);
                                        (authorAreaRef.current as any).hideTimeout = null;
                                    }
                                    // Clear any existing timeout
                                    if (authorTooltipTimeoutRef.current) {
                                        clearTimeout(authorTooltipTimeoutRef.current);
                                    }
                                    // Set timeout to show tooltip after 1 second
                                    authorTooltipTimeoutRef.current = setTimeout(async () => {
                                        setShowAuthorTooltip(true);
                                        // Fetch author's images when tooltip shows
                                        const userId = (img as any)?.uploadedBy?._id || (img as any)?.uploadedBy;
                                        if (userId && !loadingAuthorImages) {
                                            setLoadingAuthorImages(true);
                                            try {
                                                const response = await imageFetchService.fetchUserImages(userId, { page: 1, limit: 3 });
                                                setAuthorImages(response.images || []);
                                            } catch (error) {
                                                console.error('Failed to fetch author images:', error);
                                                setAuthorImages([]);
                                            } finally {
                                                setLoadingAuthorImages(false);
                                            }
                                        }
                                    }, 1000);
                                }}
                                onMouseLeave={(e) => {
                                    // Use a delay to allow mouse to move to tooltip
                                    const hideTimeout = setTimeout(() => {
                                        const tooltipElement = document.querySelector('[data-author-tooltip]') as HTMLElement;
                                        if (!tooltipElement) {
                                            setShowAuthorTooltip(false);
                                            return;
                                        }
                                        // Check if mouse is actually over tooltip using getBoundingClientRect
                                        const tooltipRect = tooltipElement.getBoundingClientRect();
                                        const mouseX = (e as any).clientX || 0;
                                        const mouseY = (e as any).clientY || 0;

                                        // Check if mouse is within tooltip bounds (with some padding for the gap)
                                        const isOverTooltip = (
                                            mouseX >= tooltipRect.left - 10 &&
                                            mouseX <= tooltipRect.right + 10 &&
                                            mouseY >= tooltipRect.top - 10 &&
                                            mouseY <= tooltipRect.bottom + 10
                                        );

                                        if (!isOverTooltip) {
                                            // Start hide animation
                                            setTooltipAnimating(false);
                                            // Remove from DOM after animation
                                            setTimeout(() => {
                                                setShowAuthorTooltip(false);
                                            }, 200);
                                        }
                                        // Clear timeout if mouse leaves before delay
                                        if (authorTooltipTimeoutRef.current) {
                                            clearTimeout(authorTooltipTimeoutRef.current);
                                            authorTooltipTimeoutRef.current = null;
                                        }
                                    }, 150);

                                    // Store timeout to clear if mouse enters tooltip
                                    (authorAreaRef.current as any).hideTimeout = hideTimeout;
                                }}
                            >
                                <div className="image-modal-author-avatar">
                                    {authorName ? authorName[0]?.toUpperCase() : 'A'}
                                </div>
                                <div>
                                    <div className="image-modal-author-name">{authorName}</div>
                                    <div className="image-modal-author-title">{img.imageTitle || t('image.topInfo')}</div>
                                </div>

                                {/* Author tooltip/popup */}
                                {showAuthorTooltip && authorAreaRef.current && topInfoRef.current && modalRef.current && (() => {
                                    const authorRect = authorAreaRef.current!.getBoundingClientRect();
                                    topInfoRef.current!.getBoundingClientRect(); // Used for layout calculation
                                    const modalRect = modalRef.current!.getBoundingClientRect();
                                    // Align tooltip left edge with the left edge of modal container (where the red line is)
                                    return (
                                        <div
                                            data-author-tooltip
                                            className={`image-modal-author-tooltip ${tooltipAnimating ? 'animating' : ''}`}
                                            style={{
                                                top: `${authorRect.bottom - 10}px`,
                                                left: `${modalRect.left - 140}px`,
                                            }}
                                            onMouseEnter={() => {
                                                // Clear any hide timeout from author area
                                                if (authorAreaRef.current && (authorAreaRef.current as any).hideTimeout) {
                                                    clearTimeout((authorAreaRef.current as any).hideTimeout);
                                                    (authorAreaRef.current as any).hideTimeout = null;
                                                }
                                                // Keep tooltip visible when hovering over it
                                            }}
                                            onMouseLeave={(e) => {
                                                // Use a delay to allow mouse to move back to author area
                                                const hideTimeout = setTimeout(() => {
                                                    if (!authorAreaRef.current?.matches(':hover')) {
                                                        // Start hide animation
                                                        setTooltipAnimating(false);
                                                        // Remove from DOM after animation
                                                        setTimeout(() => {
                                                            setShowAuthorTooltip(false);
                                                        }, 200);
                                                    }
                                                }, 150);

                                                // Store timeout to clear if mouse enters author area
                                                (e.currentTarget as any).hideTimeout = hideTimeout;
                                            }}
                                        >
                                            <div className="image-modal-author-tooltip-header">
                                                <div className="image-modal-author-tooltip-avatar">
                                                    {authorName ? authorName[0]?.toUpperCase() : 'A'}
                                                </div>
                                                <div>
                                                    <div className="image-modal-author-tooltip-name">
                                                        {authorName}
                                                    </div>
                                                    <div className="image-modal-author-tooltip-bio">
                                                        {(img as any)?.uploadedBy?.bio || t('image.photographer')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="image-modal-author-tooltip-location">
                                                {(img as any)?.uploadedBy?.location || t('image.noLocation')}
                                            </div>

                                            {/* Uploaded images section */}
                                            {authorImages.length > 0 && (
                                                <div className="image-modal-author-images-section">
                                                    <div className="image-modal-author-images-grid">
                                                        {authorImages.slice(0, 3).map((authorImg, idx) => (
                                                            <div
                                                                key={authorImg._id || idx}
                                                                className="image-modal-author-image-item"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const imageIndex = images.findIndex(i => i._id === authorImg._id);
                                                                    if (imageIndex >= 0 && onSelectIndex) {
                                                                        onSelectIndex(imageIndex);
                                                                    }
                                                                }}
                                                            >
                                                                {authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl ? (
                                                                    <img
                                                                        src={authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl}
                                                                        alt={authorImg.imageTitle || 'Photo'}
                                                                        className="image-modal-author-image"
                                                                    />
                                                                ) : (
                                                                    <div className="image-modal-author-image-placeholder">
                                                                        {t('image.noImage')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* View profile button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const userId = (img as any)?.uploadedBy?._id || (img as any)?.uploadedBy;
                                                    const username = (img as any)?.uploadedBy?.username;
                                                    if (username) {
                                                        navigate(`/profile/${username}`);
                                                        onClose();
                                                    } else if (userId) {
                                                        navigate(`/profile/user/${userId}`);
                                                        onClose();
                                                    }
                                                    setShowAuthorTooltip(false);
                                                }}
                                                className="image-modal-view-profile-button"
                                            >
                                                {t('image.viewProfile')}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="image-modal-actions">
                                {/* Save/Favorite button */}
                                {user && (
                                    <button
                                        onClick={handleToggleFavorite}
                                        disabled={isTogglingFavorite}
                                        className="image-modal-favorite-button"
                                    >
                                        <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                                        <span>{t('image.save')}</span>
                                        <kbd className="image-modal-kbd">F</kbd>
                                    </button>
                                )}

                                {/* Download button with dropdown */}
                                <div className="image-modal-download-menu-wrapper" data-download-menu>
                                    <button
                                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                        className="image-modal-download-button"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                        }}
                                    >
                                        <span>{t('image.download')}</span>
                                        <ChevronDown size={16} />
                                    </button>
                                    {showDownloadMenu && (
                                        <div
                                            className="image-modal-download-menu"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {[
                                                { value: 'small' as DownloadSize, label: t('image.small'), dimension: '640px' },
                                                { value: 'medium' as DownloadSize, label: t('image.medium'), dimension: '1920px' },
                                                { value: 'large' as DownloadSize, label: t('image.large'), dimension: '2400px' },
                                                { value: 'original' as DownloadSize, label: t('image.original'), dimension: t('image.fullSize') },
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        handleDownload(option.value);
                                                        setShowDownloadMenu(false);
                                                    }}
                                                    className="image-modal-download-menu-item"
                                                >
                                                    <div>
                                                        <div className="image-modal-download-option-label">{option.label}</div>
                                                        <div className="image-modal-download-option-dimension">{option.dimension}</div>
                                                    </div>
                                                    {option.value === 'medium' && (
                                                        <span className="image-modal-download-option-default">{t('image.default')}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Middle image with gutters */}
                        <div className="image-modal-middle-container">
                            {/* Unsplash-style simple container - no complex calculations */}
                            <div className="image-modal-image-wrapper">
                                <div
                                    className={`image-modal-image-container ${img.width && img.height ? 'has-aspect-ratio' : 'no-aspect-ratio'}`}
                                    style={{
                                        aspectRatio: img.width && img.height ? `${img.width} / ${img.height}` : undefined,
                                    }}
                                >
                                    {/* Back layer: Always render, hide with opacity when front is ready */}
                                    {/* This prevents flash by keeping an image in DOM at all times */}
                                    {backSrc && !backSrc.startsWith('data:') && (
                                        <img
                                            key={`back-${img._id}`}
                                            src={backSrc}
                                            alt={img.imageTitle || 'photo'}
                                            className={`image-modal-back-image ${frontLoaded ? 'loaded' : ''}`}
                                            draggable={false}
                                            onLoad={(e) => {
                                                const imgEl = e.currentTarget;
                                                if (imgEl.decode) {
                                                    imgEl.decode().catch(() => { });
                                                }
                                            }}
                                        />
                                    )}
                                    {/* Front layer: Full-quality image (shown when ready, no blur) */}
                                    {frontSrc && (
                                        <img
                                            key={`front-${img._id}`}
                                            ref={imgElementRef}
                                            src={frontSrc}
                                            alt={img.imageTitle || 'photo'}
                                            className={`image-modal-front-image ${frontLoaded ? 'loaded' : ''}`}
                                            draggable={false}
                                            onLoad={(e) => {
                                                const imgEl = e.currentTarget;
                                                if (imgEl.decode) {
                                                    imgEl.decode().then(() => {
                                                        // Wait a frame to ensure image is rendered before marking as loaded
                                                        requestAnimationFrame(() => {
                                                            requestAnimationFrame(() => {
                                                                setFrontLoaded(true);
                                                            });
                                                        });
                                                    }).catch(() => {
                                                        requestAnimationFrame(() => {
                                                            setFrontLoaded(true);
                                                        });
                                                    });
                                                } else {
                                                    requestAnimationFrame(() => {
                                                        setFrontLoaded(true);
                                                    });
                                                }
                                            }}
                                            onError={() => {
                                                // If front image fails to load, keep back image visible
                                                setFrontLoaded(false);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom info (scrolls with content) */}
                        <div className="image-modal-bottom-info">
                            <div className="image-modal-bottom-info-row">
                                {/* Left: image info */}
                                <div className="image-modal-image-info">
                                    {/* Views and Downloads Stats with Share/Info buttons */}
                                    <div className="image-modal-stats-row">
                                        <div className="image-modal-stats-header">
                                            <div className="image-modal-stat-item">
                                                <div className="image-modal-stat-label">Views</div>
                                                <div className="image-modal-stat-value">{views.toLocaleString()}</div>
                                            </div>
                                            <div className="image-modal-stat-item">
                                                <div className="image-modal-stat-label">Downloads</div>
                                                <div className="image-modal-stat-value">{downloads.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Right: Share and Info buttons */}
                                        <div className="image-modal-actions-container">
                                            {/* Share button */}
                                            <button
                                                onClick={handleShare}
                                                className="image-modal-share-button"
                                            >
                                                <Share2 size={16} />
                                                <span>{t('share.share')}</span>
                                            </button>
                                            <ImageModalInfo image={img} />
                                        </div>
                                    </div>

                                    {img.imageTitle && (
                                        <div className="image-modal-image-title">
                                            {img.imageTitle}
                                        </div>
                                    )}

                                    {/* Location and Camera Info */}
                                    {(img.location || img.cameraModel) && (
                                        <div className="image-modal-image-details">
                                            {img.location && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <MapPin size={14} style={{ flexShrink: 0 }} />
                                                    {img.coordinates ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${img.coordinates.latitude},${img.coordinates.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                color: 'inherit',
                                                                textDecoration: 'none',
                                                                transition: 'opacity 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                            {img.location}
                                                            <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
                                                        </a>
                                                    ) : (
                                                        <span>{img.location}</span>
                                                    )}
                                                </span>
                                            )}
                                            {img.location && img.cameraModel && <span> • </span>}
                                            {img.cameraModel && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <img src={cameraIcon} alt="Camera" style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                                                    {img.cameraModel}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Camera EXIF Info */}
                                    {(img.focalLength || img.aperture || img.shutterSpeed || img.iso) && (
                                        <div className="image-modal-image-exif">
                                            {img.focalLength && <span>{img.focalLength}mm</span>}
                                            {img.focalLength && img.aperture && <span> • </span>}
                                            {img.aperture && <span>f/{img.aperture}</span>}
                                            {img.aperture && img.shutterSpeed && <span> • </span>}
                                            {img.shutterSpeed && <span>{img.shutterSpeed}</span>}
                                            {img.shutterSpeed && img.iso && <span> • </span>}
                                            {img.iso && <span>ISO {img.iso}</span>}
                                        </div>
                                    )}

                                    {/* Date */}
                                    {formattedDate && (
                                        <div className="image-modal-image-date">
                                            <img src={dateIcon} alt="Date" style={{ width: '14px', height: '14px', flexShrink: 0, marginRight: '6px' }} />
                                            {formattedDate}
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {img.tags && Array.isArray(img.tags) && img.tags.length > 0 && (
                                        <div className="image-modal-image-tags">
                                            {img.tags.map((tag, idx) => (
                                                <span key={idx} className="image-modal-image-tag">
                                                    <Tag size={14} />
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Description */}
                                    {img.description && (
                                        <div className="image-modal-image-description">
                                            {img.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Related images - outside bottom bar */}
                        <div ref={relatedSectionRef} className="image-modal-related-section">
                            <div className="image-modal-related-title">Related images</div>
                            <div
                                ref={relatedGridRef}
                                className="image-modal-related-grid"
                                style={{
                                    gridTemplateColumns: `repeat(${relatedColumnCount}, 1fr)`,
                                    gap: `${GRID_CONFIG.gap}px`,
                                    gridAutoRows: `${GRID_CONFIG.baseRowHeight}px`,
                                }}
                            >
                                {relatedGridLayout.map((layout, idx) => {
                                    const { image, column, rowSpan, rowStart } = layout;
                                    const originalIdx = images.findIndex((imgItem) => imgItem._id === image._id);
                                    return (
                                        <div
                                            key={`${image._id || idx}-${column}-${rowStart}`}
                                            className="image-modal-related-item-wrapper"
                                            style={{
                                                gridColumn: column,
                                                gridRowStart: rowStart,
                                                gridRowEnd: `span ${rowSpan}`,
                                                height: 'auto',
                                            }}
                                        >
                                            <BlurUpImage
                                                image={image}
                                                onClick={() => {
                                                    if (onSelectIndex && originalIdx >= 0) {
                                                        onSelectIndex(originalIdx);
                                                    }
                                                }}
                                                priority={idx < 4}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Close button - top left of overlay */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="image-modal-close-button"
                >
                    <img
                        src={closeIcon}
                        alt="Close"
                        className="image-modal-close-icon"
                    />
                </button>

                {/* Left navigation button - outside modal */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (index > 0) {
                            onNavigate(index - 1);
                        }
                    }}
                    disabled={index === 0}
                    className="image-modal-nav-button left"
                >
                    <img
                        src={leftArrowIcon}
                        alt={t('common.previous')}
                        className="image-modal-nav-icon"
                    />
                </button>

                {/* Right navigation button - outside modal */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (index < images.length - 1) {
                            onNavigate(index + 1);
                        }
                    }}
                    disabled={index === images.length - 1}
                    className="image-modal-nav-button right"
                >
                    <img
                        src={rightArrowIcon}
                        alt={t('common.next')}
                        className="image-modal-nav-icon"
                    />
                </button>
            </div>
        </>
    );
}
