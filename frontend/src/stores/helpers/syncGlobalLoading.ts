import { useGlobalLoadingStore } from '../useGlobalLoadingStore';

/**
 * Helper to sync a store's loading state with the global loading store
 * 
 * Usage in stores:
 * ```typescript
 * set((draft) => {
 *   draft.loading = true;
 *   syncGlobalLoading('imageStore', true);
 * });
 * ```
 */
export function syncGlobalLoading(source: string, isLoading: boolean) {
  const { setLoading } = useGlobalLoadingStore.getState();
  setLoading(source, isLoading);
}

/**
 * Create a middleware that automatically syncs loading state
 * 
 * Usage:
 * ```typescript
 * export const useMyStore = create(
 *   withGlobalLoading('myStore')(
 *     immer<MyState>((set, get) => ({
 *       loading: false,
 *       fetchData: async () => {
 *         set((draft) => { draft.loading = true; });
 *         // ... fetch logic
 *         set((draft) => { draft.loading = false; });
 *       }
 *     }))
 *   )
 * );
 * ```
 */
export function withGlobalLoading(source: string) {
  return <T extends object>(config: T): T => {
    // This is a simplified version - in practice, you'd need to intercept
    // the set calls to automatically sync loading state
    // For now, stores should manually call syncGlobalLoading
    return config;
  };
}

