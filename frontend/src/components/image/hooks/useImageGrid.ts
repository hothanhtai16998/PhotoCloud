import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteScroll } from './useInfiniteScroll';
import { useRequestCancellationOnChange } from '@/hooks/useRequestCancellation';
import { applyImageFilters } from '@/utils/imageFilters';
import type { Image } from '@/types/image';
import type { SearchFilters } from '@/components/SearchFilters';
import type { Pagination } from '@/types/common';

interface FetchImagesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  color?: string;
  tag?: string;
  _refresh?: boolean;
}

interface UseImageGridProps {
  displayImages: Image[];
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  images: Image[];
  loading: boolean;
  pagination: Pagination | null;
  currentSearch: string | undefined;
  currentCategory: string | undefined;
  currentLocation: string | undefined;
  fetchImages: (params?: FetchImagesParams, signal?: AbortSignal) => Promise<void>;
}

export const useImageGrid = ({
  displayImages,
  imageTypes,
  images,
  loading,
  pagination,
  currentSearch,
  currentCategory,
  currentLocation,
  fetchImages,
}: UseImageGridProps) => {
  const navigate = useNavigate();

  // Cancel requests when search/category/location changes
  const cancelSignal = useRequestCancellationOnChange([currentSearch, currentCategory, currentLocation]);

  // Load filters from localStorage - make it reactive
  const [filters, setFilters] = useState<SearchFilters>(() => {
    try {
      const stored = localStorage.getItem('photoApp_searchFilters');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
    return {
      orientation: 'all',
      color: 'all',
      dateFrom: '',
      dateTo: '',
    };
  });

  // Listen for storage changes (when filters are updated from SearchBar)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'photoApp_searchFilters') {
        try {
          if (e.newValue) {
            setFilters(JSON.parse(e.newValue));
          } else {
            setFilters({
              orientation: 'all',
              color: 'all',
              dateFrom: '',
              dateTo: '',
            });
          }
        } catch (error) {
          console.error('Failed to parse filters from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event from SearchBar (same window)
    const handleFilterChange = () => {
      try {
        const stored = localStorage.getItem('photoApp_searchFilters');
        if (stored) {
          setFilters(JSON.parse(stored));
        } else {
          setFilters({
            orientation: 'all',
            color: 'all',
            dateFrom: '',
            dateTo: '',
          });
        }
      } catch (error) {
        console.error('Failed to load filters:', error);
      }
    };

    window.addEventListener('filterChange', handleFilterChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filterChange', handleFilterChange);
    };
  }, []);

  // Initial load - only fetch if images are not already loaded
  useEffect(() => {
    // If images are already in the store, don't refetch to prevent flash
    if (images.length === 0 && !loading) {
      fetchImages({
        color: filters.color !== 'all' ? filters.color : undefined,
      }, cancelSignal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: Load more when reaching bottom
  const handleLoadMore = useCallback(async () => {
    if (!pagination || loading) return;

    await fetchImages({
      page: pagination.page + 1,
      search: currentSearch,
      category: currentCategory,
      location: currentLocation,
      color: filters.color !== 'all' ? filters.color : undefined,
    }, cancelSignal);
  }, [pagination, loading, currentSearch, currentCategory, currentLocation, filters.color, fetchImages, cancelSignal]);

  const { loadMoreRef } = useInfiniteScroll({
    hasMore: pagination ? pagination.page < pagination.pages : false,
    isLoading: loading,
    onLoadMore: handleLoadMore,
    rootMargin: '400px', // Start loading 400px before reaching bottom
  });

  // Apply filters to display images (may include old images during transition)
  const filteredImages = useMemo(() => {
    return applyImageFilters(displayImages, filters, imageTypes);
  }, [displayImages, filters, imageTypes]);

  // Search result count
  const searchResultCount = useMemo(() => {
    if (currentSearch && pagination) {
      return pagination.total;
    }
    return null;
  }, [currentSearch, pagination]);

  // Location result count
  const locationResultCount = useMemo(() => {
    if (currentLocation && pagination) {
      return pagination.total;
    }
    return null;
  }, [currentLocation, pagination]);

  return {
    filters,
    filteredImages,
    searchResultCount,
    locationResultCount,
    loadMoreRef,
    navigate,
    cancelSignal,
  };
};

