import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { CATEGORY_NAVIGATION_EVENT } from '@/utils/categoryNavigationEvent';
import { sliderLayoutTransition } from '@/utils/sliderLayoutTransition';
import './HomePageLayouts.css';
import { useEffect, useContext, useCallback, useRef, useState } from "react";
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
import { syncGlobalLoading } from "@/stores/helpers/syncGlobalLoading";
import { useSearchFilters } from "@/components/SearchBar/hooks/useSearchFilters";
import { buildFilterParams } from "@/utils/buildFilterParams";
import { ActiveFiltersIndicator } from "@/components/ActiveFiltersIndicator";

function HomePage() {
    const [sliderCollapsed, setSliderCollapsed] = useState(false);
    const reducedMotion = useReducedMotion();
    const sliderTransition = reducedMotion ? { duration: 0 } : sliderLayoutTransition;
    useEffect(() => {
        const handleCategory = (event: Event) => setSliderCollapsed(Boolean((event as CustomEvent<string>).detail));
        const handleHistory = () => {
            if (window.location.pathname === '/' || window.location.pathname.startsWith('/t/')) setSliderCollapsed(window.location.pathname.startsWith('/t/'));
        };
        window.addEventListener(CATEGORY_NAVIGATION_EVENT, handleCategory);
        window.addEventListener('popstate', handleHistory);
        return () => { window.removeEventListener(CATEGORY_NAVIGATION_EVENT, handleCategory); window.removeEventListener('popstate', handleHistory); };
    }, []);
    const { currentSearch, currentCategory, images, loading, pagination, fetchImages } = useImageStore();
    const sliderLoading = useSliderStore(state => state.loading);
    const slideCount = useSliderStore(state => state.slides.length);
    const actualLocation = useContext(ActualLocationContext);
    const { category } = useImageGridCategory();
    const { filters } = useSearchFilters();
    const navigate = useNavigate();
    const filtersRef = useRef(filters);
    const isMobile = useIsMobile();
    
    // Keep filters ref updated so we always use latest filters in effects
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);
    const [gridHasLoaded, setGridHasLoaded] = useState(false);
    useEffect(() => { if (!loading && !gridHasLoaded) setGridHasLoaded(true); }, [loading, gridHasLoaded]);
    const isHomePageLoading = !gridHasLoaded || (loading && images.length === 0) || (sliderLoading && slideCount === 0);

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
    
    // Slider owns its image preloads; avoid a duplicate metadata request and original-image preload.
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

    useEffect(() => {
        if (category === null) return;
        const controller = new AbortController();
        void fetchImages(buildFilterParams(filtersRef.current, {page: 1, limit: 20, category: getCategoryParam(category), _refresh: false}), controller.signal);
        return () => controller.abort();
    }, [category, fetchImages, getCategoryParam]);

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
        if (category === null || loading || currentCategory !== getCategoryParam(category) || !pagination || pagination.page >= pagination.pages) return;
        const fetchParams = buildFilterParams(filters, {
            page: pagination.page + 1,
            limit: 20, // Load 20 more images per page for better performance
            category: getCategoryParam(category),
        });
        await fetchImages(fetchParams);
    }, [fetchImages, pagination, category, filters, getCategoryParam, loading, currentCategory]);

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
            <main className={`homepage layout-preview layout-intro${sliderCollapsed && !currentSearch ? ' is-compact' : ''}`}>
                <LayoutGroup>
                {!currentSearch && (
                    <VisualArtFormsSlider collapsed={sliderCollapsed} />
                )}
                {sliderCollapsed && !currentSearch && <section className="category-intro">
                    <span>KHÁM PHÁ PHOTOCLOUD</span><h1>{category && category !== 'all' ? category : 'Khám phá ảnh'}</h1>
                    <p>Những góc nhìn mới, những khoảnh khắc đáng lưu giữ.</p>
                    {pagination && currentCategory === getCategoryParam(category) && <small>{pagination.total} ảnh để khám phá</small>}
                </section>}
                <motion.div className="category-grid" layout="position" layoutDependency={sliderCollapsed} transition={sliderTransition} style={{position: 'relative', willChange: 'transform', overflowAnchor: 'none'}}>
                <ActiveFiltersIndicator filters={filters} />
                <NoFlashGrid
                    images={images}
                    loading={loading}
                    onLoadData={loadData}
                    onImageClick={handleImageClick}
                    pagination={category !== null && currentCategory === getCategoryParam(category) ? pagination : null}
                    onLoadMore={loadMore}
                />
                </motion.div>
                </LayoutGroup>
            </main>
        </>
    );
}

export default HomePage;
