import { useEffect, lazy, Suspense, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import CategoryNavigation from "../components/CategoryNavigation";
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

// Lazy load Slider - conditionally rendered
const Slider = lazy(() => import("@/components/Slider"));

function HomePage() {
    const { currentSearch, images, loading, fetchImages } = useImageStore();
    const actualLocation = useContext(ActualLocationContext);
    const { category } = useImageGridCategory();
    const prevCategoryRef = useRef<string | null>(null);
    const navigate = useNavigate();

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
        
        // Check if this is a page refresh (not a navigation)
        // On refresh, we should NOT restore scroll - page should start at top
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const isRefresh = navEntry?.type === 'reload';
        
        const scrollKey = 'imageGridScrollPosition';
        const savedScroll = sessionStorage.getItem(scrollKey);
        
        // If this is a refresh, clear the saved scroll position
        // This ensures that refresh always starts at top
        if (isRefresh && savedScroll) {
            sessionStorage.removeItem(scrollKey);
            sessionStorage.removeItem('scrollRestoreInProgress');
            return;
        }
        
        if (savedScroll) {
            const scrollPos = parseInt(savedScroll, 10);
            
            // Set a flag to prevent other scroll operations from interfering
            const restoreFlagKey = 'scrollRestoreInProgress';
            sessionStorage.setItem(restoreFlagKey, 'true');
            
            // Disable browser's automatic scroll restoration temporarily
            const originalScrollRestoration = window.history.scrollRestoration;
            if (window.history.scrollRestoration) {
                window.history.scrollRestoration = 'manual';
            }
            
            // Track if scroll was successfully restored
            let scrollRestored = false;
            let attempts = 0;
            const maxAttempts = 15;
            let scrollMonitorTimeout: NodeJS.Timeout | null = null;
            let scrollMonitorListener: (() => void) | null = null;
            
            // Function to restore scroll and verify it worked
            const restoreScroll = (attempt: number) => {
                if (attempt > maxAttempts) {
                    // Give up after max attempts
                    if (scrollMonitorListener) {
                        window.removeEventListener('scroll', scrollMonitorListener);
                    }
                    if (scrollMonitorTimeout) {
                        clearTimeout(scrollMonitorTimeout);
                    }
                    sessionStorage.removeItem(scrollKey);
                    sessionStorage.removeItem(restoreFlagKey);
                    if (window.history.scrollRestoration === 'manual') {
                        window.history.scrollRestoration = originalScrollRestoration || 'auto';
                    }
                    return;
                }
                
                const currentScroll = window.scrollY;
                const scrollDiff = Math.abs(currentScroll - scrollPos);
                
                // If scroll is already at target position (within 5px tolerance), consider it restored
                if (scrollDiff < 5) {
                    if (!scrollRestored) {
                        scrollRestored = true;
                        
                        // Set up a monitor to watch for scroll resets
                        scrollMonitorListener = () => {
                            const monitorScroll = window.scrollY;
                            const monitorDiff = Math.abs(monitorScroll - scrollPos);
                            
                            // If scroll was reset to top (or near top), restore it
                            if (monitorScroll < 100 && scrollPos > 100) {
                                window.scrollTo({ top: scrollPos, behavior: 'auto' });
                            }
                        };
                        
                        window.addEventListener('scroll', scrollMonitorListener, { passive: true });
                        
                        // Wait a bit to ensure it stays, then cleanup
                        scrollMonitorTimeout = setTimeout(() => {
                            const finalScroll = window.scrollY;
                            const finalDiff = Math.abs(finalScroll - scrollPos);
                            if (finalDiff < 5 || finalScroll > 50) {
                                // Successfully restored - cleanup
                                if (scrollMonitorListener) {
                                    window.removeEventListener('scroll', scrollMonitorListener);
                                }
                                sessionStorage.removeItem(scrollKey);
                                sessionStorage.removeItem(restoreFlagKey);
                                if (window.history.scrollRestoration === 'manual') {
                                    window.history.scrollRestoration = originalScrollRestoration || 'auto';
                                }
                            } else {
                                // Scroll was reset, try again
                                if (scrollMonitorListener) {
                                    window.removeEventListener('scroll', scrollMonitorListener);
                                }
                                scrollRestored = false;
                                restoreScroll(attempt + 1);
                            }
                        }, 200);
                    }
                    return;
                }
                
                // Apply scroll restoration
                window.scrollTo({ top: scrollPos, behavior: 'auto' });
                
                // Verify after a short delay
                setTimeout(() => {
                    const newScroll = window.scrollY;
                    const newDiff = Math.abs(newScroll - scrollPos);
                    
                    if (newDiff < 5) {
                        if (!scrollRestored) {
                            scrollRestored = true;
                            
                            // Set up a monitor to watch for scroll resets
                            scrollMonitorListener = () => {
                                const monitorScroll = window.scrollY;
                                const monitorDiff = Math.abs(monitorScroll - scrollPos);
                                
                                // If scroll was reset to top (or near top), restore it
                                if (monitorScroll < 100 && scrollPos > 100) {
                                    window.scrollTo({ top: scrollPos, behavior: 'auto' });
                                }
                            };
                            
                            window.addEventListener('scroll', scrollMonitorListener, { passive: true });
                            
                            scrollMonitorTimeout = setTimeout(() => {
                                if (scrollMonitorListener) {
                                    window.removeEventListener('scroll', scrollMonitorListener);
                                }
                                sessionStorage.removeItem(scrollKey);
                                sessionStorage.removeItem(restoreFlagKey);
                                if (window.history.scrollRestoration === 'manual') {
                                    window.history.scrollRestoration = originalScrollRestoration || 'auto';
                                }
                            }, 200);
                        }
                    } else {
                        // Scroll was reset, try again
                        restoreScroll(attempt + 1);
                    }
                }, 50);
            };
            
            // Start restoration attempts with multiple strategies
            // Strategy 1: Immediate
            restoreScroll(1);
            
            // Strategy 2: After paint
            requestAnimationFrame(() => {
                restoreScroll(2);
            });
            
            // Strategy 3: After next paint
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    restoreScroll(3);
                });
            });
            
            // Strategy 4: After DOM is stable (wait for images/content to load)
            setTimeout(() => {
                restoreScroll(4);
            }, 100);
            
            // Strategy 5: Final backup
            setTimeout(() => {
                restoreScroll(5);
            }, 300);
            
            // Cleanup function
            return () => {
                if (scrollMonitorListener) {
                    window.removeEventListener('scroll', scrollMonitorListener);
                }
                if (scrollMonitorTimeout) {
                    clearTimeout(scrollMonitorTimeout);
                }
                // Keep scroll restoration disabled until restoration is complete
                // Don't restore here - let it restore after scroll is confirmed
            };
        }
    }, []); // Run once on mount

    // Fetch images when category changes
    useEffect(() => {
        // Wait for category to resolve (not null)
        if (category === null) {
            return;
        }

        // Check if category changed
        const categoryChanged = prevCategoryRef.current !== category;
        
        if (categoryChanged || prevCategoryRef.current === null) {
            // Fetch images with category filter
            // Don't use _refresh: true - let cache handle it for instant display
            const categoryParam = category === 'all' ? undefined : category;
            fetchImages({ 
                page: 1, 
                category: categoryParam,
                // Only refresh on initial load, not when switching categories
                _refresh: prevCategoryRef.current === null
            });
            prevCategoryRef.current = category;
        }
    }, [category, fetchImages]);

    // Load data callback for NoFlashGrid
    const loadData = useCallback(async () => {
        const categoryParam = category === 'all' || !category ? undefined : category;
        await fetchImages({ 
            page: 1, 
            category: categoryParam,
            _refresh: true // Only refresh when explicitly loading data
        });
    }, [fetchImages, category]);

    // Handle image click - navigate to ImagePage with modal-style
    const handleImageClick = useCallback((image: Image, index: number) => {
        // Save scroll position before navigating
        if (typeof window !== 'undefined') {
            const scrollKey = 'imageGridScrollPosition';
            if (!sessionStorage.getItem(scrollKey)) {
                sessionStorage.setItem(scrollKey, window.scrollY.toString());
            }
        }
        
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        navigate(`/photos/${slug}`, {
            state: {
                images,
                fromGrid: true,
                background: { pathname: actualLocation?.pathname || '/' }
            }
        });
    }, [navigate, images, actualLocation]);

    return (
        <>
            <Header />
            <CategoryNavigation />
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