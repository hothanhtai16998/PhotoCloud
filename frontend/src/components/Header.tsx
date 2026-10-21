import { memo, useState, useRef, useEffect, useLayoutEffect, useSyncExternalStore, lazy, Suspense, type MouseEvent } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { User, Menu, Heart, Download, Shield, Info, CalendarDays, Compass, Camera, BookOpen } from "lucide-react"
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
import { ThemeToggle } from './ThemeToggle'
import { openBookingModal } from '@/utils/bookingModalEvent'
import { LANGUAGE_SWITCHER_ENABLED } from "@/config/features"
import { useIsMobile } from "@/hooks/useIsMobile"
import './Header.css'
import './HeaderFrame.css'
import './PublicHeaderActions.css'
import { PublicHeaderActions } from './PublicHeaderActions'
import { getSiteTheme, setSiteTheme, subscribeSiteTheme } from '@/utils/siteTheme'
import { HEADER_LINKS } from '@/config/publicHeader'
import ImagePageSidebar from './ImagePageSidebar'
import './UserMenu.css'
import { useHeaderSurface } from '@/hooks/useHeaderSurface'

// Lazy load UploadModal to improve initial page load
const UploadModal = lazy(() => import('./UploadModal').then(module => ({ default: module.default })))

// NOTE: refreshToken cookie is httpOnly, so we can't check it from JavaScript
// Instead, we use optimistic rendering based on isInitializing and accessToken state

export const Header = memo(function Header() {
  useLayoutEffect(() => {
    document.getElementById('public-header-startup')?.remove();
  }, []);
  const accessToken = useAuthStore(state => state.accessToken)
  const signOut = useAuthStore(state => state.signOut)
  const isInitializing = useAuthStore(state => state.isInitializing)
  const user = useUserStore(state => state.user)
  const navigate = useNavigate()
  const location = useLocation()
  useHeaderSurface(location.pathname)
  const isMobile = useIsMobile()
  const isAdmin = Boolean(user?.isAdmin)
  const canOpenAdmin = Boolean(user?.isAdmin || user?.isSuperAdmin || (user?.permissions && Object.keys(user.permissions).length > 0))
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    let frame = 0
    let lastScrolled = window.scrollY > 12
    setIsScrolled(lastScrolled)
    const update = () => {
      frame = 0
      const nextScrolled = window.scrollY > 12
      if (nextScrolled !== lastScrolled) {
        lastScrolled = nextScrolled
        setIsScrolled(nextScrolled)
      }
    }
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
    }
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
  
  const [guestOnMount] = useState(() => getSessionItem('headerAuthHint') === 'guest');
  const theme = useSyncExternalStore(subscribeSiteTheme, getSiteTheme, () => 'light');
  useEffect(() => { if (!isInitializing) setSessionItem('headerAuthHint', accessToken ? 'account' : 'guest'); }, [accessToken, isInitializing]);
  const stableHasAuth = Boolean(accessToken) || (isInitializing && hadAuthOnMount);
  
  // PHOTOCLOUD-style: Optimistically show icons during initialization
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
    const handleClickOutside = (event: PointerEvent) => {
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


  const logoTopRequested = useRef(false)
  useLayoutEffect(() => {
    if (location.pathname !== '/' || !logoTopRequested.current) return
    logoTopRequested.current = false
    window.scrollTo({ top: 0, behavior: 'instant' })
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.key])
  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'instant' })
    else {
      logoTopRequested.current = true
      navigate('/')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <header data-header-frame className={`PHOTOCLOUD-header${location.pathname === '/' ? ' homepage-header' : ''}${isScrolled ? ' is-scrolled' : ''}`}>
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
            <ImagePageSidebar variant="header" />
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
                  onClick={() => openBookingModal()}
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
              <button type="button" className="mobile-header-icon" aria-label="Đặt lịch chụp" onClick={() => openBookingModal()}>
                <CalendarDays size={18} />
              </button>
              <Link to="/signin" className="mobile-header-icon" aria-label={t('auth.signIn')}>
                <User size={20} />
              </Link>
              <button ref={mobileMenuButtonRef} type="button" className="mobile-header-icon" aria-label="Menu" aria-expanded={mobileMenuOpen} aria-controls="header-mobile-navigation" onClick={(event) => {
                setMobileMenuTop(event.currentTarget.getBoundingClientRect().bottom + 4)
                setMobileMenuOpen(open => !open)
              }}><Menu size={20} /></button>
              </>
            )}
          </div>}

          {/* Search Bar */}
          <nav className="header-studio-nav" aria-label="Điều hướng studio">
            {HEADER_LINKS.map(link => (
              <Link key={link.href} to={link.href} aria-current={(link.exact ? location.pathname === link.href : location.pathname === link.href || location.pathname.startsWith(link.href + '/')) ? 'page' : undefined}>{link.label}</Link>
            ))}
          </nav>

          {/* Right Actions - Desktop */}
          {/* CRITICAL: Always reserve space to prevent layout shift on refresh */}
          {!isMobile && <div className="header-actions desktop-only">
            {/* CRITICAL: Show icons if we have token OR are initializing (optimistic) */}
            {stableHasAuth && (
              <div className="header-actions-group">
                <Button
                  onClick={() => openBookingModal()}
                  className="header-booking-button"
                  aria-label="Đặt lịch chụp"
                >
                  <CalendarDays size={16} />
                  <span>Đặt lịch chụp</span>
                </Button>
                {(canOpenAdmin || isAdmin) && <div className="header-admin-group">
                {canOpenAdmin && <Link to="/admin" className="header-library-action" aria-label="Quản trị" title="Quản trị"><Shield size={20} /></Link>}
                </div>}
                <NotificationBell />
                <UserMenu
                  user={user}
                  onSignOut={handleSignOut}
                  align="end"
                  showHeaderUtilities
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
            
            {!stableHasAuth && <PublicHeaderActions
              signInLabel={t('auth.signIn')} dark={theme === 'dark'} pending={isInitializing && !guestOnMount}
              signInLink={<Link to="/signin" className="header-link public-sign-in">{t('auth.signIn')}</Link>}
              onToggleTheme={() => setSiteTheme(theme === 'dark' ? 'light' : 'dark')}
              onBooking={() => openBookingModal()}
            />}
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
              <Link to="/collections" className="user-menu-item user-menu-item-mobile-only mobile-hamburger-menu-item" onClick={() => setMobileMenuOpen(false)}><Camera size={16} />Bộ sưu tập</Link>
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

              {canOpenAdmin && (
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

              <ThemeToggle menu />
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
