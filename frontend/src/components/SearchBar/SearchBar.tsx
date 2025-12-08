import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useImageStore } from '@/stores/useImageStore';
import { onSearchFocusRequest } from '@/utils/searchFocusEvent';
import { searchConfig } from '@/config/searchConfig';
import { t } from '@/i18n';
import SearchFilters from '../SearchFilters';
import { SearchSuggestions } from './SearchSuggestions';
import {
    useSearchHistory,
    useSearchSuggestions,
    useSearchFilters,
    type SuggestionItem,
} from './hooks';
import '../SearchBar.css';

export interface SearchBarRef {
    focus: () => void;
}

/**
 * SearchBar component with autocomplete, history, and filters.
 * Refactored into smaller hooks for maintainability.
 */
export const SearchBar = forwardRef<SearchBarRef>((_props, ref) => {
    const { fetchImages, currentSearch } = useImageStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Local state
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Refs
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Custom hooks
    const { searchHistory, saveToHistory, clearHistory } = useSearchHistory();
    const { suggestions, loadingSuggestions } = useSearchSuggestions(searchQuery, searchHistory);
    const { filters, setFilters, resetFilters } = useSearchFilters();

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

    // Sync with current search from store
    useEffect(() => {
        if (currentSearch && currentSearch !== searchQuery && !isFocused) {
            setSearchQuery(currentSearch);
        }
    }, [currentSearch, searchQuery, isFocused]);

    // Debounced search execution
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            if (location.pathname === '/') {
                if (searchQuery.trim()) {
                    fetchImages({ search: searchQuery.trim() });
                    saveToHistory(searchQuery.trim());
                } else {
                    fetchImages({ search: undefined });
                }
            }
        }, searchConfig.searchDebounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [searchQuery, location.pathname, fetchImages, saveToHistory]);

    // Handle search execution
    const handleSearch = useCallback(
        (query: string | SuggestionItem) => {
            const searchValue = typeof query === 'string' ? query : query.value;
            setSearchQuery(searchValue);
            setShowSuggestions(false);
            setSelectedIndex(-1);
            inputRef.current?.blur();

            if (location.pathname !== '/') {
                navigate('/');
            }

            // Filter by location if it's a location suggestion
            const searchParams: { search?: string; location?: string } = {};
            if (typeof query !== 'string' && query.type === 'location') {
                searchParams.location = searchValue;
            } else {
                searchParams.search = searchValue.trim() || undefined;
            }

            fetchImages(searchParams);

            if (searchValue.trim()) {
                saveToHistory(searchValue.trim());
            }
        },
        [location.pathname, navigate, fetchImages, saveToHistory]
    );

    // Handle clear button
    const handleClear = useCallback(() => {
        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();

        if (location.pathname === '/') {
            fetchImages({ search: undefined });
        }
    }, [location.pathname, fetchImages]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!showSuggestions || suggestions.length === 0) {
                if (e.key === 'Enter') {
                    handleSearch(searchQuery);
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
        setIsFocused(true);
        // On mobile, only show suggestions if there's a search query
        const isMobile = window.innerWidth <= 768;
        if (isMobile && !searchQuery.trim()) {
            setShowSuggestions(false);
        } else {
            setShowSuggestions(true);
        }
    }, [searchQuery]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        const relatedTarget = e.relatedTarget as HTMLElement | null;

        if (relatedTarget && suggestionsRef.current?.contains(relatedTarget)) {
            setTimeout(() => inputRef.current?.focus(), 0);
            return;
        }

        setTimeout(() => {
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

    // Handle filter changes
    const handleFiltersChange = useCallback(
        (newFilters: typeof filters) => {
            setFilters(newFilters);

            if (location.pathname === '/') {
                fetchImages({
                    search: searchQuery.trim() || undefined,
                    color: newFilters.color !== 'all' ? newFilters.color : undefined,
                    page: 1,
                    _refresh: true,
                });
            }
        },
        [setFilters, location.pathname, searchQuery, fetchImages]
    );

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
                    aria-expanded={showSuggestions}
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
                        filters={{
                            ...filters,
                            color: filters.color as 'all' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'black' | 'white' | 'gray'
                        }}
                        onFiltersChange={handleFiltersChange}
                        onReset={resetFilters}
                    />
                </div>
            </form>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && (isFocused || searchQuery) && (
                <SearchSuggestions
                    ref={suggestionsRef}
                    suggestions={suggestions}
                    searchHistory={searchHistory}
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

