import { useState, useRef, useCallback } from 'react';
import { searchConfig } from '@/config/searchConfig';
import { appConfig } from '@/config/appConfig';
import { getStoredJson, setStoredJson, removeStoredItem } from '@/utils/safeStorage';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

interface UseSearchHistoryReturn {
  searchHistory: SearchHistoryItem[];
  saveToHistory: (query: string) => void;
  clearHistory: () => void;
}

function loadHistory(): SearchHistoryItem[] {
  const stored = getStoredJson<unknown>(appConfig.storage.searchHistoryKey, []);
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const history: SearchHistoryItem[] = [];
  for (const item of stored) {
    if (!item || typeof item.query !== 'string' ||
        typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp)) continue;
    const query = item.query.trim();
    const key = query.toLowerCase();
    if (!query || seen.has(key)) continue;
    seen.add(key);
    history.push({ query, timestamp: item.timestamp });
    if (history.length === searchConfig.maxHistoryItems) break;
  }
  return history;
}

/** Recent searches remain usable even when browser storage is unavailable. */
export function useSearchHistory(): UseSearchHistoryReturn {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(loadHistory);
  const historyRef = useRef(searchHistory);

  const saveToHistory = useCallback((value: string) => {
    const query = value.trim();
    if (!query) return;
    const key = query.toLowerCase();
    const history = [
      { query, timestamp: Date.now() },
      ...historyRef.current.filter(item => item.query.toLowerCase() !== key),
    ].slice(0, searchConfig.maxHistoryItems);
    historyRef.current = history;
    setSearchHistory(history);
    setStoredJson(appConfig.storage.searchHistoryKey, history);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setSearchHistory([]);
    removeStoredItem(appConfig.storage.searchHistoryKey);
  }, []);

  return { searchHistory, saveToHistory, clearHistory };
}
