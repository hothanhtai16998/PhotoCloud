import React from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Global Loading Store
 * 
 * Centralized loading state management for the entire app.
 * Tracks loading states from all stores and provides a single source of truth.
 * 
 * Usage:
 * - Stores register their loading states here
 * - GlobalLoadingOverlay shows spinner when any store is loading
 * - Prevents multiple spinners and provides consistent UX
 */
interface GlobalLoadingState {
  // Track loading states from different sources
  loadingSources: Map<string, boolean>;
  
  // Register a loading source (store/component)
  setLoading: (source: string, isLoading: boolean) => void;
  
  // Check if any source is loading
  isLoading: () => boolean;
  
  // Get loading count (for debugging)
  getLoadingCount: () => number;
  
  // Clear all loading states (useful for cleanup)
  clearAll: () => void;
}

export const useGlobalLoadingStore = create(
  immer<GlobalLoadingState>((set, get) => ({
    loadingSources: new Map<string, boolean>(),

    setLoading: (source: string, isLoading: boolean) => {
      set((state) => {
        if (isLoading) {
          state.loadingSources.set(source, true);
        } else {
          state.loadingSources.delete(source);
        }
      });
    },

    isLoading: () => {
      const state = get();
      return state.loadingSources.size > 0;
    },

    getLoadingCount: () => {
      const state = get();
      return state.loadingSources.size;
    },

    clearAll: () => {
      set((state) => {
        state.loadingSources.clear();
      });
    },
  }))
);

/**
 * Hook to easily track loading state from a component/store
 * Automatically registers/unregisters when loading changes
 */
export function useGlobalLoading(source: string, isLoading: boolean) {
  const { setLoading } = useGlobalLoadingStore();
  
  React.useEffect(() => {
    setLoading(source, isLoading);
    return () => {
      setLoading(source, false);
    };
  }, [source, isLoading, setLoading]);
}

