import { useEffect, lazy, Suspense, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";
import Header from "../components/Header";
import './HomePage.css';
import { useImageStore } from "@/stores/useImageStore";
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { triggerSearchFocus } from "@/utils/searchFocusEvent";
import { ActualLocationContext } from "@/contexts/ActualLocationContext";
import { NoFlashGrid } from "@/components/NoFlashGrid";
import { useImageGridCategory } from "./ImageGrid/hooks/useImageGridCategory";
import { generateImageSlug } from "@/lib/utils";
import type { Image } from "@/types/image";
import { useIsMobile } from "@/hooks/useIsMobile";

// Lazy load Slider - conditionally rendered
const Slider = lazy(() => import("@/components/Slider"));

function HomePage() {
    const { currentSearch, images, loading, fetchImages } = useImageStore();
    const actualLocation = useContext(ActualLocationContext);
    const { category } = useImageGridCategory();
    const navigate = useNavigate();
    const prevCategoryRef = useRef<string | null>(null);
    const isInitialMountRef = useRef(true);
    const isMobile = useIsMobile();

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
        
        // Check if this is a page refresh (not a navigation)
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const isRefresh = navEntry?.type === 'reload';
        
        // On refresh, don't restore scroll - page should start at top
        if (isRefresh) {
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
    useEffect(() => {
        // Wait for category to resolve (not null)
        if (category === null) {
            return;
        }

        fetchImages({ 
            page: 1, 
            category: getCategoryParam(category),
            _refresh: false // Use cache for instant display
        });
    }, [category, fetchImages, getCategoryParam]);

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
        await fetchImages({ 
            page: 1, 
            category: getCategoryParam(category),
            _refresh: true // Only refresh when explicitly loading data
        });
    }, [fetchImages, category, getCategoryParam]);

    // Handle image click - navigate to ImagePage
    const handleImageClick = useCallback((image: Image, _index: number) => {
        // Save scroll position before navigating
        if (typeof window !== 'undefined') {
            const scrollKey = 'imageGridScrollPosition';
            if (!sessionStorage.getItem(scrollKey)) {
                sessionStorage.setItem(scrollKey, window.scrollY.toString());
            }
        }
        
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        const targetPath = `/photos/${slug}`;
        
        // Mobile: full page navigation | Desktop: modal-style with background
        navigate(targetPath, {
            state: isMobile 
                ? { images, fromGrid: true }
                : { images, fromGrid: true, background: { pathname: actualLocation?.pathname || '/' } }
        });
    }, [navigate, images, actualLocation, isMobile]);

    return (
        <>
            <Header />
            <main className="homepage">
                {/* Hide Slider when user is searching to show ImageGrid immediately */}
                {!currentSearch && (
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-8">
                            <Skeleton className="h-64 w-full max-w-6xl" />
                        </div>
                    }>
                        <Slider />
                    </Suspense>
                )}
                <NoFlashGrid
                    images={images}
                    loading={loading}
                    onLoadData={loadData}
                    onImageClick={handleImageClick}
                />
            </main>
        </>
    );
}

export default HomePage;