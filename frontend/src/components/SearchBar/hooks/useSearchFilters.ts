import { create } from 'zustand';
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

export const DEFAULT_FILTERS: SearchFiltersType = {
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

// Read persisted preferences once; every consumer shares the same snapshot.
function loadFiltersFromStorage(): SearchFiltersType {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(searchConfig.filtersStorageKey) || 'null');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return DEFAULT_FILTERS;
    const result = { ...DEFAULT_FILTERS };
    for (const key of Object.keys(DEFAULT_FILTERS) as (keyof SearchFiltersType)[]) {
      const value = (stored as Record<string, unknown>)[key];
      if (key === 'orientation') {
        if (['all', 'landscape', 'portrait', 'square'].includes(value as string)) result.orientation = value as SearchFiltersType['orientation'];
      } else if (key === 'sortBy') {
        if (['date', 'views', 'downloads', 'favorites', 'relevance'].includes(value as string)) result.sortBy = value as SearchFiltersType['sortBy'];
      } else if (key === 'order') {
        if (value === 'asc' || value === 'desc') result.order = value;
      } else if (['focalLengthMin', 'focalLengthMax', 'apertureMin', 'apertureMax', 'isoMin', 'isoMax', 'minWidth', 'minHeight'].includes(key)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) Object.assign(result, { [key]: value });
      } else if (typeof value === 'string') {
        Object.assign(result, { [key]: value });
      }
    }
    return result;
  } catch {
    return DEFAULT_FILTERS;
  }
}

export const useSearchFilters = create<UseSearchFiltersReturn>((set) => ({
  filters: loadFiltersFromStorage(),
  setFilters: (filters) => {
    set({ filters });
    try {
      localStorage.setItem(searchConfig.filtersStorageKey, JSON.stringify(filters));
    } catch {
      // Preferences still work in memory when storage is unavailable.
    }
  },
  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
    try {
      localStorage.removeItem(searchConfig.filtersStorageKey);
    } catch {
      // Reset must also work when storage is unavailable.
    }
    window.dispatchEvent(new Event('filterChange'));
  },
}));
