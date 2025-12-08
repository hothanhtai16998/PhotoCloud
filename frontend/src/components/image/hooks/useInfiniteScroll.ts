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

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading || isLoadingRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry &&
          entry.isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingRef.current
        ) {
          isLoadingRef.current = true;
          setIsLoadingMore(true);

          // Load more after a short delay for smooth UX
          const loadMore = async () => {
            try {
              await onLoadMore();
            } finally {
              setTimeout(() => {
                setIsLoadingMore(false);
                isLoadingRef.current = false;
              }, delay);
            }
          };

          loadMore();
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore, root, rootMargin, threshold, delay]);

  return {
    loadMoreRef,
    isLoadingMore,
  };
};

