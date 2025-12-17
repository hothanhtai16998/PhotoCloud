import { useState, useEffect, useCallback } from 'react';
import { searchConfig } from '@/config/searchConfig';
import { appConfig } from '@/config/appConfig';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

interface UseSearchHistoryReturn {
  searchHistory: SearchHistoryItem[];
  saveToHistory: (query: string) => void;
  clearHistory: () => void;
}

/**
 * Custom hook to manage search history in localStorage
 */
export function useSearchHistory(): UseSearchHistoryReturn {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(appConfig.storage.searchHistoryKey);
      if (stored) {
        const history = JSON.parse(stored) as SearchHistoryItem[];
        setSearchHistory(history.slice(0, searchConfig.maxHistoryItems));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  // Save a query to history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    try {
      const stored = localStorage.getItem(appConfig.storage.searchHistoryKey);
      let history: SearchHistoryItem[] = stored ? JSON.parse(stored) : [];

      // Remove duplicates and add to beginning
      history = history.filter(
        (item) => item.query.toLowerCase() !== query.toLowerCase()
      );
      history.unshift({ query: query.trim(), timestamp: Date.now() });

      // Keep only max history items
      history = history.slice(0, searchConfig.maxHistoryItems);

      localStorage.setItem(
        appConfig.storage.searchHistoryKey,
        JSON.stringify(history)
      );
      setSearchHistory(history);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    localStorage.removeItem(appConfig.storage.searchHistoryKey);
    setSearchHistory([]);
  }, []);

  return {
    searchHistory,
    saveToHistory,
    clearHistory,
  };
}
