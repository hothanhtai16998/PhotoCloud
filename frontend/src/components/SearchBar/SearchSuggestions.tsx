import { forwardRef } from 'react';
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

        return (
            <div ref={ref} className="search-suggestions" role="listbox" aria-label="Gợi ý tìm kiếm">
                {suggestions.length > 0 ? (
                    <>
                        {hasQuery ? (
                            <div className="suggestions-header">
                                <TrendingUp size={14} />
                                <span>Gợi ý tìm kiếm</span>
                            </div>
                        ) : (
                            <div className="suggestions-header">
                                <Clock size={14} />
                                <span>Tìm kiếm gần đây</span>
                                {searchHistory.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={onClearHistory}
                                        className="clear-history-btn"
                                        aria-label="Xóa lịch sử"
                                    >
                                        Xóa
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="suggestions-list">
                            {loadingSuggestions && hasQuery ? (
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
                                        isHistory={
                                            searchHistory.some(
                                                (item) => item.query.toLowerCase() === suggestion.value.toLowerCase()
                                            ) || suggestion.type === 'history'
                                        }
                                        onClick={() => onSuggestionClick(suggestion)}
                                    />
                                ))
                            )}
                        </div>
                    </>
                ) : hasQuery ? (
                    <div className="suggestions-empty">
                        <Search size={20} />
                        <span>Không tìm thấy gợi ý</span>
                    </div>
                ) : null}
            </div>
        );
    }
);

SearchSuggestions.displayName = 'SearchSuggestions';

// Individual suggestion item button
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

