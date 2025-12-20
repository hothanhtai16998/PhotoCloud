/**
 * Type definitions for Navigation API (experimental)
 * https://github.com/WICG/navigation-api
 */

interface NavigationDestination {
  url: string;
  key: string;
  id: string;
  index: number;
  sameDocument: boolean;
}

interface NavigationInterceptOptions {
  handler?: () => void | Promise<void>;
  commit?: 'immediate' | 'after-transition' | 'manual';
  scroll?: 'auto' | 'manual' | 'restore';
  focusReset?: 'auto' | 'manual';
}

interface NavigateEvent extends Event {
  navigationType: 'push' | 'reload' | 'replace' | 'traverse';
  destination: NavigationDestination;
  canIntercept: boolean;
  hashChange: boolean;
  downloadRequest: string | null;
  formData: FormData | null;
  info?: unknown;
  signal: AbortSignal;
  userInitiated: boolean;
  
  intercept(options?: NavigationInterceptOptions): void;
  scroll(): void;
}

interface Navigation extends EventTarget {
  currentEntry: NavigationHistoryEntry | null;
  entries(): NavigationHistoryEntry[];
  canGoBack: boolean;
  canGoForward: boolean;
  
  navigate(url: string, options?: { state?: unknown; info?: unknown }): NavigationResult;
  reload(options?: { state?: unknown; info?: unknown }): NavigationResult;
  traverseTo(key: string, options?: { info?: unknown }): NavigationResult;
  goTo(key: string, options?: { info?: unknown }): NavigationResult;
  back(options?: { info?: unknown }): NavigationResult;
  forward(options?: { info?: unknown }): NavigationResult;
  
  addEventListener(type: 'navigate', listener: (event: NavigateEvent) => void): void;
  removeEventListener(type: 'navigate', listener: (event: NavigateEvent) => void): void;
}

interface NavigationHistoryEntry extends EventTarget {
  url: string;
  key: string;
  id: string;
  index: number;
  sameDocument: boolean;
}

interface NavigationResult {
  committed: Promise<NavigationHistoryEntry>;
  finished: Promise<NavigationHistoryEntry>;
}

interface Window {
  navigation?: Navigation;
}

