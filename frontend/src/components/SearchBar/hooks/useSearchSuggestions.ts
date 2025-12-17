import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { categoryService, type Category } from '@/services/categoryService';
import { imageService } from '@/services/imageService';
import { searchService, type SearchSuggestion } from '@/services/searchService';
import { useRequestCancellationOnChange } from '@/hooks/useRequestCancellation';
import { searchConfig } from '@/config/searchConfig';
import type { SearchHistoryItem } from './useSearchHistory';

export interface SuggestionItem {
  type: 'history' | 'location' | 'category' | 'api' | 'popular';
  value: string;
  apiType?: string;
}

interface UseSearchSuggestionsReturn {
  suggestions: SuggestionItem[];
  loadingSuggestions: boolean;
  categories: string[];
  locations: string[];
}

/**
 * Custom hook to manage search suggestions (API, local categories, locations)
 */
export function useSearchSuggestions(
  searchQuery: string,
  searchHistory: SearchHistoryItem[]
): UseSearchSuggestionsReturn {
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [apiSuggestions, setApiSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>(
    []
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Cancel previous requests when search query changes
  const cancelSignal = useRequestCancellationOnChange([searchQuery]);

  // Load categories, locations, and popular searches on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [categoriesData, locationsData, popular] = await Promise.all([
          categoryService.fetchCategories(),
          imageService.fetchLocations(),
          searchService.getPopularSearches(),
        ]);
        setCategories(categoriesData.map((cat: Category) => cat.name));
        setLocations(locationsData);
        setPopularSearches(popular);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      }
    };
    loadInitialData();
  }, []);

  // Fetch API suggestions when user types (debounced)
  useEffect(() => {
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current);
    }

    const query = searchQuery.trim();

    if (query.length >= 1) {
      setLoadingSuggestions(true);
      suggestionsDebounceRef.current = setTimeout(async () => {
        try {
          const apiResults = await searchService.getSuggestions(
            query,
            10,
            cancelSignal
          );
          setApiSuggestions(apiResults);
        } catch (error) {
          if (
            axios.isCancel(error) ||
            (error as { code?: string })?.code === 'ERR_CANCELED'
          ) {
            return;
          }
          console.error('Failed to fetch API suggestions:', error);
          setApiSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
        }
      }, searchConfig.suggestionsDebounceMs);
    } else {
      setApiSuggestions([]);
      setLoadingSuggestions(false);
    }

    return () => {
      if (suggestionsDebounceRef.current) {
        clearTimeout(suggestionsDebounceRef.current);
      }
    };
  }, [searchQuery, cancelSignal]);

  // Merge and filter suggestions
  const filteredSuggestions = (() => {
    const query = searchQuery.trim().toLowerCase();
    const seen = new Set<string>();
    const result: SuggestionItem[] = [];

    if (query) {
      // When user is typing, prioritize API suggestions
      apiSuggestions.forEach((suggestion) => {
        const key = suggestion.text.toLowerCase();
        if (!seen.has(key)) {
          result.push({
            type: suggestion.type === 'location' ? 'location' : 'api',
            value: suggestion.text,
            apiType: suggestion.type,
          });
          seen.add(key);
        }
      });

      // Local matching locations
      locations
        .filter(
          (loc) =>
            loc.toLowerCase().includes(query) && !seen.has(loc.toLowerCase())
        )
        .forEach((loc) => {
          result.push({ type: 'location', value: loc });
          seen.add(loc.toLowerCase());
        });

      // Local matching categories
      categories
        .filter(
          (s) => s.toLowerCase().includes(query) && !seen.has(s.toLowerCase())
        )
        .forEach((s) => {
          result.push({ type: 'category', value: s });
          seen.add(s.toLowerCase());
        });

      // Matching history
      searchHistory
        .filter(
          (item) =>
            item.query.toLowerCase().includes(query) &&
            !seen.has(item.query.toLowerCase())
        )
        .forEach((item) => {
          result.push({ type: 'history', value: item.query });
          seen.add(item.query.toLowerCase());
        });

      return result.slice(0, 10);
    } else {
      // When input is empty, show recent searches and popular
      searchHistory.forEach((item) => {
        if (!seen.has(item.query.toLowerCase())) {
          result.push({ type: 'history', value: item.query });
          seen.add(item.query.toLowerCase());
        }
      });

      // Popular searches from API
      popularSearches.forEach((suggestion) => {
        const key = suggestion.text.toLowerCase();
        if (!seen.has(key)) {
          result.push({
            type: suggestion.type === 'location' ? 'location' : 'popular',
            value: suggestion.text,
            apiType: suggestion.type,
          });
          seen.add(key);
        }
      });

      // Popular locations
      locations.slice(0, 3).forEach((loc) => {
        if (!seen.has(loc.toLowerCase())) {
          result.push({ type: 'location', value: loc });
          seen.add(loc.toLowerCase());
        }
      });

      // Popular categories
      categories.slice(0, 5 - result.length).forEach((s) => {
        if (!seen.has(s.toLowerCase())) {
          result.push({ type: 'category', value: s });
          seen.add(s.toLowerCase());
        }
      });

      return result.slice(0, 10);
    }
  })();

  return {
    suggestions: filteredSuggestions,
    loadingSuggestions,
    categories,
    locations,
  };
}
