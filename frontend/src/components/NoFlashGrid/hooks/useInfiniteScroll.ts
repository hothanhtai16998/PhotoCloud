import { useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void | Promise<void>;
  root?: HTMLElement | null;
  rootMargin?: string;
  threshold?: number;
  delay?: number;
}

/**
 * Custom hook for infinite scroll functionality
 * Uses IntersectionObserver to detect when element comes into view
 */
export const useInfiniteScroll = ({
  hasMore,
  isLoading = false,
  onLoadMore,
  root = null,
  rootMargin = '400px',
  threshold = 0,
  delay = 300,
}: UseInfiniteScrollOptions) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) {
      return;
    }

    // Disconnect existing observer if any
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Early return if conditions aren't met
        if (
          !entry ||
          !entry.isIntersecting ||
          !hasMore ||
          isLoading ||
          isLoadingRef.current
        ) {
          return;
        }

        // Set loading flag IMMEDIATELY to prevent race conditions
        // This must happen synchronously before any async operations
        isLoadingRef.current = true;
        setIsLoadingMore(true);

        // Load more after a short delay for smooth UX
        const loadMore = async () => {
          try {
            // Small delay before starting load to prevent rapid-fire requests
            if (delay > 0) {
              await new Promise(resolve => setTimeout(resolve, Math.min(delay, 100)));
            }
            await onLoadMore();
          } catch (error) {
            // Silently handle errors - let the component handle error states
            console.error('Error loading more:', error);
          } finally {
            // Reset loading state after a brief delay to prevent flickering
            setTimeout(() => {
              setIsLoadingMore(false);
              isLoadingRef.current = false;
            }, 100);
          }
        };

        loadMore();
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observerRef.current = observer;
    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
      observerRef.current = null;
      // Reset loading state on cleanup
      isLoadingRef.current = false;
    };
  }, [hasMore, isLoading, onLoadMore, root, rootMargin, threshold, delay]);

  return {
    loadMoreRef,
    isLoadingMore,
  };
};

