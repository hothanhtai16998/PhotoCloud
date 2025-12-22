import { useEffect, useLayoutEffect, useContext, useCallback, useRef, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useImageStore } from "@/stores/useImageStore";
import { useSliderStore } from "@/stores/useSliderStore";
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts";
import { triggerSearchFocus } from "@/utils/searchFocusEvent";
import { ActualLocationContext } from "@/contexts/ActualLocationContext";
import { NoFlashGrid } from "@/components/NoFlashGrid";
import { VisualArtFormsSlider } from "@/components/VisualArtFormsSlider";
import { useImageGridCategory } from "@/hooks/useImageGridCategory";
import { generateImageSlug } from "@/lib/utils";
import type { Image } from "@/types/image";
import { useIsMobile } from "@/hooks/useIsMobile";
import { saveScrollPosition, prepareModalNavigationState, isPageRefresh, setModalActive } from "@/utils/modalNavigation";
import { imageService } from "@/services/imageService";
import { syncGlobalLoading } from "@/stores/helpers/syncGlobalLoading";
import { timingConfig } from '@/config/timingConfig';
import { useSearchFilters } from "@/components/SearchBar/hooks/useSearchFilters";
import { buildFilterParams } from "@/utils/buildFilterParams";
import { ActiveFiltersIndicator } from "@/components/ActiveFiltersIndicator";

function HomePage() {
    const { currentSearch, images, loading, pagination, fetchImages } = useImageStore();
    const { loading: sliderLoading, slides } = useSliderStore();
    const actualLocation = useContext(ActualLocationContext);
    const { category } = useImageGridCategory();
    const { filters } = useSearchFilters();
    const navigate = useNavigate();
    const prevCategoryRef = useRef<string | null>(null);
    const isInitialMountRef = useRef(true);
    const filtersRef = useRef(filters);
    const isMobile = useIsMobile();
    
    // Keep filters ref updated so we always use latest filters in effects
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);
    const [gridHasLoaded, setGridHasLoaded] = useState(false);
    const [sliderHasLoaded, setSliderHasLoaded] = useState(false);
    const initialLoadCompleteRef = useRef(false);
    
    // Track when each component finishes initial load (regardless of cache)
    // This ensures spinner stays until BOTH are done, even if one loads from cache instantly
    useEffect(() => {
        // Grid finished: not loading anymore (regardless of whether it has data or not)
        if (!loading && !gridHasLoaded) {
            setGridHasLoaded(true);
        }
    }, [loading, gridHasLoaded]);
    
    useEffect(() => {
        // Slider finished: not loading anymore (regardless of whether it has data or not)
        if (!sliderLoading && !sliderHasLoaded) {
            setSliderHasLoaded(true);
        }
    }, [sliderLoading, sliderHasLoaded]);
    
    // Mark initial load as complete when both have finished
    useEffect(() => {
        if (gridHasLoaded && sliderHasLoaded && !initialLoadCompleteRef.current) {
            initialLoadCompleteRef.current = true;
        }
    }, [gridHasLoaded, sliderHasLoaded]);
    
    // Sync combined loading state to global loading store
    // On initial page load (refresh), show spinner until BOTH grid AND slider finish their initial fetch
    // After initial load, only show when either is loading (normal behavior)
    const isHomePageLoading = useMemo(() => {
        const gridLoading = loading && images.length === 0;
        const sliderIsLoading = sliderLoading && slides.length === 0;
        
        // On initial load (refresh), keep spinner until BOTH finish their initial fetch
        // This prevents flashing even if one loads from cache instantly
        if (!initialLoadCompleteRef.current) {
            // Show spinner until both have confirmed they're done loading
            return !gridHasLoaded || !sliderHasLoaded;
        }
        
        // After initial load, normal behavior: show if either is loading
        return gridLoading || sliderIsLoading;
    }, [loading, images.length, sliderLoading, slides.length, gridHasLoaded, sliderHasLoaded]);
    
    // Use ref to track previous state and prevent rapid toggling
    const prevLoadingRef = useRef(isHomePageLoading);
    
    useEffect(() => {
        // Only sync if state actually changed (prevents rapid toggling)
        if (prevLoadingRef.current !== isHomePageLoading) {
            prevLoadingRef.current = isHomePageLoading;
            syncGlobalLoading('homePage', isHomePageLoading);
        }
        
        return () => {
            syncGlobalLoading('homePage', false);
            prevLoadingRef.current = false;
        };
    }, [isHomePageLoading]);
    
    // Preload first slider image URL as early as possible for better LCP discovery
    // CRITICAL: This must use the EXACT same URL priority as slider store (imageAvifUrl || imageUrl || regularAvifUrl || regularUrl || smallAvifUrl || smallUrl)
    // Use useLayoutEffect to add preload BEFORE React paints, making it discoverable earlier
    useLayoutEffect(() => {
        if (currentSearch) return; // Skip if search is active (no slider shown)
        
        // Priority 1: Use slides from store if already loaded (fastest path)
        if (slides.length > 0 && slides[0]?.image) {
            const firstSlideImageUrl = slides[0].image;
            // Remove any existing preload to avoid duplicates
            const existing = document.querySelector('link[rel="preload"][as="image"][fetchpriority="high"]');
            if (existing) existing.remove();
            
            // Preload the first slider image immediately for LCP
            // Use useLayoutEffect so this runs synchronously before paint
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = firstSlideImageUrl;
            link.setAttribute('fetchpriority', 'high');
            document.head.appendChild(link);
            return;
        }
    }, [currentSearch, slides]);
    
    // Priority 2: Fetch just 1 image to get the first slider image URL quickly
    // Use the SAME URL priority logic as the slider store
    useEffect(() => {
        if (currentSearch) return; // Skip if search is active (no slider shown)
        if (slides.length > 0) return; // Already handled in useLayoutEffect above
        
        const prefetchFirstImage = async () => {
            try {
                const response = await imageService.fetchImages({ 
                    limit: 1,
                    _refresh: true 
                });
                
                const firstImage = response.images?.[0];
                if (firstImage) {
                    // CRITICAL: Use EXACT same URL priority as slider store (useSliderStore.ts line 91)
                    // Slider uses: imageAvifUrl || imageUrl || regularAvifUrl || regularUrl || smallAvifUrl || smallUrl
                    // This ensures the preload URL matches the actual LCP image URL
                    const imageUrl = firstImage.imageAvifUrl || 
                                   firstImage.imageUrl || 
                                   firstImage.regularAvifUrl || 
                                   firstImage.regularUrl || 
                                   firstImage.smallAvifUrl || 
                                   firstImage.smallUrl || '';
                    
                    if (imageUrl) {
                        // Remove any existing preload to avoid duplicates
                        const existing = document.querySelector('link[rel="preload"][as="image"][fetchpriority="high"]');
                        if (existing) existing.remove();
                        
                        // Preload the first image immediately for LCP
                        const link = document.createElement('link');
                        link.rel = 'preload';
                        link.as = 'image';
                        link.href = imageUrl;
                        link.setAttribute('fetchpriority', 'high');
                        document.head.appendChild(link);
                    }
                }
            } catch (error) {
                // Silently fail - don't block page load
            }
        };
        
        // Start prefetch immediately, don't wait
        prefetchFirstImage();
    }, [currentSearch, slides]);

    // Check if modal is open (image param exists)
    const isModalOpen = actualLocation?.pathname?.startsWith('/photos/') || false;

    // Global keyboard shortcuts
    useGlobalKeyboardShortcuts({
        onFocusSearch: triggerSearchFocus,
        isModalOpen,
    });

    // Scroll to top when search is activated to show results immediately
    useEffect(() => {
        if (currentSearch) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentSearch]);

    // Restore scroll position when returning from ImagePage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const scrollKey = 'imageGridScrollPosition';
        const savedScroll = sessionStorage.getItem(scrollKey);
        
        if (!savedScroll) return;
        
        // Check if this is a page refresh using unified utility
        const refresh = isPageRefresh();
        
        // On refresh, don't restore scroll - page should start at top
        if (refresh) {
            sessionStorage.removeItem(scrollKey);
            sessionStorage.removeItem('scrollRestoreInProgress');
            return;
        }
        
        const scrollPos = parseInt(savedScroll, 10);
        const restoreFlagKey = 'scrollRestoreInProgress';
        
        // Set flag to prevent interference from useScrollLock
        sessionStorage.setItem(restoreFlagKey, 'true');
        
        // Disable browser's automatic scroll restoration temporarily
        const originalScrollRestoration = window.history.scrollRestoration;
        if (window.history.scrollRestoration) {
            window.history.scrollRestoration = 'manual';
        }
        
        // Restore scroll with multiple attempts to handle async content loading
        const restoreScroll = () => {
            window.scrollTo({ top: scrollPos, behavior: 'auto' });
            
            // Verify and cleanup after a short delay
            setTimeout(() => {
                const currentScroll = window.scrollY;
                const scrollDiff = Math.abs(currentScroll - scrollPos);
                
                // If successfully restored (within 50px tolerance), cleanup
                if (scrollDiff < 50) {
                    sessionStorage.removeItem(scrollKey);
                    sessionStorage.removeItem(restoreFlagKey);
                    if (window.history.scrollRestoration === 'manual') {
                        window.history.scrollRestoration = originalScrollRestoration || 'auto';
                    }
                } else {
                    // Clear flag if restoration failed
                    sessionStorage.removeItem(restoreFlagKey);
                }
            }, 200);
        };
        
        // Try multiple times to handle async content loading
        restoreScroll();
        requestAnimationFrame(() => {
            restoreScroll();
            setTimeout(restoreScroll, 100);
        });
    }, []); // Run once on mount

    // Helper to normalize category parameter
    const getCategoryParam = useCallback((categoryValue: string | null) => {
        if (categoryValue === null || categoryValue === 'all' || !categoryValue) {
            return undefined;
        }
        return categoryValue;
    }, []);

    // Fetch images when category changes
    // CRITICAL: Only run when category changes, NOT when filters change
    // Filter changes are handled by SearchBar.handleFiltersChange which already calls fetchImages with _refresh: true
    // If we also fetch here when filters change, we get duplicate/conflicting calls
    useEffect(() => {
        // Wait for category to resolve (not null)
        if (category === null) {
            return;
        }

        // Only fetch if category actually changed (not just filters)
        const categoryChanged = prevCategoryRef.current !== category;
        if (!categoryChanged && !isInitialMountRef.current) {
            // Category didn't change - don't fetch (filter changes are handled by SearchBar)
            return;
        }

        // Update prev category
        prevCategoryRef.current = category;

        const scheduleFetch = () => {
            // Always use current filters when category changes (from ref to avoid stale closure)
            const fetchParams = buildFilterParams(filtersRef.current, {
                page: 1,
                limit: 20,
                category: getCategoryParam(category),
                _refresh: false // Use cache for instant display when category changes
            });
            
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    fetchImages(fetchParams);
                }, { timeout: 100 });
            } else {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        fetchImages(fetchParams);
                    });
                });
            }
        };
        
        scheduleFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category]); // Only depend on category, not filters - filter changes are handled by SearchBar

    // Scroll to NoFlashGrid when category changes (except on initial mount or when restoring scroll)
    useEffect(() => {
        // Wait for category to resolve (not null)
        if (category === null) {
            return;
        }

        // Skip if we're restoring scroll position
        const isRestoringScroll = sessionStorage.getItem('scrollRestoreInProgress') === 'true';
        if (isRestoringScroll) {
            prevCategoryRef.current = category;
            return;
        }

        // Skip on initial mount
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            prevCategoryRef.current = category;
            return;
        }

        // Only scroll if category actually changed
        if (prevCategoryRef.current !== category) {
            prevCategoryRef.current = category;

            // Helper function to scroll to grid (accounting for header)
            const scrollToGrid = () => {
                const gridContainer = document.getElementById('image-grid-container');
                if (!gridContainer) return;

                // Calculate header height dynamically
                const header = document.querySelector('.unsplash-header');
                const headerHeight = header ? header.getBoundingClientRect().height : 100; // Fallback to 100px for desktop

                // Get the grid container's position
                const gridRect = gridContainer.getBoundingClientRect();
                const scrollY = window.scrollY + gridRect.top - headerHeight;

                // Scroll to grid with smooth behavior
                window.scrollTo({
                    top: Math.max(0, scrollY), // Ensure we don't scroll to negative position
                    behavior: 'smooth'
                });
            };

            // Scroll to grid after a short delay to ensure DOM is updated
            setTimeout(() => {
                requestAnimationFrame(() => {
                    scrollToGrid();
                    // Try again after a short delay in case content is still loading
                    setTimeout(() => {
                        scrollToGrid();
                    }, 200);
                });
            }, 100);
        }
    }, [category]);

    // Load data callback for NoFlashGrid
    const loadData = useCallback(async () => {
        const fetchParams = buildFilterParams(filters, {
            page: 1,
            limit: 20, // Initial load: 20 images for better performance, infinite scroll will load more
            category: getCategoryParam(category),
            _refresh: true // Only refresh when explicitly loading data
        });
        await fetchImages(fetchParams);
    }, [fetchImages, category, filters, getCategoryParam]);

    // Load more images (infinite scroll)
    const loadMore = useCallback(async () => {
        if (!pagination || pagination.page >= pagination.pages) return;
        const fetchParams = buildFilterParams(filters, {
            page: pagination.page + 1,
            limit: 20, // Load 20 more images per page for better performance
            category: getCategoryParam(category),
        });
        await fetchImages(fetchParams);
    }, [fetchImages, pagination, category, filters, getCategoryParam]);

    // Handle image click - navigate to ImagePage
    const handleImageClick = useCallback((image: Image, _index: number) => {
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        const targetPath = `/photos/${slug}`;
        
        // Mobile: full page navigation
        if (isMobile) {
            navigate(targetPath, {
                // Pass full list + clicked image so ImagePage can render instantly
                state: { images, image, fromGrid: true }
            });
            return;
        }
        
        // Desktop: modal-style with background
        // 1. Save scroll position using unified utility
        saveScrollPosition();
        
        // 2. Set modal active flag (required for validation)
        setModalActive();
        
        // 3. Prepare modal navigation state
        // CRITICAL: backgroundLocation must be a proper Location object
        const backgroundLocation = {
            pathname: actualLocation?.pathname || '/',
            search: actualLocation?.search || '',
            hash: actualLocation?.hash || '',
            state: null,
            key: actualLocation?.key || 'default', // Use 'default' instead of empty string
        };
        const modalState = prepareModalNavigationState(backgroundLocation);
        
        // 4. Navigate with modal state
        navigate(targetPath, {
            // Include clicked image in state for fast modal open
            state: { ...modalState, images, image, fromGrid: true }
        });
    }, [navigate, images, actualLocation, isMobile]);

    return (
        <>
            <main className="homepage">
                {!currentSearch && (
                    <VisualArtFormsSlider />
                )}
                <ActiveFiltersIndicator filters={filters} />
                <NoFlashGrid
                    images={images}
                    loading={loading}
                    onLoadData={loadData}
                    onImageClick={handleImageClick}
                    pagination={pagination}
                    onLoadMore={loadMore}
                />
            </main>
        </>
    );
}

export default HomePage;
