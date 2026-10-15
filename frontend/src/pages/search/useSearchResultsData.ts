import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useImageStore } from '@/stores/useImageStore';
import { useSearchFilters } from '@/components/SearchBar/hooks/useSearchFilters';
import { buildFilterParams } from '@/utils/buildFilterParams';
import type { FetchImagesParams } from '@/types/image';

/** The page owns requests; SearchBar only edits the shared filter state. */
export function useSearchResultsData(query: string) {
  const images = useImageStore(state => state.images);
  const loading = useImageStore(state => state.loading);
  const error = useImageStore(state => state.error);
  const pagination = useImageStore(state => state.pagination);
  const currentSearch = useImageStore(state => state.currentSearch);
  const fetchImages = useImageStore(state => state.fetchImages);
  const filters = useSearchFilters(state => state.filters);
  const [loadedKey, setLoadedKey] = useState('');
  const [requestedPage, setRequestedPage] = useState(1);
  const [networkInterrupted, setNetworkInterrupted] = useState(() => !navigator.onLine);
  const requestController = useRef<AbortController | null>(null);
  useEffect(() => {
    const offline = () => {
      setNetworkInterrupted(true);
      requestController.current?.abort();
    };
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('offline', offline);
      requestController.current?.abort();
    };
  }, []);
  const params = useMemo<FetchImagesParams>(() => ({
    ...buildFilterParams(filters, { search: query, page: 1, limit: 20 }),
    sortBy: filters.sortBy || 'date',
    order: filters.order || 'desc',
  }), [query, filters]);
  const key = JSON.stringify(params);

  const request = useCallback(async (page: number, refresh = false) => {
    if (!navigator.onLine) { setNetworkInterrupted(true); return; }
    const controller = new AbortController();
    requestController.current?.abort();
    requestController.current = controller;
    await fetchImages({ ...params, page, _refresh: refresh }, controller.signal);
    const state = useImageStore.getState();
    if (!controller.signal.aborted && navigator.onLine && !state.error && state.currentSearch === query) {
      setLoadedKey(key);
      setNetworkInterrupted(false);
    }
  }, [params, key, query, fetchImages]);

  useEffect(() => {
    if (!query) return;
    setRequestedPage(1);
    void request(1);
    return () => requestController.current?.abort();
  }, [query, request]);

  const refresh = useCallback(async () => {
    setRequestedPage(1);
    await request(1, true);
  }, [request]);

  const retry = useCallback(async () => {
    if (useImageStore.getState().loading) return;
    await request(requestedPage, true);
  }, [requestedPage, request]);

  const loadMore = useCallback(async () => {
    const state = useImageStore.getState();
    if (networkInterrupted || state.loading || state.error || !state.pagination || state.currentSearch !== query ||
      state.pagination.page >= state.pagination.pages) return;
    const next = state.pagination.page + 1;
    setRequestedPage(next);
    await request(next);
  }, [query, networkInterrupted, request]);

  const ready = loadedKey === key && currentSearch === query;
  return { images: ready ? images : [], loading,
    error: networkInterrupted ? 'Kết nối mạng bị gián đoạn. Hãy bật mạng rồi bấm thử lại để cập nhật kết quả.' : error,
    pagination: ready ? pagination : null,
    filters, ready, retry, refresh, loadMore };
}
