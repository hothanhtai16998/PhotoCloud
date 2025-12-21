import { useState, useCallback } from 'react';
import { searchConfig } from '@/config/searchConfig';

export interface SearchFiltersType {
  orientation: 'all' | 'landscape' | 'portrait' | 'square';
  color: string;
  dateFrom: string;
  dateTo: string;
  sortBy?: 'date' | 'views' | 'downloads' | 'favorites' | 'relevance';
  order?: 'asc' | 'desc';
  // EXIF filters
  cameraMake?: string;
  cameraModel?: string;
  focalLengthMin?: number;
  focalLengthMax?: number;
  apertureMin?: number;
  apertureMax?: number;
  isoMin?: number;
  isoMax?: number;
  // Image dimensions
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: string;
}

interface UseSearchFiltersReturn {
  filters: SearchFiltersType;
  setFilters: (filters: SearchFiltersType) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: SearchFiltersType = {
  orientation: 'all',
  color: 'all',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date',
  order: 'desc',
  // Advanced filters - explicitly set to undefined for consistency
  cameraMake: undefined,
  cameraModel: undefined,
  focalLengthMin: undefined,
  focalLengthMax: undefined,
  apertureMin: undefined,
  apertureMax: undefined,
  isoMin: undefined,
  isoMax: undefined,
  minWidth: undefined,
  minHeight: undefined,
  aspectRatio: undefined,
};

/**
 * Load filters from localStorage
 */
function loadFiltersFromStorage(): SearchFiltersType {
  try {
    const stored = localStorage.getItem(searchConfig.filtersStorageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Silently fail - use default filters
  }
  return DEFAULT_FILTERS;
}

/**
 * Custom hook to manage search filters with localStorage persistence
 */
export function useSearchFilters(): UseSearchFiltersReturn {
  const [filters, setFiltersState] = useState<SearchFiltersType>(
    loadFiltersFromStorage
  );

  const setFilters = useCallback((newFilters: SearchFiltersType) => {
    setFiltersState(newFilters);
    try {
      localStorage.setItem(
        searchConfig.filtersStorageKey,
        JSON.stringify(newFilters)
      );
      // NOTE: We do NOT dispatch filterChange event here because handleFiltersChange
      // already handles the fetch. The event is only needed for resetFilters when
      // called directly from ActiveFiltersIndicator.
    } catch {
      // Silently fail - filters will be lost on refresh
    }
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    try {
      localStorage.removeItem(searchConfig.filtersStorageKey);
      window.dispatchEvent(new Event('filterChange'));
    } catch {
      // Silently fail - filters already cleared from state
    }
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
  };
}
