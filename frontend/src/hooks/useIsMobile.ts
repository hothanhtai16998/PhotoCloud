import { useSyncExternalStore } from 'react';
import { appConfig } from '@/config/appConfig';

let mobileQuery: MediaQueryList | undefined;
const listeners = new Set<() => void>();

function getQuery(): MediaQueryList | undefined {
  if (typeof window === 'undefined') return undefined;
  return mobileQuery ??= window.matchMedia(`(max-width: ${appConfig.mobileBreakpoint}px)`);
}

function notify(): void {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  const query = getQuery();
  if (listeners.size === 0) query?.addEventListener('change', notify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) query?.removeEventListener('change', notify);
  };
}

function getSnapshot(): boolean {
  return getQuery()?.matches ?? false;
}

/** Share one breakpoint listener across all cards and update only when it changes. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
