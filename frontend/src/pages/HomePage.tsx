import { useEffect, lazy, Suspense, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        navigate(`/photos/${slug}`, {
            state: {
                images,
                fromGrid: true
            }
        });
    }, [navigate, images]);

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
                    onImageClick={handleImageClick}
                />
            </main>
        </>
    );
}

export default HomePage;