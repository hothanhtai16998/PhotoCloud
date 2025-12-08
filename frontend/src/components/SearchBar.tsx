/**
 * SearchBar component - re-exports from refactored module
 * 
 * The SearchBar has been refactored into smaller, more maintainable pieces:
 * - SearchBar/SearchBar.tsx - Main component
 * - SearchBar/SearchSuggestions.tsx - Suggestions dropdown
 * - SearchBar/hooks/ - Custom hooks for history, suggestions, and filters
 * 
 * This file maintains backward compatibility for existing imports.
 */

export { SearchBar, type SearchBarRef } from './SearchBar/SearchBar';
