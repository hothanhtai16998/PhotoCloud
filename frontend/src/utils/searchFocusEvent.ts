/**
 * Custom event system for triggering search focus from anywhere in the app.
 * This avoids DOM queries and provides a clean, type-safe way to communicate
 * between components that aren't directly connected.
 */

const SEARCH_FOCUS_EVENT = 'app:focus-search';

/**
 * Trigger focus on the search input from anywhere in the app.
 * SearchBar listens for this event and focuses itself.
 */
export function triggerSearchFocus(): void {
  window.dispatchEvent(new CustomEvent(SEARCH_FOCUS_EVENT));
}

/**
 * Subscribe to search focus events.
 * Call this in the SearchBar component to listen for focus requests.
 *
 * @param callback - Function to call when focus is requested
 * @returns Cleanup function to remove the listener
 */
export function onSearchFocusRequest(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(SEARCH_FOCUS_EVENT, handler);
  return () => window.removeEventListener(SEARCH_FOCUS_EVENT, handler);
}
