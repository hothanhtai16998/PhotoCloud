import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { categoryService, type Category } from '@/services/categoryService';
import { imageService } from '@/services/imageService';
import { searchService, type SearchSuggestion } from '@/services/searchService';
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
  searchHistory: SearchHistoryItem[],
  enabled = true
): UseSearchSuggestionsReturn {
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [apiResult, setApiResult] = useState<{ query: string; suggestions: SearchSuggestion[] } | null>(null);
  const query = searchQuery.trim();
  const apiSuggestions = useMemo(() => apiResult?.query === query ? apiResult.suggestions : [], [apiResult, query]);
  const loadingSuggestions = enabled && Boolean(query) && apiResult?.query !== query;
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>(
    []
  );
  const initialDataRef = useRef<Promise<[Category[], string[], SearchSuggestion[]]> | null>(null);
  const initialDataLoadedRef = useRef(false);

  // Load supporting data only when the suggestions dropdown is needed.
  useEffect(() => {
    if (!enabled || initialDataLoadedRef.current) return;
    let active = true;
    if (!initialDataRef.current) {
      initialDataRef.current = Promise.all([
        categoryService.fetchCategories(), imageService.fetchLocations(),
        searchService.getPopularSearches(),
      ]);
    }
    initialDataRef.current.then(([categoryData, locationData, popular]) => {
      if (!active) return;
      initialDataLoadedRef.current = true;
      setCategories(categoryData.map(cat => cat.name));
      setLocations(locationData);
      setPopularSearches(popular);
    }).catch(() => {
      initialDataRef.current = null;
    });
    return () => { active = false; };
  }, [enabled]);

  // Own each request and prevent older results from updating a newer query.
  useEffect(() => {
    const query = searchQuery.trim();
    if (!enabled || !query) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await searchService.getSuggestions(query, 10, controller.signal);
        if (active) setApiResult({ query, suggestions: results });
      } catch (error) {
        if (active && !axios.isCancel(error)) setApiResult({ query, suggestions: [] });
      }
    }, searchConfig.suggestionsDebounceMs);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, enabled]);

  // Merge and filter suggestions
  const filteredSuggestions = useMemo(() => {
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
      categories.slice(0, Math.max(0, 5 - result.length)).forEach((s) => {
        if (!seen.has(s.toLowerCase())) {
          result.push({ type: 'category', value: s });
          seen.add(s.toLowerCase());
        }
      });

      return [
        ...result.filter(item => item.type === 'history').slice(0, 5),
        ...result.filter(item => item.type !== 'history').slice(0, 5),
      ];
    }
  }, [searchQuery, apiSuggestions, locations, categories, searchHistory, popularSearches]);

  return {
    suggestions: filteredSuggestions,
    loadingSuggestions,
    categories,
    locations,
  };
}
