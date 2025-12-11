import { useImageStore } from "@/stores/useImageStore"
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom"
import { useState, useEffect, useRef, memo, useCallback } from "react"
import { categoryService, type Category } from "@/services/categoryService"
import { categoryNameToSlug, getCategoryNameFromSlug } from '@/utils/categorySlug';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t, getLocale } from '@/i18n';
import { getTranslatedCategoryName } from '@/utils/categoryTranslations';
import './CategoryNavigation.css'

export const CategoryNavigation = memo(function CategoryNavigation() {
  const { currentCategory } = useImageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [, setSearchParams] = useSearchParams();
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [categoryObjects, setCategoryObjects] = useState<Category[]>([])
  const categoryNavElementRef = useRef<HTMLNavElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [locale, setLocaleState] = useState<('vi' | 'en')>(getLocale())
  
  // Listen for locale changes
  useEffect(() => {
    const handleLocaleChange = () => {
      setLocaleState(getLocale());
    };
    window.addEventListener('localeChange', handleLocaleChange);
    return () => window.removeEventListener('localeChange', handleLocaleChange);
  }, []);
  
  // Determine active category from URL (route param) or fallback to store
  const activeCategoryFromUrl = categorySlug 
    ? (getCategoryNameFromSlug(categorySlug, categoryObjects) || null)
    : null;
  const activeCategoryVi = activeCategoryFromUrl || currentCategory || '';
  
  // Get all category names (Vietnamese - for navigation)
  const allCategoryNames = ['', ...categoryObjects.map((cat: Category) => cat.name)];
  
  // Get translated display names
  const getDisplayName = (categoryName: string): string => {
    if (!categoryName) return t('common.all');
    return getTranslatedCategoryName(categoryName, locale);
  };


  // Check scroll position and update button visibility (works on both desktop and mobile)
  const checkScrollButtons = useCallback(() => {
    if (!categoryNavElementRef.current) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }

    const nav = categoryNavElementRef.current
    const { scrollLeft, scrollWidth, clientWidth } = nav
    const canScroll = scrollWidth > clientWidth
    const isAtStart = scrollLeft <= 1 // Allow 1px tolerance for rounding
    const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 1 // -1 for rounding
    
    // Show left button only when scrolled right (not at start)
    setCanScrollLeft(canScroll && !isAtStart)
    // Show right button when there's content to scroll and not at end
    setCanScrollRight(canScroll && !isAtEnd)
  }, [])

  // Update scroll button visibility when categories change or on scroll
  useEffect(() => {
    if (!categoryNavElementRef.current) return

    // Initial check with a small delay to ensure layout is complete
    const initialCheck = setTimeout(() => {
      checkScrollButtons()
    }, 100)

    const nav = categoryNavElementRef.current
    nav.addEventListener('scroll', checkScrollButtons, { passive: true })
    
    // Also check on resize with debouncing
    let resizeTimer: number | null = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        checkScrollButtons()
      }, 150)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(initialCheck)
      if (resizeTimer) clearTimeout(resizeTimer)
      nav.removeEventListener('scroll', checkScrollButtons)
      window.removeEventListener('resize', handleResize)
    }
  }, [categoryObjects, checkScrollButtons])

  // Scroll handlers - match Unsplash's smooth scrolling behavior
  const scrollLeft = useCallback(() => {
    if (!categoryNavElementRef.current) return
    const nav = categoryNavElementRef.current
    // Scroll approximately 3-4 category items at a time
    const scrollAmount = nav.clientWidth * 0.75 // Scroll 75% of visible width
    nav.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }, [])

  const scrollRight = useCallback(() => {
    if (!categoryNavElementRef.current) return
    const nav = categoryNavElementRef.current
    // Scroll approximately 3-4 category items at a time
    const scrollAmount = nav.clientWidth * 0.75 // Scroll 75% of visible width
    nav.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }, [])

  // Fetch categories from backend
  useEffect(() => {
    const loadCategories = async (forceRefresh = false) => {
      try {
        const fetchedCategories = await categoryService.fetchCategories(forceRefresh)
        setCategoryObjects(fetchedCategories)
      } catch (error) {
        console.error('Failed to load categories:', error)
        setCategoryObjects([])
      }
    }
    
    // Initial load
    loadCategories()
    
    // Listen for category updates (when admin creates/updates/deletes categories)
    const handleCategoriesUpdated = () => {
      loadCategories(true) // Force refresh to bypass cache
    }
    
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated)
    
    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated)
    }
  }, [])

  // Helper function to scroll to NoFlashGrid (accounting for header)
  const scrollToGrid = useCallback(() => {
    // Find the image grid container
    const gridContainer = document.getElementById('image-grid-container');
    if (!gridContainer) return;

    // Calculate header height dynamically
    const header = document.querySelector('.unsplash-header');
    const headerHeight = header ? header.getBoundingClientRect().height : 100; // Fallback to 100px for desktop

    // Get the grid container's position
    const gridRect = gridContainer.getBoundingClientRect();
    const scrollY = window.scrollY + gridRect.top - headerHeight;

    // Scroll to grid with smooth behavior
    window.scrollTo({
      top: Math.max(0, scrollY), // Ensure we don't scroll to negative position
      behavior: 'smooth'
    });
  }, []);

  const handleCategoryClick = (categoryNameVi: string) => {
    const isTestPage = location.pathname.includes('UnsplashGridTestPage');
    
    // For test page, use query params (backward compatibility)
    if (isTestPage) {
      const newCategory = categoryNameVi ? categoryNameVi : undefined;
      setSearchParams({ category: newCategory || 'all' });
      // Scroll to grid after state update
      setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToGrid();
        });
      }, 100);
      return;
    }

    // For normal pages, navigate to route-based URLs
    if (!categoryNameVi) {
      // Navigate to homepage (All category)
      navigate('/');
    } else {
      // Navigate to category page: /t/{slug}
      const slug = categoryNameToSlug(categoryNameVi);
      navigate(`/t/${slug}`);
    }

    // Scroll to grid after navigation
    // Use multiple attempts to ensure DOM is updated
    setTimeout(() => {
      requestAnimationFrame(() => {
        scrollToGrid();
        // Try again after a short delay in case content is still loading
        setTimeout(() => {
          scrollToGrid();
        }, 200);
      });
    }, 100);
  }

  // Show on homepage, category pages (/t/:slug), and test page
  const isHomePage = location?.pathname === '/';
  const isCategoryPage = location?.pathname?.startsWith('/t/');
  const isTestPage = location?.pathname?.includes('UnsplashGridTestPage');
  
  if (!isHomePage && !isCategoryPage && !isTestPage) {
    return null
  }

  return (
    <div className="category-navigation-container">
        <div className="category-navigation-wrapper">
          {/* Left scroll button - shown when scrolled right */}
          {canScrollLeft && (
            <button
              className="category-scroll-btn category-scroll-btn-left"
              onClick={scrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          
          <nav
            ref={categoryNavElementRef}
            className="category-navigation"
          >
            {allCategoryNames.map((categoryNameVi) => {
              const displayName = getDisplayName(categoryNameVi);
              const isActive = categoryNameVi === activeCategoryVi;
              return (
                <button
                  key={categoryNameVi || 'all'}
                  onClick={() => handleCategoryClick(categoryNameVi)}
                  className={`category-nav-link ${isActive ? 'active' : ''}`}
                >
                  {displayName}
                </button>
              );
            })}
          </nav>

          {/* Right scroll button - shown when there's content to scroll right */}
          {canScrollRight && (
            <button
              className="category-scroll-btn category-scroll-btn-right"
              onClick={scrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
    </div>
  )
})

export default CategoryNavigation

