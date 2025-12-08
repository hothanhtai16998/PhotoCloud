import { useImageStore } from "@/stores/useImageStore"
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom"
import { useState, useEffect, useRef, memo, useCallback } from "react"
import { categoryService, type Category } from "@/services/categoryService"
import { appConfig } from '@/config/appConfig';
import { timingConfig } from '@/config/timingConfig';
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
  const [headerHeight, setHeaderHeight] = useState(0)
  const [isSticky, setIsSticky] = useState(false)
  const [navHeight, setNavHeight] = useState(0)
  const categoryNavRef = useRef<HTMLDivElement>(null)
  const categoryNavElementRef = useRef<HTMLElement>(null)
  const initialNavTopRef = useRef<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
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

  // Calculate header height for sticky positioning
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('.unsplash-header') as HTMLElement
      if (header) {
        const height = header.offsetHeight
        setHeaderHeight(height)
        // Set CSS variable for use in CSS - use requestAnimationFrame to prevent flash
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty('--header-height', `${height}px`)
        })
      }
    }

    // Initial calculation
    updateHeaderHeight()

    // Update on window resize - debounce to prevent excessive updates
    let resizeTimer: number | null = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(updateHeaderHeight, timingConfig.ui.resizeDebounceMs)
    }
    window.addEventListener('resize', handleResize)

    // Use ResizeObserver to watch for header size changes
    const header = document.querySelector('.unsplash-header')
    let resizeObserver: ResizeObserver | null = null
    if (header) {
      resizeObserver = new ResizeObserver(() => {
        // Debounce ResizeObserver updates too
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = window.setTimeout(updateHeaderHeight, timingConfig.ui.resizeDebounceMs)
      })
      resizeObserver.observe(header)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) clearTimeout(resizeTimer)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [])

  // Store nav height for spacer - measure when not sticky
  useEffect(() => {
    if (categoryNavRef.current && !isSticky) {
      const height = categoryNavRef.current.offsetHeight
      if (height > 0) {
        setNavHeight(height)
      }
    }
  }, [categoryObjects, isSticky])

  // Hide category navigation when modal opens to prevent layout shift
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const checkModalState = () => {
      // Check for scroll-locked class (added by useScrollLock when modal opens)
      // or image-modal-open class (if used elsewhere)
      const modalOpen = document.body.classList.contains('scroll-locked') || 
                       document.body.classList.contains('image-modal-open')
      setIsModalOpen(modalOpen)
      
      if (modalOpen) {
        // Modal is open - preserve current sticky state, don't let it change
        // The scroll handler will skip updates, so we just need to ensure state is preserved
      }
    }

    // Check immediately
    checkModalState()

    // Watch for modal state changes
    const observer = new MutationObserver(checkModalState)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  // Toggle header border when category nav is sticky
  useEffect(() => {
    const header = document.querySelector('.unsplash-header') as HTMLElement
    if (header) {
      if (isSticky) {
        header.classList.add('category-nav-sticky')
      } else {
        header.classList.remove('category-nav-sticky')
      }
    }
    return () => {
      // Cleanup: remove class on unmount
      if (header) {
        header.classList.remove('category-nav-sticky')
      }
    }
  }, [isSticky])

  // Handle scroll to make category nav stick to header
  useEffect(() => {
    if (!categoryNavRef.current || headerHeight === 0) return

    const nav = categoryNavRef.current
    let lastStickyState = isSticky // Initialize with current state

    // Store or update initial nav position
    // This recalculates when layout changes (e.g., Slider appears/disappears)
    const storeInitialPosition = (force = false) => {
      // Only store if not set, or force recalculation
      if (initialNavTopRef.current === null || force) {
        const rect = nav.getBoundingClientRect()
        const scrollY = window.scrollY || window.pageYOffset
        initialNavTopRef.current = rect.top + scrollY
      }
    }

    const handleScroll = () => {
      // Don't update sticky state when image modal is open
      if (document.body.classList.contains('image-modal-open') || 
          document.body.classList.contains('scroll-locked')) {
        return
      }

      const scrollY = window.scrollY || window.pageYOffset

      // Store initial position on first scroll or if not stored
      if (initialNavTopRef.current === null) {
        storeInitialPosition()
        if (initialNavTopRef.current === null) return
      }

      // If at top, don't stick and reset initial position for recalculation
      if (scrollY === 0) {
        if (lastStickyState !== false) {
          setIsSticky(false)
          lastStickyState = false
        }
        // Reset initial position when at top to allow recalculation after layout changes
        initialNavTopRef.current = null
        return
      }

      // Calculate: when would the header (at top of viewport) reach the nav's original position?
      // The nav's original top minus header height = scroll position where they meet
      const scrollPositionWhereHeaderReachesNav = initialNavTopRef.current - headerHeight

      // Nav should stick only when we've scrolled past that point
      const shouldStick = scrollY >= scrollPositionWhereHeaderReachesNav

      if (shouldStick !== lastStickyState) {
        setIsSticky(shouldStick)
        lastStickyState = shouldStick
      }
    }

    // Throttled scroll handler
    let rafId: number | null = null
    const throttledScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        handleScroll()
        rafId = null
      })
    }

    window.addEventListener('scroll', throttledScroll, { passive: true })

    // Watch for layout changes that might affect nav position (e.g., Slider appearing/disappearing)
    const layoutObserver = new ResizeObserver(() => {
      // Only reset if we're at the top or not sticky (to avoid flickering)
      const scrollY = window.scrollY || window.pageYOffset
      if (scrollY === 0 || !isSticky) {
        // Check if position actually changed significantly
        const rect = nav.getBoundingClientRect()
        const currentPosition = rect.top + scrollY
        
        // Only reset if position changed significantly (more than 10px) to avoid unnecessary recalculations
        if (initialNavTopRef.current === null || Math.abs(currentPosition - (initialNavTopRef.current || 0)) > 10) {
          initialNavTopRef.current = null
          // Recalculate position after a short delay to allow layout to settle
          setTimeout(() => {
            storeInitialPosition(true)
            handleScroll()
          }, 50)
        }
      }
    })

    // Observe the nav element and its parent for layout changes
    if (nav) {
      layoutObserver.observe(nav)
      if (nav.parentElement) {
        layoutObserver.observe(nav.parentElement)
      }
    }

    // Initial setup
    const initCheck = () => {
      storeInitialPosition()
      handleScroll()
    }

    setTimeout(initCheck, timingConfig.ui.initCheckDelayMs)

    return () => {
      window.removeEventListener('scroll', throttledScroll)
      layoutObserver.disconnect()
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [headerHeight, isSticky])

  // Check if mobile and update scroll button visibility
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check scroll position and update button visibility
  const checkScrollButtons = useCallback(() => {
    if (!categoryNavElementRef.current || !isMobile) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }

    const nav = categoryNavElementRef.current
    const { scrollLeft, scrollWidth, clientWidth } = nav
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1) // -1 for rounding
  }, [isMobile])

  // Update scroll button visibility when categories change or on scroll
  useEffect(() => {
    if (!categoryNavElementRef.current) return

    checkScrollButtons()

    const nav = categoryNavElementRef.current
    nav.addEventListener('scroll', checkScrollButtons)
    
    // Also check on resize
    const handleResize = () => {
      checkScrollButtons()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      nav.removeEventListener('scroll', checkScrollButtons)
      window.removeEventListener('resize', handleResize)
    }
  }, [categoryObjects, checkScrollButtons])

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    if (!categoryNavElementRef.current) return
    const nav = categoryNavElementRef.current
    const scrollAmount = nav.clientWidth * 0.8 // Scroll 80% of visible width
    nav.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }, [])

  const scrollRight = useCallback(() => {
    if (!categoryNavElementRef.current) return
    const nav = categoryNavElementRef.current
    const scrollAmount = nav.clientWidth * 0.8 // Scroll 80% of visible width
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

  const handleCategoryClick = (categoryNameVi: string) => {
    const isTestPage = location.pathname.includes('UnsplashGridTestPage');
    
    // For test page, use query params (backward compatibility)
    if (isTestPage) {
      const newCategory = categoryNameVi ? categoryNameVi : undefined;
      setSearchParams({ category: newCategory || 'all' });
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
  }

  // Show on homepage, category pages (/t/:slug), and test page
  const isHomePage = location.pathname === '/';
  const isCategoryPage = location.pathname.startsWith('/t/');
  const isTestPage = location.pathname.includes('UnsplashGridTestPage');
  
  if (!isHomePage && !isCategoryPage && !isTestPage) {
    return null
  }

  return (
    <>
      {/* Spacer to prevent layout shift when sticky */}
      {isSticky && navHeight > 0 && (
        <div
          style={{
            height: `${navHeight}px`,
            flexShrink: 0,
            pointerEvents: 'none'
          }}
          aria-hidden="true"
        />
      )}
      <div
        className={`category-navigation-container ${isSticky ? 'is-sticky' : ''} ${isModalOpen ? 'modal-open' : ''}`}
        ref={categoryNavRef}
      >
        <div className="category-navigation-wrapper">
          {/* Left scroll button - only on mobile */}
          {isMobile && canScrollLeft && (
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

          {/* Right scroll button - only on mobile */}
          {isMobile && canScrollRight && (
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
    </>
  )
})

export default CategoryNavigation

