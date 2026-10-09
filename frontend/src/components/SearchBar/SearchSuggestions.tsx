import { forwardRef, memo, useMemo } from 'react';
import { Search, Clock, TrendingUp, MapPin } from 'lucide-react';
import type { SuggestionItem } from './hooks';

interface SearchSuggestionsProps {
    suggestions: SuggestionItem[];
    searchQuery: string;
    selectedIndex: number;
    loadingSuggestions: boolean;
    onSuggestionClick: (suggestion: SuggestionItem) => void;
    onClearHistory: () => void;
}

export const SearchSuggestions = memo(forwardRef<HTMLDivElement, SearchSuggestionsProps>(
    ({ suggestions, searchQuery, selectedIndex, loadingSuggestions, onSuggestionClick, onClearHistory }, ref) => {
        const hasQuery = Boolean(searchQuery.trim());
        const sections = useMemo(() => {
            const indexed = suggestions.map((suggestion, index) => ({ suggestion, index }));
            return [
                { title: 'Tìm kiếm gần đây', history: true, items: indexed.filter(item => item.suggestion.type === 'history') },
                { title: 'Gợi ý phổ biến', history: false, items: indexed.filter(item => item.suggestion.type !== 'history') },
            ];
        }, [suggestions]);

        return (
            <div ref={ref} className="search-suggestions" role="listbox" aria-label="Gợi ý tìm kiếm" aria-busy={loadingSuggestions}>
                {hasQuery ? (
                    <>
                        <div className="suggestions-header"><Search size={14} /><span>Gợi ý tìm kiếm</span></div>
                        {suggestions.length > 0 ? (
                            <div className="suggestions-list">
                                {suggestions.map((suggestion, index) => (
                                    <SuggestionButton key={suggestion.value} suggestion={suggestion} isSelected={selectedIndex === index} onSelect={onSuggestionClick} />
                                ))}
                            </div>
                        ) : !loadingSuggestions && (
                            <div className="suggestions-empty"><Search size={20} /><span>Không tìm thấy gợi ý</span></div>
                        )}
                        {loadingSuggestions && <div className="suggestions-empty" role="status">Đang tải gợi ý...</div>}
                    </>
                ) : (
                    <div className="suggestions-sections">
                        {sections.map(section => section.items.length > 0 && (
                            <div className="suggestions-section" key={section.title}>
                                <div className="suggestions-section-header">
                                    <span>{section.title}</span>
                                    {section.history && <button type="button" onClick={onClearHistory} className="clear-history-btn" aria-label="Xóa lịch sử tìm kiếm">Xóa</button>}
                                </div>
                                <div className="suggestions-tags">
                                    {section.items.map(({ suggestion, index }) => (
                                        <SuggestionButton key={suggestion.value} suggestion={suggestion} isSelected={selectedIndex === index} onSelect={onSuggestionClick} tag />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
));
SearchSuggestions.displayName = 'SearchSuggestions';

interface SuggestionButtonProps {
    suggestion: SuggestionItem;
    isSelected: boolean;
    onSelect: (suggestion: SuggestionItem) => void;
    tag?: boolean;
}

const SuggestionButton = memo(function SuggestionButton({ suggestion, isSelected, onSelect, tag = false }: SuggestionButtonProps) {
    const { type, value, apiType } = suggestion;
    const isLocation = type === 'location' || apiType === 'location';
    const Icon = type === 'history' ? Clock : isLocation ? MapPin : type === 'popular' || apiType ? TrendingUp : Search;
    const label = isLocation ? 'Địa điểm' : apiType === 'tag' ? 'Tag' : type === 'popular' ? 'Phổ biến' : '';
    return (
        <button
            type="button"
            className={(tag ? 'suggestion-tag' : 'suggestion-item') + (isSelected ? ' selected' : '')}
            onClick={event => { event.preventDefault(); event.stopPropagation(); onSelect(suggestion); }}
            onMouseDown={event => event.preventDefault()}
            role="option"
            aria-selected={isSelected}
        >
            <Icon size={16} className={tag ? 'suggestion-tag-icon' : 'suggestion-icon'} />
            <span className={tag ? 'suggestion-tag-text' : 'suggestion-text'}>{value}</span>
            {!tag && label && <span className="suggestion-type-label">{label}</span>}
            {!tag && isSelected && <span className="suggestion-hint"><kbd>Enter</kbd></span>}
        </button>
    );
});
