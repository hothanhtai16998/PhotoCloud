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
  const forceStickyRef = useRef<boolean>(false) // Flag to prevent scroll handler from resetting sticky when forced
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
      // BUT: Don't reset if we've forced sticky via category click
      if (scrollY === 0 && !forceStickyRef.current) {
        if (lastStickyState !== false) {
          setIsSticky(false)
          lastStickyState = false
        }
        // Reset initial position when at top to allow recalculation after layout changes
        initialNavTopRef.current = null
        return
      }
      
      // If we've forced sticky and scrolled past threshold, clear the force flag
      if (forceStickyRef.current && scrollY > 0) {
        // Check if we're past the sticky threshold
        if (initialNavTopRef.current !== null) {
          const scrollPositionWhereHeaderReachesNav = initialNavTopRef.current - headerHeight
          if (scrollY >= scrollPositionWhereHeaderReachesNav) {
            // We're past the threshold, sticky state is now natural - clear force flag
            forceStickyRef.current = false
          }
        }
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

  const handleCategoryClick = (categoryNameVi: string) => {
    const isTestPage = location.pathname.includes('UnsplashGridTestPage');
    
    // For test page, use query params (backward compatibility)
    if (isTestPage) {
      const newCategory = categoryNameVi ? categoryNameVi : undefined;
      setSearchParams({ category: newCategory || 'all' });
      return;
    }

    // Force category nav to stick with header when clicking a category
    forceStickyRef.current = true; // Set flag to prevent scroll handler from resetting
    setIsSticky(true);

    // For normal pages, navigate to route-based URLs
    if (!categoryNameVi) {
      // Navigate to homepage (All category)
      navigate('/');
    } else {
      // Navigate to category page: /t/{slug}
      const slug = categoryNameToSlug(categoryNameVi);
      navigate(`/t/${slug}`);
    }

    // Scroll to image grid after navigation (only when clicking category, not on initial load)
    // Use setTimeout to wait for DOM to update after navigation
    setTimeout(() => {
      const imageGridContainer = document.getElementById('image-grid-container');
      if (imageGridContainer && categoryNavRef.current && headerHeight > 0) {
        // Store initial position if not already set (needed for sticky calculation)
        if (initialNavTopRef.current === null && categoryNavRef.current) {
          const nav = categoryNavRef.current;
          const rect = nav.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset;
          initialNavTopRef.current = rect.top + scrollY;
        }

        // Get the position of the image grid container
        const rect = imageGridContainer.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const targetPosition = rect.top + scrollY;

        // Category nav is now sticky, so account for both header and sticky nav height
        const navHeight = categoryNavRef.current.offsetHeight;
        const spacingBelowNav = 30; // Spacing between sticky nav and content (red line)
        const offset = headerHeight + navHeight + spacingBelowNav; // Header + Nav + Spacing

        // Calculate minimum scroll position to maintain sticky state
        // The nav should stick when scrollY >= (initialNavTop - headerHeight)
        // We need to scroll past this threshold to keep it sticky
        const minScrollForSticky = initialNavTopRef.current 
          ? Math.max(initialNavTopRef.current - headerHeight, headerHeight + navHeight + spacingBelowNav)
          : headerHeight + navHeight + spacingBelowNav;

        // Scroll to image grid position, ensuring we're past the sticky threshold
        // This will show the content below the sticky nav with proper spacing (red line)
        const finalScrollPosition = Math.max(
          targetPosition - offset,
          minScrollForSticky + 1 // Add 1px to ensure we're past the threshold
        );

        // Scroll instantly to the image grid position, accounting for sticky nav
        window.scrollTo({
          top: finalScrollPosition,
          behavior: 'auto' // Instant scroll
        });
        
        // After scrolling, the scroll handler will naturally maintain sticky state
        // The force flag will be cleared once we're past the threshold
      }
    }, 100); // Small delay to ensure DOM has updated after navigation
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
      {/* Spacer to prevent layout shift when sticky - includes nav height + spacing */}
      {isSticky && navHeight > 0 && (
        <div
          style={{
            height: `${navHeight + 30}px`, // navHeight + margin-bottom spacing (30px)
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
    </>
  )
})

export default CategoryNavigation

