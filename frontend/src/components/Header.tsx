import { memo, useState, useRef, useEffect, useLayoutEffect, useMemo, lazy, Suspense } from "react"
import { Link, useNavigate } from "react-router-dom"
import { User, Menu, Heart, Download, Shield, Info, Globe } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUserStore } from "@/stores/useUserStore"
import { SearchBar, type SearchBarRef } from "./SearchBar"
import { Avatar } from "./Avatar"
import NotificationBell from "./NotificationBell"
import { Button } from "@/components/ui/button"
import LOGO_CONFIG from "@/config/logo"
import { updateFaviconWithImage } from "@/utils/faviconUpdater"
import { t } from "@/i18n"
import { UserMenu } from "./UserMenu"
import CategoryNavigation from "./CategoryNavigation"
import { TextLogo } from "./TextLogo"
import { LanguageSwitcher } from "./LanguageSwitcher"
import './Header.css'

// Lazy load UploadModal to improve initial page load
const UploadModal = lazy(() => import('./UploadModal').then(module => ({ default: module.default })))

// NOTE: refreshToken cookie is httpOnly, so we can't check it from JavaScript
// Instead, we use optimistic rendering based on isInitializing and accessToken state

export const Header = memo(function Header() {
  const { accessToken, signOut, isInitializing } = useAuthStore()
  const { user } = useUserStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMenuAnimating, setMobileMenuAnimating] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const searchBarRef = useRef<SearchBarRef>(null)
  
  // CRITICAL: refreshToken cookie is httpOnly, so we can't check it from JavaScript
  // Instead, use sessionStorage to persist auth state across refreshes
  // This prevents icons from flashing on refresh
  // Initialize stableHasAuth from sessionStorage (persists across refreshes)
  const getInitialHasAuth = (): boolean => {
    if (typeof window === 'undefined') return false;
    const persisted = sessionStorage.getItem('hasAuth');
    return persisted === 'true';
  };
  const hasAuthRef = useRef(getInitialHasAuth());
  
  // Update sessionStorage when accessToken changes
  useEffect(() => {
    if (accessToken) {
      hasAuthRef.current = true;
      sessionStorage.setItem('hasAuth', 'true');
    } else if (!isInitializing) {
      // Only clear on logout (when not initializing), not on initial load
      hasAuthRef.current = false;
      sessionStorage.removeItem('hasAuth');
    }
  }, [accessToken, isInitializing]);
  
  const stableHasAuth = hasAuthRef.current;
  
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
    if (mobileMenuOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMobileMenuAnimating(true)
        })
      })
    } else {
      setMobileMenuAnimating(false)
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
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    return undefined
  }, [mobileMenuOpen])


  const handleLogoClick = () => {
    if (window.location.pathname !== '/') {
      // Navigate to homepage (HomePage will fetch fresh data on mount)
      navigate('/')
    } else {
      // If already on homepage, scroll to top (smooth UX)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <header className="unsplash-header">
      <div className="header-top">
        <div className="header-container">
          {/* Logo */}
          <div className="header-logo-container">
            <Link to="/" className="header-logo" onClick={handleLogoClick}>
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
          <div className="mobile-header-actions" style={{ minWidth: '80px', height: '40px', position: 'relative' }}>
            {/* CRITICAL: Show icons if we have token OR are initializing (optimistic) */}
            {(accessToken || (isInitializing && stableHasAuth) || stableHasAuth) && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div className="mobile-header-icon-wrapper">
                  <NotificationBell />
                </div>
                <UserMenu
                  user={user}
                  onSignOut={handleSignOut}
                  align="start"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileMenuOpen(!mobileMenuOpen);
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
            {!showPlaceholder && !accessToken && !stableHasAuth && (
              <Link to="/signin" className="mobile-header-icon" aria-label={t('auth.signIn')}>
                <User size={20} />
              </Link>
            )}
          </div>

          {/* Search Bar */}
          <SearchBar ref={searchBarRef} />

          {/* Right Actions - Desktop */}
          {/* CRITICAL: Always reserve space to prevent layout shift on refresh */}
          <div className="header-actions desktop-only" style={{ minWidth: '250px', height: '56px', position: 'relative' }}>
            {/* CRITICAL: Show icons if we have token OR are initializing (optimistic) */}
            {(accessToken || (isInitializing && stableHasAuth) || stableHasAuth) && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setUploadModalOpen(true);
                  }}
                  className="header-link header-upload-button"
                >
                  {t('header.addImage')}
                </Button>
                <NotificationBell />
                <UserMenu
                  user={user}
                  onSignOut={handleSignOut}
                  align="end"
                  trigger={
                    <Avatar
                      user={user}
                      size={50}
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
            {!showPlaceholder && !accessToken && !stableHasAuth && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <Link to="/signin" className="header-link">{t('auth.signIn')}</Link>
                <Button onClick={() => navigate('/signin')} className="header-button">{t('header.addImage')}</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Navigation - Second row in header */}
      <CategoryNavigation />

      {/* Upload Modal - Lazy loaded, only render when open */}
      {uploadModalOpen && (
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
      {mobileMenuOpen && mobileMenuButtonRef.current && (() => {
        const rect = mobileMenuButtonRef.current.getBoundingClientRect();
        return (
          <div
            ref={mobileMenuRef}
            className={`user-menu-content ${mobileMenuAnimating ? 'menu-enter' : ''}`}
            style={{
              position: 'fixed',
              top: `${rect.bottom + 4}px`,
              right: `${window.innerWidth - rect.right}px`,
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

              <div className="user-menu-separator user-menu-separator-mobile-only" />

              <div className="user-menu-item-mobile-only-wrapper mobile-hamburger-menu-item">
                <LanguageSwitcher variant="menu-item" onSwitch={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        );
      })()}

    </header >
  )
})

export default Header