import { useEffect, lazy, Suspense, useContext, useCallback, useRef } from "react";
import Header from "../components/Header";
import './HomePage.css';
import { useImageStore } from "@/stores/useImageStore";
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { triggerSearchFocus } from "@/utils/searchFocusEvent";
import { ActualLocationContext } from "@/contexts/ActualLocationContext";
import CategoryNavigation from "@/components/CategoryNavigation";
import { NoFlashGrid } from "@/components/NoFlashGrid";
import { useImageGridCategory } from "./ImageGrid/hooks/useImageGridCategory";

// Lazy load Slider - conditionally rendered
const Slider = lazy(() => import("@/components/Slider"));

function HomePage() {
    const { currentSearch, images, loading, fetchImages } = useImageStore();
    const actualLocation = useContext(ActualLocationContext);
    const { category } = useImageGridCategory();
    const prevCategoryRef = useRef<string | null>(null);

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
            const categoryParam = category === 'all' ? undefined : category;
            fetchImages({ 
                page: 1, 
                category: categoryParam,
                _refresh: true 
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
            _refresh: true 
        });
    }, [fetchImages, category]);

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
                <CategoryNavigation />
                <NoFlashGrid
                    images={images}
                    loading={loading}
                    onLoadData={loadData}
                />
            </main>
        </>
    );
}

export default HomePage;