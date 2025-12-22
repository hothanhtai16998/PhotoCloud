import { useEffect, useLayoutEffect, useContext, useCallback, useRef, useMemo, useState } from "react";
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
import type { Pagination } from "@/types/common";
import { useIsMobile } from "@/hooks/useIsMobile";
import { saveScrollPosition, prepareModalNavigationState, setModalActive, isPageRefresh } from "@/utils/modalNavigation";
import { syncGlobalLoading } from "@/stores/helpers/syncGlobalLoading";
import { preloadImage } from "@/components/NoFlashGrid/utils/imagePreloader";
import { isCancelledRequest } from "@/utils/errorHandler";
import './SearchResultsPage.css';

function SearchResultsPage() {
    const { query } = useParams<{ query: string }>();
    const { images, loading, pagination, fetchImages, currentSearch } = useImageStore();
    const actualLocation = useContext(ActualLocationContext);
    const { filters } = useSearchFilters();
    const navigate = useNavigate();
    const filtersRef = useRef(filters);
    const isMobile = useIsMobile();
    const abortControllerRef = useRef<AbortController | null>(null);
    const isFetchingRef = useRef(false);
    const previousQueryRef = useRef<string | undefined>(undefined);
    const [imagesReady, setImagesReady] = useState(false);
    // Track last fetch time for each search query (cache for 1 minute)
    const searchCacheRef = useRef<Map<string, number>>(new Map());
    // Cache images by query to show them immediately when searching again
    const imagesCacheRef = useRef<Map<string, { images: Image[]; pagination: Pagination | null }>>(new Map());
    const STALE_THRESHOLD = 1 * 60 * 1000; // 1 minute
    
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
    
    // Reset loading state if we have cached data (like other pages)
    useLayoutEffect(() => {
        // If we have images for the current query and it's not a refresh, reset loading
        if (images.length > 0 && previousQueryRef.current && query) {
            try {
                const decodedQuery = decodeURIComponent(query);
                if (decodedQuery === previousQueryRef.current) {
                    // Check if data is fresh
                    const lastFetched = searchCacheRef.current.get(decodedQuery);
                    const isDataFresh = lastFetched && (Date.now() - lastFetched) < STALE_THRESHOLD;
                    const isRefresh = isPageRefresh();
                    
                    // If data is fresh and not a refresh, we can use cache without loading
                    if (isDataFresh && !isRefresh && loading) {
                        // Note: useImageStore doesn't have resetLoading, so we'll handle this differently
                        // The loading state will be false once images are set in the store
                    }
                }
            } catch {
                // Invalid query encoding, ignore
            }
        }
    }, [images.length, query, loading]);
    
    // Sync loading state to global loading store
    const isPageLoading = useMemo(() => {
        // Only show loading if we don't have cached data
        if (images.length > 0 && previousQueryRef.current && query) {
            try {
                const decodedQuery = decodeURIComponent(query);
                if (decodedQuery === previousQueryRef.current) {
                    const lastFetched = searchCacheRef.current.get(decodedQuery);
                    const isDataFresh = lastFetched && (Date.now() - lastFetched) < STALE_THRESHOLD;
                    const isRefresh = isPageRefresh();
                    
                    // If data is fresh and not a refresh, don't show loading
                    if (isDataFresh && !isRefresh) {
                        return false;
                    }
                }
            } catch {
                // Invalid query encoding, use default logic
            }
        }
        return loading && images.length === 0;
    }, [loading, images.length, query]);
    
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

    // Reset imagesReady when query changes to prevent showing stale images
    // But don't reset if we're using cached data for the same query
    useEffect(() => {
        if (query && previousQueryRef.current) {
            try {
                const decodedQuery = decodeURIComponent(query);
                // Check if we have cached data - if so, don't reset imagesReady
                const cachedImagesData = imagesCacheRef.current.get(decodedQuery);
                const lastFetched = searchCacheRef.current.get(decodedQuery);
                const isDataFresh = lastFetched && (Date.now() - lastFetched) < STALE_THRESHOLD;
                
                // Only reset if query actually changed AND we don't have fresh cached data
                if (decodedQuery !== previousQueryRef.current && !(cachedImagesData && isDataFresh)) {
                    setImagesReady(false);
                }
            } catch {
                // Invalid encoding, reset to be safe
                setImagesReady(false);
            }
        } else {
            setImagesReady(false);
        }
    }, [query]);

    // Fetch images when query changes
    useEffect(() => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Reset imagesReady immediately when query changes
        setImagesReady(false);
        
        // Wait a bit for React Router to parse params on initial mount
        const checkQuery = () => {
            if (!query) {
                // Only redirect if we're sure there's no query after checking
                // This prevents premature redirects during navigation
                navigate('/', { replace: true });
                return;
            }
            
            let decodedQuery: string;
            try {
                decodedQuery = decodeURIComponent(query);
            } catch (error) {
                // Invalid URL encoding, redirect to homepage
                console.warn('Invalid search query encoding:', error);
                navigate('/', { replace: true });
                return;
            }
            
            // Check if this is a page refresh - always fetch on refresh
            const isRefresh = isPageRefresh();
            
            // Prevent duplicate simultaneous requests
            if (isFetchingRef.current) {
                return;
            }
            
            // Check if we have cached images for this query
            const cachedImagesData = imagesCacheRef.current.get(decodedQuery);
            const lastFetched = searchCacheRef.current.get(decodedQuery);
            const isDataFresh = lastFetched && (Date.now() - lastFetched) < STALE_THRESHOLD;
            
            // If we have cached images and data is fresh, restore them immediately
            if (cachedImagesData && cachedImagesData.images.length > 0 && isDataFresh && !isRefresh) {
                // Restore cached images to store immediately for instant display
                // Use synchronous state update to avoid any delay
                useImageStore.setState({
                    images: cachedImagesData.images,
                    pagination: cachedImagesData.pagination,
                    currentSearch: decodedQuery,
                    loading: false,
                });
                
                // Update previousQueryRef to track this query
                previousQueryRef.current = decodedQuery;
                
                // Mark as ready immediately - no delay needed for cached data
                // Images are already loaded in browser cache, so they'll display instantly
                setImagesReady(true);
                setIsTransitioning(false);
                
                // Return early to avoid unnecessary fetch
                return;
            }
            
            previousQueryRef.current = decodedQuery;
            isFetchingRef.current = true;
            
            // Create new abort controller for this request
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;
            
            const fetchParams = buildFilterParams(filtersRef.current, {
                search: decodedQuery,
                page: 1,
                limit: 20, // Fetch 20 images per page for better performance, infinite scroll will load more
                _refresh: isRefresh, // Force refresh on page reload, use cache otherwise
            });
            
            // Fetch images
            fetchImages(fetchParams, signal)
                .then(() => {
                    // Update cache timestamp for this query
                    searchCacheRef.current.set(decodedQuery, Date.now());
                    
                    // Cache the images and pagination for this query
                    const storeState = useImageStore.getState();
                    if (storeState.images.length > 0 && storeState.currentSearch === decodedQuery) {
                        imagesCacheRef.current.set(decodedQuery, {
                            images: [...storeState.images], // Create a copy
                            pagination: storeState.pagination ? { ...storeState.pagination } : null,
                        });
                    }
                })
                .catch((error) => {
                    // Only log if not aborted
                    if (!isCancelledRequest(error)) {
                        console.error('SearchResultsPage: Fetch error:', error);
                    }
                })
                .finally(() => {
                    isFetchingRef.current = false;
                });
        };
        
        // Small delay on initial mount to allow React Router to parse params
        const timer = setTimeout(checkQuery, 50);
        
        return () => {
            clearTimeout(timer);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            isFetchingRef.current = false;
        };
    }, [query, fetchImages, navigate]);
    
    // Prevent scroll jump and layout shift when navigating to search results
    // Use useLayoutEffect to run synchronously before paint to prevent visual jump
    useLayoutEffect(() => {
        // Immediately scroll to top when query changes to prevent visual jump
        if (query) {
            // Force immediate scroll without animation
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [query]);
    
    // Track if we're in a navigation transition to prevent flashing
    const [isTransitioning, setIsTransitioning] = useState(true);
    const prevQueryRef = useRef<string | undefined>(query);
    const hasCachedDataRef = useRef(false);
    
    // CRITICAL: Set transitioning immediately when query changes (synchronously)
    // This must happen BEFORE any render to prevent showing old content
    useLayoutEffect(() => {
        if (prevQueryRef.current !== query) {
            const oldQuery = prevQueryRef.current;
            prevQueryRef.current = query;
            
            // Immediately hide content and clear old images
            setIsTransitioning(true);
            setImagesReady(false);
            
            // Clear old images IMMEDIATELY to prevent showing stale content
            // Do this synchronously before any render
            if (oldQuery && oldQuery !== query) {
                useImageStore.setState({
                    images: [],
                    loading: true,
                });
            }
            
            // Check for cached data
            if (query) {
                try {
                    const decodedQuery = decodeURIComponent(query);
                    const cachedImagesData = imagesCacheRef.current.get(decodedQuery);
                    const lastFetched = searchCacheRef.current.get(decodedQuery);
                    const isDataFresh = lastFetched && (Date.now() - lastFetched) < STALE_THRESHOLD;
                    
                    // If we have cached data, restore immediately
                    if (cachedImagesData && cachedImagesData.images.length > 0 && isDataFresh) {
                        hasCachedDataRef.current = true;
                        // Restore cached data synchronously
                        useImageStore.setState({
                            images: cachedImagesData.images,
                            pagination: cachedImagesData.pagination,
                            currentSearch: decodedQuery,
                            loading: false,
                        });
                        setImagesReady(true);
                        setIsTransitioning(false);
                        return;
                    }
                } catch {
                    // Invalid encoding
                }
            }
            
            // No cached data
            hasCachedDataRef.current = false;
        }
    }, [query]);
    
    // Stop transitioning when content is ready (for non-cached data)
    useLayoutEffect(() => {
        // Only stop transitioning if we don't have cached data and content is ready
        if (!hasCachedDataRef.current && !loading && images.length > 0 && imagesReady) {
            const timer = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsTransitioning(false);
                });
            });
            return () => cancelAnimationFrame(timer);
        } else if (!hasCachedDataRef.current && !loading && images.length === 0 && imagesReady) {
            // Empty state is ready
            setIsTransitioning(false);
        }
    }, [loading, images.length, imagesReady]);

    // Preload all images before showing grid to avoid flashing
    useEffect(() => {
        // Don't preload if we're still loading (wait for fetch to complete)
        if (loading && images.length === 0) {
            setImagesReady(false);
            return;
        }

        if (!images || images.length === 0) {
            // If no images and not loading, wait a bit then mark as ready to show empty state
            // This prevents empty state from flashing while spinner is still visible
            if (!loading) {
                const timer = setTimeout(() => {
                    setImagesReady(true);
                }, 150);
                return () => clearTimeout(timer);
            }
            return;
        }
        
        // Check if images are already ready (from cache restore)
        // If imagesReady is already true, skip preload to avoid delay and flashing
        if (imagesReady) {
            return;
        }
        
        // If we have images and not loading (or loading but images exist from cache), start preloading
        // Always reset imagesReady to ensure we go through the preload process
        // This ensures images are properly decoded even if they're cached
        setImagesReady(false);

        let cancelled = false;

        const sources = images
            .map((img) => img.regularUrl || img.imageUrl || img.smallUrl || img.thumbnailUrl)
            .filter((src): src is string => Boolean(src));

        if (sources.length === 0) {
            // No valid image sources, wait a bit then mark as ready
            const timer = setTimeout(() => {
                if (!cancelled) {
                    setImagesReady(true);
                }
            }, 150);
            return () => {
                cancelled = true;
                clearTimeout(timer);
            };
        }

        // Preload all images with decode to ensure they're fully ready before showing grid
        // Use skipDecode = false to ensure images are fully decoded and ready for display
        Promise.all(sources.map((src) => preloadImage(src, false).catch(() => {
            // Even if decode fails, continue - image is still loaded
            return src;
        }))).then(() => {
            // Wait for next frame to ensure DOM is ready, then mark as ready
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!cancelled) {
                        setImagesReady(true);
                    }
                });
            });
        });

        return () => {
            cancelled = true;
        };
    }, [images, loading]);

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
            <main className={`search-results-page ${isTransitioning ? 'transitioning' : ''}`}>
                {/* Search Query Heading and Tags - positioned right below navigation bar */}
                {/* Always render to reserve space and prevent layout shift */}
                <div className="search-results-content">
                    <h1 className="search-results-heading">{decodedQuery || '\u00A0'}</h1>
                    {decodedQuery && <SearchResultsTags query={decodedQuery} />}
                </div>
                
                <ActiveFiltersIndicator filters={filters} />
                {/* GlobalLoadingOverlay handles the spinner when loading */}
                {/* Grid container wrapper - maintains consistent position to prevent layout shift */}
                {isTransitioning ? (
                    /* Hide all content during transition to prevent flashing */
                    <div className="search-results-grid-wrapper" style={{ minHeight: '500px' }} />
                ) : loading && images.length === 0 ? (
                    /* GlobalLoadingOverlay handles the spinner - just reserve space */
                    <div className="search-results-grid-wrapper" style={{ minHeight: '500px' }} />
                ) : !loading && images.length === 0 && imagesReady ? (
                    /* Only show empty state when loading is complete, no images, and ready state is set */
                    <div className="search-results-empty">
                        <p className="search-results-empty-text">No images found for "{decodedQuery}"</p>
                        <p className="search-results-empty-hint">Try a different search term</p>
                    </div>
                ) : images.length > 0 && imagesReady ? (
                    /* Only show grid when images are fully preloaded - use key to force remount on query change */
                    <div className="search-results-grid-container" key={decodedQuery}>
                        <NoFlashGrid
                            key={decodedQuery}
                            images={images}
                            loading={loading}
                            onLoadData={loadData}
                            onImageClick={handleImageClick}
                            pagination={pagination}
                            onLoadMore={loadMore}
                        />
                    </div>
                ) : (
                    /* While preloading images, show grid wrapper to reserve space */
                    <div className="search-results-grid-wrapper" style={{ minHeight: '500px' }} />
                )}
            </main>
        </>
    );
}

export default SearchResultsPage;
