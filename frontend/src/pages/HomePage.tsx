import { useEffect, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useImageStore } from "@/stores/useImageStore";
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

function HomePage() {
    const { currentSearch, images, loading, fetchImages } = useImageStore();
    const actualLocation = useContext(ActualLocationContext);
    const { category } = useImageGridCategory();
    const navigate = useNavigate();
    const prevCategoryRef = useRef<string | null>(null);
    const isInitialMountRef = useRef(true);
    const isMobile = useIsMobile();
    
    // Prefetch first slider image URL as early as possible for better LCP
    // This runs in parallel with other initialization, before slider component mounts
    useEffect(() => {
        if (currentSearch) return; // Skip if search is active (no slider shown)
        
        const prefetchFirstImage = async () => {
            try {
                // Fetch just 1 image to get the first slider image URL quickly
                const response = await imageService.fetchImages({ 
                    limit: 1,
                    _refresh: true 
                });
                
                const firstImage = response.images?.[0];
                if (firstImage?.regularUrl || firstImage?.imageUrl) {
                    const imageUrl = firstImage.regularUrl || firstImage.imageUrl;
                    // Preload the first image immediately for LCP
                    const link = document.createElement('link');
                    link.rel = 'preload';
                    link.as = 'image';
                    link.href = imageUrl;
                    link.setAttribute('fetchpriority', 'high');
                    // Remove existing preload if any
                    const existing = document.querySelector('link[rel="preload"][as="image"][fetchpriority="high"]');
                    if (existing) existing.remove();
                    document.head.appendChild(link);
                }
            } catch (error) {
                // Silently fail - don't block page load
                if (import.meta.env.DEV) {
                    console.warn('Failed to prefetch first slider image:', error);
                }
            }
        };
        
        // Start prefetch immediately, don't wait
        prefetchFirstImage();
    }, [currentSearch]);

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
    // Memoize fetch call to prevent unnecessary re-renders
    const fetchImagesMemo = useCallback(() => {
        if (category === null) return;
        fetchImages({ 
            page: 1, 
            category: getCategoryParam(category),
            _refresh: false // Use cache for instant display
        });
    }, [category, fetchImages, getCategoryParam]);
    
    useEffect(() => {
        // Wait for category to resolve (not null)
        if (category === null) {
            return;
        }

        fetchImagesMemo();
    }, [category, fetchImagesMemo]);

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
            <Header />
            <main className="homepage">
                {!currentSearch && (
                    <VisualArtFormsSlider />
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
