import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useNavigate, useLocation, useMatch } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useImageStore } from '@/stores/useImageStore';
import { onSearchFocusRequest } from '@/utils/searchFocusEvent';
import { t } from '@/i18n';
import SearchFilters from '../SearchFilters';
import { SearchSuggestions } from './SearchSuggestions';
import {
    useSearchHistory,
    useSearchSuggestions,
    useSearchFilters,
    type SuggestionItem,
} from './hooks';
import { buildFilterParams } from '@/utils/buildFilterParams';
import '../SearchBar.css';

export interface SearchBarRef {
    focus: () => void;
}

/**
 * SearchBar component with autocomplete, history, and filters.
 * Refactored into smaller hooks for maintainability.
 */
export const SearchBar = forwardRef<SearchBarRef>((_props, ref) => {
    const fetchImages = useImageStore(state => state.fetchImages);
    const currentCategory = useImageStore(state => state.currentCategory);
    const navigate = useNavigate();
    const location = useLocation();
    const searchMatch = useMatch('/s/photos/:query');
    const urlQuery = searchMatch?.params.query;

    // Local state
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Refs
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Custom hooks
    const { searchHistory, saveToHistory, clearHistory } = useSearchHistory();
    const { suggestions, loadingSuggestions } = useSearchSuggestions(searchQuery, searchHistory, isFocused && showSuggestions);
    const { filters, setFilters } = useSearchFilters();

    // Expose focus method via ref
    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
    }));

    // Listen for global focus requests
    useEffect(() => {
        return onSearchFocusRequest(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
    }, []);

    // Sync with URL query param when on search page
    useEffect(() => {
        if (location.pathname.startsWith('/s/photos/')) {
            // Only update if we have a urlQuery (wait for params to be ready)
            if (urlQuery) {
                try {
                    const decodedQuery = urlQuery;
                    if (decodedQuery !== searchQuery && !isFocused) {
                        setSearchQuery(decodedQuery);
                    }
                } catch (error) {
                    // Invalid URL encoding, ignore
                    console.warn('Failed to decode search query:', error);
                }
            } else if (!isFocused) {
                // If we're on search page but no query param, clear search
                setSearchQuery('');
            }
        } else if (location.pathname === '/' && !isFocused) {
            // Only clear search query when on homepage and not focused
            // But only if it's different from what's in the URL
            if (searchQuery && !urlQuery) {
                setSearchQuery('');
            }
        }
    }, [urlQuery, location.pathname, searchQuery, isFocused]);

    useEffect(() => () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    }, []);

    // Handle search execution
    const handleSearch = useCallback(
        (query: string | SuggestionItem) => {
            
            const searchValue = typeof query === 'string' ? query : query.value;
            const trimmedSearch = searchValue.trim();
            
            setSearchQuery(trimmedSearch);
            setShowSuggestions(false);
            setSelectedIndex(-1);
            inputRef.current?.blur();

            if (trimmedSearch) {
                // Navigate to search results page immediately
                try {
                    const encodedQuery = encodeURIComponent(trimmedSearch);
                    navigate(`/s/photos/${encodedQuery}`, { replace: false });
                    saveToHistory(trimmedSearch);
                } catch (error) {
                    console.error('Failed to encode search query:', error);
                    // Fallback: try with the original query
                    navigate(`/s/photos/${trimmedSearch}`, { replace: false });
                }
            } else {
                // Clear search - navigate to homepage
                navigate('/', { replace: true });
            }
        },
        [navigate, saveToHistory]
    );

    // Handle clear button
    const handleClear = useCallback(() => {
        
        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        
        // Navigate to homepage when clearing search
        if (location.pathname.startsWith('/s/')) {
            navigate('/', { replace: true });
        }
    }, [location.pathname, navigate]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                return;
            }
            if (!showSuggestions || suggestions.length === 0) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!e.nativeEvent.isComposing) handleSearch(searchQuery);
                }
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < suggestions.length && suggestions[selectedIndex]) {
                        handleSearch(suggestions[selectedIndex]);
                    } else {
                        handleSearch(searchQuery);
                    }
                    break;
                case 'Escape':
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                    inputRef.current?.blur();
                    break;
            }
        },
        [showSuggestions, suggestions, selectedIndex, searchQuery, handleSearch]
    );

    // Handle focus/blur
    const handleFocus = useCallback(() => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        setIsFocused(true);
        // Only hide empty suggestions on phone layouts; tablets keep the desktop dropdown.
        const isPhone = window.innerWidth <= 480;
        if (isPhone && !searchQuery.trim()) {
            setShowSuggestions(false);
        } else {
            setShowSuggestions(true);
        }
    }, [searchQuery]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        const relatedTarget = e.relatedTarget as HTMLElement | null;

        if (relatedTarget && suggestionsRef.current?.contains(relatedTarget)) {
            blurTimerRef.current = setTimeout(() => inputRef.current?.focus(), 0);
            return;
        }

        blurTimerRef.current = setTimeout(() => {
            const currentActive = document.activeElement;
            const isStillInSuggestions = suggestionsRef.current?.contains(currentActive);
            const isStillInInput = inputRef.current === currentActive;

            if (!isStillInSuggestions && !isStillInInput) {
                setIsFocused(false);
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        }, 200);
    }, []);

    // Click-outside to close suggestions — more reliable than blur-based approach
    useEffect(() => {
        if (!showSuggestions) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const searchContainer = inputRef.current?.closest('.search-bar-container');
            // Close if click is outside the entire search bar
            if (searchContainer && !searchContainer.contains(target)) {
                setShowSuggestions(false);
                setIsFocused(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleMouseDown, true); // capture phase to intercept before any element's own handlers
        return () => document.removeEventListener('mousedown', handleMouseDown, true);
    }, [showSuggestions]);

    // Helper function to build fetch params from filters
    const buildFetchParams = useCallback((newFilters: typeof filters) => {
        return buildFilterParams(newFilters, {
            search: searchQuery.trim() || undefined,
            category: currentCategory,
            page: 1,
            _refresh: true,
        });
    }, [searchQuery, currentCategory]);

    // Handle filter changes
    const handleFiltersChange = useCallback(
        (newFilters: typeof filters) => {
            setFilters(newFilters);

            // Apply filters on homepage and category pages
            // NOTE: setFilters no longer dispatches filterChange event, so this is the only place
            // that triggers the fetch for normal filter changes
            if (location.pathname === '/' || location.pathname.startsWith('/t/') || location.pathname.startsWith('/s/')) {
                const fetchParams = buildFetchParams(newFilters);
                fetchImages(fetchParams);
            }
        },
        [setFilters, location.pathname, buildFetchParams, fetchImages]
    );

    // Listen for filter reset events (when resetFilters is called directly from ActiveFiltersIndicator)
    // NOTE: resetFilters dispatches filterChange event, but setFilters does not (to prevent duplicate fetches)
    // This listener handles the case when resetFilters is called directly (e.g., from ActiveFiltersIndicator)
    useEffect(() => {
        const handleFilterReset = () => {
            // Only trigger fetch if resetFilters was called directly (outside of handleFiltersChange)
            // This happens when ActiveFiltersIndicator calls resetFilters directly
            if (location.pathname === '/' || location.pathname.startsWith('/t/') || location.pathname.startsWith('/s/')) {
                // Read the shared snapshot synchronously after reset.
                const fetchParams = buildFetchParams(useSearchFilters.getState().filters);
                fetchImages(fetchParams);
            }
        };

        window.addEventListener('filterChange', handleFilterReset);
        return () => window.removeEventListener('filterChange', handleFilterReset);
    }, [location.pathname, buildFetchParams, fetchImages]);

    return (
        <div 
            className="search-bar-container"
            onClick={(e) => {
                // Prevent clicks on empty space from propagating
                if (e.target === e.currentTarget) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch(searchQuery);
                }}
                onClick={(e) => {
                    // Only prevent navigation if clicking on empty space (not on input or buttons)
                    if (e.target === e.currentTarget) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}
                className="header-search"
                role="search"
                aria-label={t('search.label')}
            >
                <div className="search-icon-left" aria-hidden="true">
                    <Search size={20} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                        setSelectedIndex(-1);
                        setIsFocused(true);
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    className="search-input"
                    aria-label={t('search.label')}
                    aria-describedby="search-description"
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    autoComplete="off"
                />
                <span id="search-description" className="sr-only">
                    {t('search.hint')}
                </span>
                {searchQuery && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="search-clear"
                        aria-label={t('search.clear')}
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Search Filters */}
                <div className="search-filters-wrapper">
                    <SearchFilters
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                    />
                </div>
            </form>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && (isFocused || searchQuery) && (
                <SearchSuggestions
                    ref={suggestionsRef}
                    suggestions={suggestions}
                    searchQuery={searchQuery}
                    selectedIndex={selectedIndex}
                    loadingSuggestions={loadingSuggestions}
                    onSuggestionClick={handleSearch}
                    onClearHistory={clearHistory}
                />
            )}
        </div>
    );
});

SearchBar.displayName = 'SearchBar';

