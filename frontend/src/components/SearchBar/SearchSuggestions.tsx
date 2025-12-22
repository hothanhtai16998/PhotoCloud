import { forwardRef, useMemo } from 'react';
import { Search, Clock, TrendingUp, MapPin } from 'lucide-react';
import type { SuggestionItem, SearchHistoryItem } from './hooks';

interface SearchSuggestionsProps {
    suggestions: SuggestionItem[];
    searchHistory: SearchHistoryItem[];
    searchQuery: string;
    selectedIndex: number;
    loadingSuggestions: boolean;
    onSuggestionClick: (suggestion: SuggestionItem) => void;
    onClearHistory: () => void;
}

/**
 * SearchSuggestions displays the dropdown list of search suggestions
 * Redesigned to match Unsplash's style with sections
 */
export const SearchSuggestions = forwardRef<HTMLDivElement, SearchSuggestionsProps>(
    (
        {
            suggestions,
            searchHistory,
            searchQuery,
            selectedIndex,
            loadingSuggestions,
            onSuggestionClick,
            onClearHistory,
        },
        ref
    ) => {
        const hasQuery = searchQuery.trim();

        // Separate suggestions into categories when no query
        const { recentSearches, trendingSearches } = useMemo(() => {
            if (hasQuery) {
                return { recentSearches: [], trendingSearches: suggestions };
            }

            const recent: SuggestionItem[] = [];
            const trending: SuggestionItem[] = [];

            suggestions.forEach((suggestion) => {
                if (suggestion.type === 'history') {
                    recent.push(suggestion);
                } else {
                    trending.push(suggestion);
                }
            });

            return {
                recentSearches: recent.slice(0, 5),
                trendingSearches: trending.slice(0, 5),
            };
        }, [suggestions, hasQuery]);

        return (
            <div ref={ref} className="search-suggestions" role="listbox" aria-label="Gợi ý tìm kiếm">
                {hasQuery ? (
                    // When user is typing, show search suggestions
                    suggestions.length > 0 ? (
                    <>
                            <div className="suggestions-header">
                                <TrendingUp size={14} />
                                <span>Gợi ý tìm kiếm</span>
                            </div>
                        <div className="suggestions-list">
                                {loadingSuggestions ? (
                                <div
                                    className="suggestion-item"
                                    style={{ justifyContent: 'center', cursor: 'default' }}
                                >
                                    <span style={{ color: '#767676', fontSize: '0.875rem' }}>
                                        Đang tải gợi ý...
                                    </span>
                                </div>
                            ) : (
                                suggestions.map((suggestion, index) => (
                                    <SuggestionItemButton
                                        key={`${suggestion.value}-${index}`}
                                        suggestion={suggestion}
                                        isSelected={selectedIndex === index}
                                            isHistory={false}
                                        onClick={() => onSuggestionClick(suggestion)}
                                    />
                                ))
                            )}
                        </div>
                    </>
                    ) : (
                    <div className="suggestions-empty">
                        <Search size={20} />
                        <span>Không tìm thấy gợi ý</span>
                        </div>
                    )
                ) : (
                    // When input is empty, show sections like Unsplash
                    <div className="suggestions-sections">
                        {recentSearches.length > 0 && (
                            <div className="suggestions-section">
                                <div className="suggestions-section-header">
                                    <Clock size={14} />
                                    <span>Recent Searches</span>
                                    <button
                                        type="button"
                                        onClick={onClearHistory}
                                        className="clear-history-btn"
                                        aria-label="Clear history"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="suggestions-tags">
                                    {recentSearches.map((suggestion, index) => (
                                        <SuggestionTag
                                            key={`recent-${suggestion.value}-${index}`}
                                            suggestion={suggestion}
                                            isSelected={selectedIndex === index}
                                            onClick={() => onSuggestionClick(suggestion)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {trendingSearches.length > 0 && (
                            <div className="suggestions-section">
                                <div className="suggestions-section-header">
                                    <TrendingUp size={14} />
                                    <span>Trending Searches</span>
                                </div>
                                <div className="suggestions-tags">
                                    {trendingSearches.map((suggestion, index) => (
                                        <SuggestionTag
                                            key={`trending-${suggestion.value}-${index}`}
                                            suggestion={suggestion}
                                            isSelected={selectedIndex === recentSearches.length + index}
                                            isTrending={true}
                                            onClick={() => onSuggestionClick(suggestion)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

SearchSuggestions.displayName = 'SearchSuggestions';

// Individual suggestion item button (for search results when typing)
interface SuggestionItemButtonProps {
    suggestion: SuggestionItem;
    isSelected: boolean;
    isHistory: boolean;
    onClick: () => void;
}

function SuggestionItemButton({
    suggestion,
    isSelected,
    isHistory,
    onClick,
}: SuggestionItemButtonProps) {
    const { type, value, apiType } = suggestion;

    // Determine icon based on type
    let icon = <Search size={16} className="suggestion-icon" />;
    if (type === 'location' || apiType === 'location') {
        icon = <MapPin size={16} className="suggestion-icon" style={{ color: '#059669' }} />;
    } else if (isHistory) {
        icon = <Clock size={16} className="suggestion-icon" />;
    } else if (type === 'popular' || apiType) {
        icon = <TrendingUp size={16} className="suggestion-icon" style={{ color: '#2563eb' }} />;
    }

    return (
        <button
            type="button"
            className={`suggestion-item ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            onMouseDown={(e) => {
                e.preventDefault();
            }}
            role="option"
            aria-selected={isSelected}
        >
            {icon}
            <span className="suggestion-text">{value}</span>
            {(type === 'location' || apiType === 'location') && (
                <span
                    style={{
                        fontSize: '11px',
                        color: '#059669',
                        marginLeft: 'auto',
                        marginRight: '8px',
                    }}
                >
                    Địa điểm
                </span>
            )}
            {(type === 'popular' || apiType === 'tag') && (
                <span
                    style={{
                        fontSize: '11px',
                        color: '#2563eb',
                        marginLeft: 'auto',
                        marginRight: '8px',
                    }}
                >
                    {apiType === 'tag' ? 'Tag' : 'Phổ biến'}
                </span>
            )}
            {isSelected && (
                <div className="suggestion-hint">
                    <kbd>Enter</kbd>
                </div>
            )}
        </button>
    );
}

// Suggestion tag button (for Recent/Trending sections - Unsplash style)
interface SuggestionTagProps {
    suggestion: SuggestionItem;
    isSelected: boolean;
    isTrending?: boolean;
    onClick: () => void;
}

function SuggestionTag({
    suggestion,
    isSelected,
    isTrending = false,
    onClick,
}: SuggestionTagProps) {
    const { type, value, apiType } = suggestion;

    return (
        <button
            type="button"
            className={`suggestion-tag ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            onMouseDown={(e) => {
                e.preventDefault();
            }}
            role="option"
            aria-selected={isSelected}
        >
            {isTrending && <TrendingUp size={12} className="suggestion-tag-icon" />}
            <span className="suggestion-tag-text">{value}</span>
        </button>
    );
}

