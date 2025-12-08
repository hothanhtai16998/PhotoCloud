import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { Image } from '@/types/image';
import { Heart, Share2, ChevronDown } from 'lucide-react';
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
import { t } from '@/i18n';
import leftArrowIcon from '@/assets/left-arrow.svg';
import rightArrowIcon from '@/assets/right-arrow.svg';
import closeIcon from '@/assets/close.svg';
import { preloadImage, loadedImages } from '../utils/imagePreloader';
import './ImageModal.css';

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
    const img = images[index];

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
    const [isScrolled, setIsScrolled] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const { user } = useUserStore();
    const isFavorited = useBatchedFavoriteCheck(img?._id);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [, setShowShareMenu] = useState(false);
    const [showAuthorTooltip, setShowAuthorTooltip] = useState(false);
    const [tooltipAnimating, setTooltipAnimating] = useState(false);
    const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const authorAreaRef = useRef<HTMLDivElement | null>(null);
    const [authorImages, setAuthorImages] = useState<ExtendedImage[]>([]);
    const [loadingAuthorImages, setLoadingAuthorImages] = useState(false);
    const [, setLocaleUpdate] = useState(0);
    const navigate = useNavigate();
    const authorName =
        (img as any)?.uploadedBy?.username ||
        (img as any)?.author ||
        (img as any)?.user ||
        'Author';
    
    // Track view and download stats
    const [views, setViews] = useState<number>((img as any)?.views || 0);
    const [downloads, setDownloads] = useState<number>((img as any)?.downloads || 0);
    const incrementedViewIds = useRef<Set<string>>(new Set());
    const currentImageIdRef = useRef<string | null>(img?._id || null);
    // Track stats that have been updated via API (so we don't reset them from stale img data)
    const apiUpdatedStats = useRef<Map<string, { views?: number; downloads?: number }>>(new Map());
    
    // No aspect ratio calculations needed - browser handles it with object-fit: contain

    // Increment view count when image is viewed (only once per image)
    useEffect(() => {
        if (!img?._id) return;
        
        const imageId = img._id;
        // Only increment if we haven't incremented for this image ID before
        if (!incrementedViewIds.current.has(imageId)) {
            incrementedViewIds.current.add(imageId);
            console.log('[ImageModal] Calling incrementView for image:', imageId);
            imageStatsService.incrementView(imageId)
                .then((response) => {
                    console.log('[ImageModal] incrementView response:', response);
                    setViews(response.views);
                    // Track that this stat was updated via API
                    const stats = apiUpdatedStats.current.get(imageId) || {};
                    stats.views = response.views;
                    apiUpdatedStats.current.set(imageId, stats);
                })
                .catch((error: any) => {
                    // Handle rate limiting gracefully
                    if (error.response?.status === 429) {
                        const rateLimitData = error.response.data;
                        if (rateLimitData.views !== undefined) {
                            setViews(rateLimitData.views);
                            // Track that this stat was updated via API (even if rate limited)
                            const stats = apiUpdatedStats.current.get(imageId) || {};
                            stats.views = rateLimitData.views;
                            apiUpdatedStats.current.set(imageId, stats);
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

    // Update stats when image changes
    // Only update from img object if we don't have API-updated values for this image
    useEffect(() => {
        if (img) {
            const imageId = img._id;
            const newViews = (img as any)?.views || 0;
            const newDownloads = (img as any)?.downloads || 0;
            
            // Check if this is a different image
            if (currentImageIdRef.current !== imageId) {
                currentImageIdRef.current = imageId;
                // Reset the incremented set for the new image
                incrementedViewIds.current.delete(imageId);
                
                // Check if we have API-updated stats for this image
                const apiStats = apiUpdatedStats.current.get(imageId);
                
                // Only set from img object if we don't have API-updated values
                // This prevents showing old numbers then updating to new numbers
                if (apiStats) {
                    // Use API-updated values if available
                    if (apiStats.views !== undefined) {
                        setViews(apiStats.views);
                    } else {
                        setViews(newViews);
                    }
                    if (apiStats.downloads !== undefined) {
                        setDownloads(apiStats.downloads);
                    } else {
                        setDownloads(newDownloads);
                    }
                } else {
                    // No API stats yet, use values from img object
                    setViews(newViews);
                    setDownloads(newDownloads);
                }
            } else {
                // Same image - preserve API-updated stats, don't reset from img object
                const apiStats = apiUpdatedStats.current.get(imageId);
                if (apiStats) {
                    // Only update if we have API values
                    if (apiStats.views !== undefined) {
                        setViews(apiStats.views);
                    }
                    if (apiStats.downloads !== undefined) {
                        setDownloads(apiStats.downloads);
                    }
                }
            }
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

        // reset scroll to top when image changes so top bar/author stay visible
        scrollPosRef.current = 0;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        // Reset scroll state when image changes (use requestAnimationFrame to avoid cascading renders)
        requestAnimationFrame(() => {
            setIsScrolled(false);
            setShouldAnimate(false);
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

        // Unsplash technique: Use different image sizes
        // Low-res thumbnail = thumbnailUrl or smallUrl (small file, pixelated when enlarged to full size)
        // High-res = regularUrl or imageUrl (full quality, sharp at full size)
        const thumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || '';

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
                    if (previousImgRef.current?._id === currentImageId) {
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
                        if (previousImgRef.current?._id === currentImageId) {
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
                                    if (previousImgRef.current?._id === currentImageId) {
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
                                setFrontSrc(null);
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
        // This creates the double-buffer effect: back layer (low-res) + front layer (high-res)
        // Reuse thumbnail and full already declared above (lines 437-438)
        // Only load full image if it's different from the thumbnail
        if (full && full !== thumbnail) {
            // Check if already loaded
            if (loadedImages.has(full)) {
                setFrontSrc(full);
                // If already cached, mark as loaded immediately
                setFrontLoaded(true);
            } else {
                // Preload full image (with decode for smooth transition)
                preloadImage(full, false)
                    .then((src) => {
                        // Only update if still showing the same image
                        if (previousImgRef.current?._id === currentImageId) {
                            setFrontSrc(src);
                        }
                    })
                    .catch(() => {
                        // On error, keep showing back layer (thumbnail)
                    });
            }
        } else if (full && full === thumbnail) {
            // If thumbnail is the same as full, use it as front image
            setFrontSrc(full);
            // Mark as loaded since it's the same as back image
            setFrontLoaded(true);
        } else {
            // If no full image to load, ensure front layer is cleared
            setFrontSrc(null);
            setFrontLoaded(false);
        }
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
                // Track that this stat was updated via API
                const stats = apiUpdatedStats.current.get(img._id) || {};
                stats.downloads = statsResponse.downloads;
                apiUpdatedStats.current.set(img._id, stats);
            } catch (error: any) {
                // Handle rate limiting gracefully
                if (error.response?.status === 429) {
                    const rateLimitData = error.response.data;
                    if (rateLimitData.downloads !== undefined) {
                        setDownloads(rateLimitData.downloads);
                        // Track that this stat was updated via API (even if rate limited)
                        const stats = apiUpdatedStats.current.get(img._id) || {};
                        stats.downloads = rateLimitData.downloads;
                        apiUpdatedStats.current.set(img._id, stats);
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

    return (
        !img ? null :
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
                            setIsScrolled(nowScrolled);

                            // Only animate when transitioning from not-scrolled to scrolled (scrolling down past threshold)
                            // Make it instant when scrolling up or already at top
                            if (nowScrolled && !wasScrolled && top > prevTop) {
                                setShouldAnimate(true);
                                // Reset animation flag after transition completes
                                setTimeout(() => setShouldAnimate(false), 200);
                            } else if (!nowScrolled || top <= prevTop) {
                                // Scrolling up or at top - make it instant
                                setShouldAnimate(false);
                            }
                        }}
                    >
                        {/* Top info - Sticky: starts with space, sticks to viewport top when scrolling */}
                        <div className="image-modal-top-info">
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
                                {showAuthorTooltip && authorAreaRef.current && (() => {
                                    const rect = authorAreaRef.current!.getBoundingClientRect();
                                    return (
                                        <div
                                            data-author-tooltip
                                            className={`image-modal-author-tooltip ${tooltipAnimating ? 'animating' : ''}`}
                                            style={{
                                                top: `${rect.bottom + 4}px`,
                                                left: `${rect.left}px`,
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

                                {/* Share button */}
                                <button
                                    onClick={handleShare}
                                    className="image-modal-share-button"
                                >
                                    <Share2 size={16} />
                                    <span>{t('share.share')}</span>
                                    <kbd className="image-modal-kbd">⌘S</kbd>
                                </button>
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
                                            key={`front-${img._id}-${frontSrc}`}
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
                                    <div className="image-modal-image-title">
                                        {img.imageTitle || 'Untitled image'}
                                    </div>
                                    <div className="image-modal-image-stats">
                                        <span>Views: {views ?? '—'}</span>
                                        <span>Downloads: {downloads ?? '—'}</span>
                                    </div>
                                    <div className="image-modal-image-tags">
                                        <span className="image-modal-image-tag">
                                            Tag 1
                                        </span>
                                        <span className="image-modal-image-tag">
                                            Tag 2
                                        </span>
                                        <span className="image-modal-image-tag">
                                            Tag 3
                                        </span>
                                    </div>
                                    <div className="image-modal-image-description">
                                        {(img as any)?.description || 'No description provided.'}
                                    </div>
                                </div>

                                {/* Right: actions */}
                                <div className="image-modal-actions-container">
                                    {['Save', 'Share', 'Report', 'Edit', 'Download'].map((label) => (
                                        <button
                                            key={label}
                                            className="image-modal-action-button"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Related images */}
                            <div>
                                <div className="image-modal-related-title">Related images</div>
                                <div className="image-modal-related-grid">
                                    {images
                                        .filter((_, i) => i !== index)
                                        .slice(0, 8)
                                        .map((related, i) => {
                                            const originalIdx = images.findIndex((imgItem) => imgItem === related);
                                            return (
                                                <div
                                                    key={related._id || i}
                                                    className="image-modal-related-item"
                                                    onClick={() => {
                                                        if (onSelectIndex && originalIdx >= 0) {
                                                            onSelectIndex(originalIdx);
                                                        }
                                                    }}
                                                >
                                                    {related.thumbnailUrl || related.smallUrl || related.imageUrl ? (
                                                        <img
                                                            src={related.thumbnailUrl || related.smallUrl || related.imageUrl}
                                                            alt={related.imageTitle || 'related'}
                                                            className="image-modal-related-image"
                                                        />
                                                    ) : (
                                                        <div className="image-modal-related-placeholder">
                                                            No preview
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
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
    );
}
