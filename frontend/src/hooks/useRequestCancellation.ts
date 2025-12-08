import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for cancelling API requests when component unmounts or dependencies change
 * Prevents memory leaks and wasted bandwidth from cancelled requests
 * 
 * @returns AbortController signal that can be passed to axios requests
 * 
 * @example
 * const signal = useRequestCancellation();
 * const response = await api.get('/images', { signal });
 */
export function useRequestCancellation() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [signal, setSignal] = useState<AbortSignal | null>(null);

  // Initialize controller on mount
  useEffect(() => {
    abortControllerRef.current ??= new AbortController();
    setSignal(abortControllerRef.current.signal);

    // Cleanup: abort request when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return signal ?? new AbortController().signal;
}

/**
 * Custom hook for cancelling requests when specific dependencies change
 * Useful for search queries, filters, etc.
 * 
 * @param deps - Dependencies that should trigger request cancellation
 * @returns AbortController signal
 * 
 * @example
 * const signal = useRequestCancellationOnChange([searchQuery, category]);
 * const response = await api.get('/images', { params: { search: searchQuery }, signal });
 */
export function useRequestCancellationOnChange(deps: React.DependencyList) {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request when dependencies change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();

    // Cleanup: abort request when component unmounts or deps change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Return current signal - this is safe because refs don't cause re-renders
  // and the signal is stable for the lifetime of the controller
  return abortControllerRef.current?.signal;
}

/**
 * Create a new AbortController manually
 * Useful for one-off requests that need cancellation
 * 
 * @returns Object with signal and abort function
 * 
 * @example
 * const { signal, abort } = createAbortController();
 * const response = await api.get('/images', { signal });
 * // Later: abort(); to cancel the request
 */
export function createAbortController() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
  };
}

