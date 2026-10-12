import { memo, useState, useRef, useEffect, lazy, Suspense } from "react"
import { Link, useNavigate } from "react-router-dom"
import { User, Menu, Heart, Download, Shield, Info, CalendarDays } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUserStore } from "@/stores/useUserStore"
import { getSessionItem, setSessionItem, removeSessionItem } from "@/utils/safeStorage"
import { Avatar } from "./Avatar"
import NotificationBell from "./NotificationBell"
import { Button } from "@/components/ui/button"
import LOGO_CONFIG from "@/config/logo"
import { updateFaviconWithImage } from "@/utils/faviconUpdater"
import { t } from "@/i18n"
import { UserMenu } from "./UserMenu"
import { TextLogo } from "./TextLogo"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { openBookingModal } from '@/utils/bookingModalEvent'
import { LANGUAGE_SWITCHER_ENABLED } from "@/config/features"
import { useLocation } from "react-router-dom"
import { useIsMobile } from "@/hooks/useIsMobile"
import './Header.css'
import './UserMenu.css'

// Lazy load UploadModal to improve initial page load
const UploadModal = lazy(() => import('./UploadModal').then(module => ({ default: module.default })))

// NOTE: refreshToken cookie is httpOnly, so we can't check it from JavaScript
// Instead, we use optimistic rendering based on isInitializing and accessToken state

export const Header = memo(function Header() {
  const accessToken = useAuthStore(state => state.accessToken)
  const signOut = useAuthStore(state => state.signOut)
  const isInitializing = useAuthStore(state => state.isInitializing)
  const user = useUserStore(state => state.user)
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const isAdmin = Boolean(user?.isAdmin)
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 12)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMenuAnimating, setMobileMenuAnimating] = useState(false)
  const [mobileMenuTop, setMobileMenuTop] = useState(0)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  
  // CRITICAL: refreshToken cookie is httpOnly, so we can't check it from JavaScript
  // Instead, use sessionStorage to persist auth state across refreshes
  // This prevents icons from flashing on refresh
  // Initialize stableHasAuth from sessionStorage (persists across refreshes)
  const [hadAuthOnMount] = useState(() => getSessionItem('hasAuth') === 'true');
  
  // Update sessionStorage when accessToken changes
  useEffect(() => {
    if (accessToken) {
      setSessionItem('hasAuth', 'true');
    } else if (!isInitializing) {
      // Only clear on logout (when not initializing), not on initial load
      removeSessionItem('hasAuth');
    }
  }, [accessToken, isInitializing]);
  
  const stableHasAuth = Boolean(accessToken) || (isInitializing && hadAuthOnMount);
  
  // Unsplash-style: Optimistically show icons during initialization
  // Only show placeholder if we're initializing AND never had auth before
  // This prevents flash while still allowing icons to appear immediately
  const showPlaceholder = isInitializing && !accessToken && !stableHasAuth;
  
  useEffect(() => {
    // Defer favicon update to avoid blocking initial page load
    // This reduces initial payload when logo type is 'text' (logo image won't load)
    const timeoutId = setTimeout(() => {
      updateFaviconWithImage(LOGO_CONFIG.faviconLogo)
    }, 500); // Defer by 500ms to let critical resources load first
    
    return () => clearTimeout(timeoutId);
  }, [])

  // Trigger animation when mobile menu appears
  useEffect(() => {
    let firstFrame = 0
    let secondFrame = 0
    if (mobileMenuOpen) {
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          setMobileMenuAnimating(true)
        })
      })
    } else {
      setMobileMenuAnimating(false)
    }
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [mobileMenuOpen])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        mobileMenuButtonRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !mobileMenuButtonRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setMobileMenuOpen(false)
          mobileMenuButtonRef.current?.focus()
        }
      }
      const closeOnResize = () => setMobileMenuOpen(false)
      document.addEventListener('pointerdown', handleClickOutside)
      document.addEventListener('keydown', closeOnEscape)
      window.addEventListener('resize', closeOnResize)
      return () => {
        document.removeEventListener('pointerdown', handleClickOutside)
        document.removeEventListener('keydown', closeOnEscape)
        window.removeEventListener('resize', closeOnResize)
      }
    }
    return undefined
  }, [mobileMenuOpen])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, accessToken])


  const handleLogoClick = () => {
    if (location.pathname === '/') {
      // If already on homepage, scroll to top (smooth UX)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <header className={`unsplash-header${location.pathname === '/' ? ' homepage-header' : ''}${isScrolled ? ' is-scrolled' : ''}`}>
      <div className="header-top">
        <div className="header-container">
          {/* Logo */}
          <div className="header-logo-container">
            <Link to="/" className="header-logo" onClick={handleLogoClick} aria-label="PhotoCloud - Trang chủ">
              {LOGO_CONFIG.type === 'text' ? (
                <TextLogo 
                  text={LOGO_CONFIG.textLogo.text}
                  fontWeight={LOGO_CONFIG.textLogo.fontWeight}
                  className="header-text-logo"
                />
              ) : (
                <img
                  src={LOGO_CONFIG.mainLogo}
                  alt={LOGO_CONFIG.altText}
                  className="header-logo-image"
                  width={LOGO_CONFIG.headerWidth || 120}
                  height={LOGO_CONFIG.headerHeight}
                  style={{ height: `${LOGO_CONFIG.headerHeight}px`, width: 'auto' }}
                />
              )}
            </Link>
          </div>

          {/* Mobile Header Actions - Icons visible on mobile */}
          {/* CRITICAL: Always reserve space to prevent layout shift on refresh */}
          {isMobile && <div className="mobile-header-actions" style={{ minWidth: '80px', height: '40px', position: 'relative', marginRight: 0, paddingRight: 0 }}>
            {/* CRITICAL: Show icons if we have token OR are initializing (optimistic) */}
            {stableHasAuth && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <button
                  type="button"
                  className="mobile-header-icon mobile-booking-shortcut"
                  aria-label="Đặt lịch chụp"
                  onClick={openBookingModal}
                >
                  <CalendarDays size={18} />
                </button>
                <div className="mobile-header-icon-wrapper">
                  <NotificationBell />
                </div>
                <UserMenu
                  user={user}
                  onSignOut={handleSignOut}
                  align="start"
                  onUpload={isAdmin ? () => setUploadModalOpen(true) : undefined}
                  trigger={
                    <Avatar
                      user={user}
                      size={32}
                      className="mobile-header-avatar"
                      fallbackClassName="mobile-header-avatar-placeholder"
                    />
                  }
                />
                <button
                  ref={mobileMenuButtonRef}
                  className="mobile-header-icon mobile-hamburger-button"
                  aria-label="Menu"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="header-mobile-navigation"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileMenuTop(e.currentTarget.getBoundingClientRect().bottom + 4);
                    setMobileMenuOpen(open => !open);
                  }}
                  style={{
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Menu size={20} />
                </button>
              </div>
            )}
            
            {/* Placeholder - only visible during initialization when no cookie/token */}
            {showPlaceholder && (
              <div style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
              </div>
            )}
            
            {/* Sign In Link - only visible when not authenticated and not initializing */}
            {!showPlaceholder && !stableHasAuth && (
              <>
              <button type="button" className="mobile-header-icon" aria-label="Đặt lịch chụp" onClick={openBookingModal}>
                <CalendarDays size={18} />
              </button>
              <Link to="/signin" className="mobile-header-icon" aria-label={t('auth.signIn')}>
                <User size={20} />
              </Link>
              </>
            )}
          </div>}

          {/* Search Bar */}
          <nav className="header-studio-nav" aria-label="Điều hướng studio">
            <Link to="/packages" aria-current={location.pathname.startsWith('/packages') ? 'page' : undefined}>Gói chụp</Link>
            <Link to="/collections" aria-current={location.pathname.startsWith('/collections') ? 'page' : undefined}>Bộ sưu tập</Link>
            <Link to="/about" aria-current={location.pathname === '/about' ? 'page' : undefined}>Về studio</Link>
          </nav>

          {/* Right Actions - Desktop */}
          {/* CRITICAL: Always reserve space to prevent layout shift on refresh */}
          {!isMobile && <div className="header-actions desktop-only">
            {/* CRITICAL: Show icons if we have token OR are initializing (optimistic) */}
            {stableHasAuth && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Button
                  onClick={openBookingModal}
                  className="header-booking-button"
                  aria-label="Đặt lịch chụp"
                >
                  <CalendarDays size={16} />
                  <span>Đặt lịch chụp</span>
                </Button>
                {isAdmin && <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setUploadModalOpen(true);
                  }}
                  className="header-link header-upload-button"
                >
                  {t('header.addImage')}
                </Button>}
                <NotificationBell />
                <UserMenu
                  user={user}
                  onSignOut={handleSignOut}
                  align="end"
                  onUpload={isAdmin ? () => setUploadModalOpen(true) : undefined}
                  trigger={
                    <Avatar
                      user={user}
                      size={42}
                      className="header-user-avatar"
                      fallbackClassName="header-user-avatar-placeholder"
                    />
                  }
                />
              </div>
            )}
            
            {/* Placeholder - only visible during initialization when no cookie/token */}
            {showPlaceholder && (
              <div style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <div style={{ width: '100px', height: '32px', flexShrink: 0 }} />
                <div style={{ width: '60px', height: '60px', flexShrink: 0 }} />
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0 }} />
              </div>
            )}
            
            {/* Sign In Links - only visible when not authenticated and not initializing */}
            {!showPlaceholder && !stableHasAuth && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <Link to="/signin" className="header-link">{t('auth.signIn')}</Link>
                <Button onClick={openBookingModal} className="header-booking-button"><CalendarDays size={16} /><span>Đặt lịch chụp</span></Button>
              </div>
            )}
          </div>}
        </div>
      </div>

      {/* Upload Modal - Lazy loaded, only render when open */}
      {uploadModalOpen && isAdmin && (
        <Suspense fallback={null}>
          <UploadModal
            isOpen={uploadModalOpen}
            onClose={() => {
              setUploadModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* Mobile Menu Dropdown - Only visible at 768px and below */}
      {mobileMenuOpen && (
          <div
            id="header-mobile-navigation"
            ref={mobileMenuRef}
            className={`user-menu-content ${mobileMenuAnimating ? 'menu-enter' : ''}`}
            style={{
              position: 'fixed',
              top: `${mobileMenuTop}px`,
              right: '0px',
              left: 'auto',
              zIndex: 2002,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="user-menu-items mobile-hamburger-menu">
              <Link 
                to="/favorites" 
                className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <Heart size={16} />
                {t('header.favorites')}
              </Link>

              <Link 
                to="/explore" 
                className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <Compass size={16} />
                Khám phá
              </Link>

              <Link 
                to="/packages" 
                className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <Camera size={16} />
                Gói chụp
              </Link>

              <Link 
                to="/blog" 
                className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen size={16} />
                Blog
              </Link>

              <Link 
                to="/downloads" 
                className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <Download size={16} />
                {t('profile.downloadHistory')}
              </Link>

              {user?.isAdmin && (
                <Link 
                  to="/admin" 
                  className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield size={16} />
                  Admin
                </Link>
              )}

              <div className="user-menu-separator user-menu-separator-mobile-only" />

              <Link 
                to="/about" 
                className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <Info size={16} />
                {t('header.about')}
              </Link>

              <Link 
                to={user?.username ? `/@${user.username}` : '/profile'} 
                className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={16} />
                {t('header.account')}
              </Link>

              {LANGUAGE_SWITCHER_ENABLED && <>
              <div className="user-menu-separator user-menu-separator-mobile-only" />
              <div className="user-menu-item-mobile-only-wrapper mobile-hamburger-menu-item">
                <LanguageSwitcher variant="menu-item" onSwitch={() => setMobileMenuOpen(false)} />
              </div>
              </>}
            </div>
          </div>
      )}

    </header >
  )
})

export default Header
