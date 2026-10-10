import { useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void | Promise<void>;
  progressKey: unknown;
  root?: HTMLElement | null;
  rootMargin?: string;
  threshold?: number;
  delay?: number;
}

export const useInfiniteScroll = ({
  hasMore, isLoading = false, onLoadMore, progressKey,
  root = null, rootMargin = '400px', threshold = 0, delay = 100,
}: UseInfiniteScrollOptions) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<object | null>(null);
  const attemptedRef = useRef<unknown>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: object | null = null;

    const observer = new IntersectionObserver(entries => {
      if (disposed) return;
      const entry = entries[0];
      if (!entry) return;
      if (!entry.isIntersecting) {
        // Re-entering the viewport permits an explicit retry after a failed page.
        attemptedRef.current = null;
        return;
      }
      if (isLoading || requestRef.current || attemptedRef.current === progressKey) return;
      pending = {};
      requestRef.current = pending;
      setIsLoadingMore(true);
      timer = setTimeout(async () => {
        timer = undefined;
        const request = pending;
        pending = null;
        attemptedRef.current = progressKey;
        try {
          await onLoadMore();
        } catch {
          // Retain the page guard; a failed request must not create a retry loop.
        } finally {
          if (requestRef.current === request) requestRef.current = null;
          if (mountedRef.current) {
            setIsLoadingMore(false);
            setRevision(value => value + 1);
          }
        }
      }, Math.max(0, delay));
    }, { root, rootMargin, threshold });
    observer.observe(target);
    return () => {
      disposed = true;
      observer.disconnect();
      if (timer !== undefined) {
        clearTimeout(timer);
        if (requestRef.current === pending) requestRef.current = null;
      }
    };
  }, [hasMore, isLoading, onLoadMore, progressKey, root, rootMargin, threshold, delay, revision]);

  // A request remains locked through loading/callback changes, but its visual
  // state follows the current render and cannot be left behind by stale cleanup.
  useEffect(() => {
    if (!requestRef.current) setIsLoadingMore(false);
  }, [hasMore, isLoading, progressKey, onLoadMore]);

  return { loadMoreRef, isLoadingMore };
};

