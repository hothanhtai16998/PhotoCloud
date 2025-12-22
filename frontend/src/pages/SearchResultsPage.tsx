import { useEffect, useContext, useCallback, useRef, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useImageStore } from "@/stores/useImageStore";
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts";
import { triggerSearchFocus } from "@/utils/searchFocusEvent";
import { ActualLocationContext } from "@/contexts/ActualLocationContext";
import { NoFlashGrid } from "@/components/NoFlashGrid";
import { useSearchFilters } from "@/components/SearchBar/hooks/useSearchFilters";
import { buildFilterParams } from "@/utils/buildFilterParams";
import { ActiveFiltersIndicator } from "@/components/ActiveFiltersIndicator";
import { SearchResultsTags } from "@/components/SearchResultsTags";
import { generateImageSlug } from "@/lib/utils";
import type { Image } from "@/types/image";
import { useIsMobile } from "@/hooks/useIsMobile";
import { saveScrollPosition, prepareModalNavigationState, setModalActive } from "@/utils/modalNavigation";
import { syncGlobalLoading } from "@/stores/helpers/syncGlobalLoading";
import './SearchResultsPage.css';

function SearchResultsPage() {
    const { query } = useParams<{ query: string }>();
    const { images, loading, pagination, fetchImages } = useImageStore();
    const actualLocation = useContext(ActualLocationContext);
    const { filters } = useSearchFilters();
    const navigate = useNavigate();
    const filtersRef = useRef(filters);
    const isMobile = useIsMobile();
    
    // Keep filters ref updated so we always use latest filters in effects
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);
    
    const [gridHasLoaded, setGridHasLoaded] = useState(false);
    const initialLoadCompleteRef = useRef(false);
    
    // Track when grid finishes initial load
    useEffect(() => {
        if (!loading && !gridHasLoaded) {
            setGridHasLoaded(true);
        }
    }, [loading, gridHasLoaded]);
    
    // Mark initial load as complete when grid has finished
    useEffect(() => {
        if (gridHasLoaded && !initialLoadCompleteRef.current) {
            initialLoadCompleteRef.current = true;
        }
    }, [gridHasLoaded]);
    
    // Sync loading state to global loading store
    const isPageLoading = useMemo(() => {
        return loading && images.length === 0;
    }, [loading, images.length]);
    
    const prevLoadingRef = useRef(isPageLoading);
    
    useEffect(() => {
        if (prevLoadingRef.current !== isPageLoading) {
            prevLoadingRef.current = isPageLoading;
            syncGlobalLoading('searchResultsPage', isPageLoading);
        }
        
        return () => {
            syncGlobalLoading('searchResultsPage', false);
            prevLoadingRef.current = false;
        };
    }, [isPageLoading]);

    // Check if modal is open
    const isModalOpen = actualLocation?.pathname?.startsWith('/photos/') || false;

    // Global keyboard shortcuts
    useGlobalKeyboardShortcuts({
        onFocusSearch: triggerSearchFocus,
        isModalOpen,
    });

    // Fetch images when query changes
    useEffect(() => {
        if (!query) {
            // Only redirect if we're sure there's no query (not just initial mount)
            // Use a small delay to allow React Router to parse params
            const timer = setTimeout(() => {
                if (!query) {
                    navigate('/', { replace: true });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
        
        const fetchParams = buildFilterParams(filtersRef.current, {
            search: decodeURIComponent(query),
            page: 1,
            _refresh: false, // Use cache for instant display
        });
        
        fetchImages(fetchParams);
    }, [query, fetchImages, navigate]);

    // Load data callback for NoFlashGrid
    const loadData = useCallback(async () => {
        if (!query) return;
        const fetchParams = buildFilterParams(filters, {
            search: decodeURIComponent(query),
            page: 1,
            limit: 20,
            _refresh: true,
        });
        await fetchImages(fetchParams);
    }, [fetchImages, query, filters]);

    // Load more images (infinite scroll)
    const loadMore = useCallback(async () => {
        if (!query || !pagination || pagination.page >= pagination.pages) return;
        const fetchParams = buildFilterParams(filters, {
            search: decodeURIComponent(query),
            page: pagination.page + 1,
            limit: 20,
        });
        await fetchImages(fetchParams);
    }, [fetchImages, pagination, query, filters]);

    // Handle image click - navigate to ImagePage
    const handleImageClick = useCallback((image: Image, _index: number) => {
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        const targetPath = `/photos/${slug}`;
        
        // Mobile: full page navigation
        if (isMobile) {
            navigate(targetPath, {
                state: { images, image, fromGrid: true }
            });
            return;
        }
        
        // Desktop: modal-style with background
        saveScrollPosition();
        setModalActive();
        
        const backgroundLocation = {
            pathname: actualLocation?.pathname || '/',
            search: actualLocation?.search || '',
            hash: actualLocation?.hash || '',
            state: null,
            key: actualLocation?.key || 'default',
        };
        const modalState = prepareModalNavigationState(backgroundLocation);
        
        navigate(targetPath, {
            state: { ...modalState, images, image, fromGrid: true }
        });
    }, [navigate, images, actualLocation, isMobile]);

    // Don't render if no query (will redirect in useEffect)
    if (!query) {
        return null;
    }

    const decodedQuery = query ? decodeURIComponent(query) : '';

    return (
        <>
            <main className="search-results-page">
                {/* Search Query Heading and Tags - positioned right below navigation bar */}
                <div className="search-results-content">
                    <h1 className="search-results-heading">{decodedQuery}</h1>
                    <SearchResultsTags query={decodedQuery} />
                </div>
                
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

export default SearchResultsPage;
