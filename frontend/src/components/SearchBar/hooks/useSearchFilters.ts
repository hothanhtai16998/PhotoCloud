import { useState, useCallback } from 'react';
import { searchConfig } from '@/config/searchConfig';

export interface SearchFiltersType {
  orientation: 'all' | 'landscape' | 'portrait' | 'square';
  color: string;
  dateFrom: string;
  dateTo: string;
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
  } catch (error) {
    console.error('Failed to load filters:', error);
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
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('filterChange'));
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    try {
      localStorage.removeItem(searchConfig.filtersStorageKey);
      window.dispatchEvent(new Event('filterChange'));
    } catch (error) {
      console.error('Failed to clear filters:', error);
    }
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
  };
}
