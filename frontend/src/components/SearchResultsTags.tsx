import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '@/services/searchService';
import { ChevronRight } from 'lucide-react';
import './SearchResultsTags.css';

interface SearchResultsTagsProps {
    query: string;
}

export function SearchResultsTags({ query }: SearchResultsTagsProps) {
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const tagsContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!query) return;
            
            setLoading(true);
            try {
                // Get search suggestions from API
                const suggestions = await searchService.getSuggestions(query, 15);
                // Extract unique tag-like suggestions (prioritize tags and titles)
                const tags = suggestions
                    .map(s => s.text)
                    .filter((text, index, self) => 
                        // Remove duplicates and the exact query
                        text.toLowerCase() !== query.toLowerCase() &&
                        self.indexOf(text) === index
                    )
                    .slice(0, 12); // Limit to 12 tags
                
                setSuggestedTags(tags);
            } catch (error) {
                console.error('Failed to fetch suggested tags:', error);
                setSuggestedTags([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSuggestions();
    }, [query]);

    // Check if tags container can scroll
    useEffect(() => {
        const checkScroll = () => {
            if (tagsContainerRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = tagsContainerRef.current;
                setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
            }
        };

        checkScroll();
        const container = tagsContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);
            return () => {
                container.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
            };
        }
    }, [suggestedTags]);

    const handleTagClick = (tag: string) => {
        const encodedQuery = encodeURIComponent(tag);
        navigate(`/s/photos/${encodedQuery}`);
    };

    const scrollRight = () => {
        if (tagsContainerRef.current) {
            tagsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
    };

    if (loading || suggestedTags.length === 0) {
        return null;
    }

    return (
        <div className="search-results-tags-container">
            <div 
                ref={tagsContainerRef}
                className="search-results-tags"
            >
                {suggestedTags.map((tag, index) => (
                    <button
                        key={`${tag}-${index}`}
                        className="search-results-tag"
                        onClick={() => handleTagClick(tag)}
                    >
                        {tag}
                    </button>
                ))}
            </div>
            {canScrollRight && (
                <button
                    className="search-results-tags-scroll-btn"
                    onClick={scrollRight}
                    aria-label="Scroll right"
                >
                    <ChevronRight size={16} />
                </button>
            )}
        </div>
    );
}
