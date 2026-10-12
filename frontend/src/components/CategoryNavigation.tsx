import { notifyCategoryNavigation } from '@/utils/categoryNavigationEvent';
import { useImageStore } from "@/stores/useImageStore"
import { useNavigate, useLocation, useSearchParams, useMatch } from "react-router-dom"
import { useState, useEffect, useRef, memo, useCallback } from "react"
import { categoryService, type Category } from "@/services/categoryService"
import { categoryNameToSlug, getCategoryNameFromSlug } from '@/utils/categorySlug';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t, getLocale } from '@/i18n';
import { getTranslatedCategoryName } from '@/utils/categoryTranslations';
import './CategoryNavigation.css'

export const CategoryNavigation = memo(function CategoryNavigation() {
  const { pathname } = useLocation()
  // Chỉ hiển thị ở các trang collections/photo grid — ẩn khỏi trang chủ `/` và landing page
  // vì hero booking đã chiếm đủ viewport, nav sẽ đẩy hero xuống thành nhiều viewport.
  if (
    pathname === '/' ||
    pathname.startsWith('/t/') ||
    pathname.includes('PHOTOCLOUDGridTestPage')
  ) {
    return null;
  }
  return <CategoryNavigationContent />
})

const CategoryNavigationContent = memo(function CategoryNavigationContent() {
  const currentCategory = useImageStore(state => state.currentCategory)
  const navigate = useNavigate()
  const location = useLocation()
  const [, setSearchParams] = useSearchParams();
  const categorySlug = useMatch('/t/:categorySlug')?.params.categorySlug;
  const [categoryObjects, setCategoryObjects] = useState<Category[]>([])
  const categoryNavElementRef = useRef<HTMLElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [locale, setLocaleState] = useState<'vi' | 'en'>(getLocale)
  
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
  const activeCategoryVi = location.pathname === '/' ? '' : activeCategoryFromUrl || currentCategory || '';
  
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

  // Coalesce scroll/layout notifications into one measurement per frame.
  useEffect(() => {
    const nav = categoryNavElementRef.current
    if (!nav) return
    let frame = 0
    const scheduleCheck = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        checkScrollButtons()
      })
    }
    const observer = new ResizeObserver(scheduleCheck)
    observer.observe(nav)
    for (const child of nav.children) observer.observe(child)
    nav.addEventListener('scroll', scheduleCheck, { passive: true })
    scheduleCheck()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      nav.removeEventListener('scroll', scheduleCheck)
    }
  }, [categoryObjects, locale, checkScrollButtons])

  // Scroll handlers - match PHOTOCLOUD's smooth scrolling behavior
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
    let active = true
    let requestId = 0
    const loadCategories = async (forceRefresh = false) => {
      const id = ++requestId
      try {
        const fetchedCategories = await categoryService.fetchCategories(forceRefresh)
        if (active && id === requestId) setCategoryObjects(fetchedCategories)
      } catch (error) {
        if (active && id === requestId) console.error('Failed to load categories:', error)
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
      active = false
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated)
    }
  }, [])

  const handleCategoryClick = (categoryNameVi: string) => {
    notifyCategoryNavigation(categoryNameVi);
    if (location.pathname.includes('PHOTOCLOUDGridTestPage')) {
      setSearchParams({ category: categoryNameVi || 'all' })
    } else {
      const target = categoryNameVi ? `/t/${categoryNameToSlug(categoryNameVi)}` : '/'
      if (target !== location.pathname) navigate(target)
    }
  }

  return (
    <div className="category-navigation-container">
        <div className="category-navigation-wrapper">
          {/* Left scroll button - shown when scrolled right */}
          {canScrollLeft && (
            <button
              type="button"
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
                  type="button"
                  key={categoryNameVi || 'all'}
                  onClick={() => handleCategoryClick(categoryNameVi)}
                  className={`category-nav-link ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {displayName}
                </button>
              );
            })}
          </nav>

          {/* Right scroll button - shown when there's content to scroll right */}
          {canScrollRight && (
            <button
              type="button"
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

