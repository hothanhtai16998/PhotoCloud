import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useImageStore } from '@/stores/useImageStore';
import { useSearchFilters } from '@/components/SearchBar/hooks/useSearchFilters';
import { buildFilterParams } from '@/utils/buildFilterParams';
import { Maximize2, ChevronDown, ArrowUpDown, Folder, Users } from 'lucide-react';
import './SearchResultsNavigation.css';

type ContentType = 'photos' | 'illustrations';

interface MoreOption {
  label: string;
  count: number;
  icon?: React.ReactNode;
}

export const SearchResultsNavigation = memo(function SearchResultsNavigation() {
  const { query } = useParams<{ query?: string }>();
  const { pagination, images, fetchImages, currentCategory } = useImageStore();
  const { filters, setFilters } = useSearchFilters();
  const location = useLocation();
  const [activeContentType, setActiveContentType] = useState<ContentType>('photos');
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  
  const orientationRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  
  // Get search query from URL params
  const searchQuery = query ? decodeURIComponent(query) : null;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orientationRef.current && !orientationRef.current.contains(event.target as Node)) {
        setOrientationOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Always show navigation bar on search pages (even if query is still loading)
  // The query will be available once React Router parses the URL

  const photosCount = pagination?.total || images.length || 0;
  const illustrationsCount = 0; // TODO: Implement illustrations count when backend supports it

  const moreOptions: MoreOption[] = [
    { label: 'Collections', count: 0, icon: <Folder size={14} /> },
    { label: 'Users', count: 0, icon: <Users size={14} /> },
  ];

  const orientationOptions = [
    { value: 'all', label: 'All' },
    { value: 'landscape', label: 'Landscape' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'square', label: 'Square' },
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'date', label: 'Newest' },
    { value: 'views', label: 'Curated' },
  ];

  // Helper function to build fetch params from filters
  const buildFetchParams = useCallback((newFilters: typeof filters) => {
    const queryValue = searchQuery || (query ? decodeURIComponent(query) : null);
    return buildFilterParams(newFilters, {
      search: queryValue || undefined,
      category: currentCategory,
      page: 1,
      _refresh: true,
    });
  }, [searchQuery, query, currentCategory]);

  const handleOrientationChange = (value: string) => {
    const newFilters = {
      ...filters,
      orientation: value as 'all' | 'landscape' | 'portrait' | 'square',
    };
    setFilters(newFilters);
    setOrientationOpen(false);
    
    // Apply filters on search pages
    if (location.pathname.startsWith('/s/')) {
      const fetchParams = buildFetchParams(newFilters);
      fetchImages(fetchParams);
    }
  };

  const handleSortChange = (value: string) => {
    const newFilters = {
      ...filters,
      sortBy: value as 'relevance' | 'date' | 'views' | 'downloads' | 'favorites',
    };
    setFilters(newFilters);
    setSortOpen(false);
    
    // Apply filters on search pages
    if (location.pathname.startsWith('/s/')) {
      const fetchParams = buildFetchParams(newFilters);
      fetchImages(fetchParams);
    }
  };

  const currentOrientation = orientationOptions.find(opt => opt.value === filters.orientation) || orientationOptions[0];
  const currentSort = sortOptions.find(opt => opt.value === (filters.sortBy || 'relevance')) || sortOptions[0];

  return (
    <div className="search-results-navigation">
      <div className="search-results-navigation-content">
        {/* Content Type Tabs */}
        <div className="content-type-tabs">
          <button
            className={`content-type-tab ${activeContentType === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveContentType('photos')}
          >
            Photos {photosCount > 0 && <span className="content-type-count">{photosCount}</span>}
          </button>
          <button
            className={`content-type-tab ${activeContentType === 'illustrations' ? 'active' : ''}`}
            onClick={() => setActiveContentType('illustrations')}
          >
            Illustrations {illustrationsCount > 0 && <span className="content-type-count">{illustrationsCount}</span>}
          </button>
          
          {/* More Dropdown */}
          <div className="more-dropdown-wrapper" ref={moreRef}>
            <button
              className={`content-type-tab more-tab ${moreOpen ? 'active' : ''}`}
              onClick={() => setMoreOpen(!moreOpen)}
            >
              More <ChevronDown size={14} className={`more-chevron ${moreOpen ? 'open' : ''}`} />
            </button>
            {moreOpen && (
              <div className="more-dropdown-menu">
                {moreOptions.map((option) => (
                  <button
                    key={option.label}
                    className="more-dropdown-item"
                    onClick={() => {
                      setMoreOpen(false);
                      // TODO: Handle navigation to collections/users
                    }}
                  >
                    {option.icon && <span className="more-item-icon">{option.icon}</span>}
                    <span>{option.label} {option.count > 0 && <span className="more-item-count">{option.count}</span>}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="filter-dropdowns">
          {/* Orientation Filter */}
          <div className="filter-dropdown-wrapper" ref={orientationRef}>
            <button
              className={`filter-dropdown-btn ${orientationOpen ? 'active' : ''}`}
              onClick={() => {
                setOrientationOpen(!orientationOpen);
                setSortOpen(false);
                setMoreOpen(false);
              }}
            >
              <Maximize2 size={14} className="filter-icon" />
              <span>{currentOrientation.label}</span>
              <ChevronDown size={14} className={`filter-chevron ${orientationOpen ? 'open' : ''}`} />
            </button>
            {orientationOpen && (
              <div className="filter-dropdown-menu">
                <div className="filter-menu-title">Orientation</div>
                {orientationOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`filter-menu-item ${filters.orientation === option.value ? 'selected' : ''}`}
                    onClick={() => handleOrientationChange(option.value)}
                  >
                    {filters.orientation === option.value && <span className="filter-checkmark">✓</span>}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Filter */}
          <div className="filter-dropdown-wrapper" ref={sortRef}>
            <button
              className={`filter-dropdown-btn ${sortOpen ? 'active' : ''}`}
              onClick={() => {
                setSortOpen(!sortOpen);
                setOrientationOpen(false);
                setMoreOpen(false);
              }}
            >
              <ArrowUpDown size={14} className="filter-icon" />
              <span>Sort by {currentSort.label}</span>
              <ChevronDown size={14} className={`filter-chevron ${sortOpen ? 'open' : ''}`} />
            </button>
            {sortOpen && (
              <div className="filter-dropdown-menu">
                <div className="filter-menu-title">Sort by</div>
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`filter-menu-item ${(filters.sortBy || 'relevance') === option.value ? 'selected' : ''}`}
                    onClick={() => handleSortChange(option.value)}
                  >
                    {(filters.sortBy || 'relevance') === option.value && <span className="filter-checkmark">✓</span>}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default SearchResultsNavigation;
