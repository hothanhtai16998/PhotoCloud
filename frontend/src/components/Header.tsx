import { memo, useState, useRef, useEffect, lazy, Suspense } from "react"
import { Link, useNavigate } from "react-router-dom"
import { User } from "lucide-react"
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
import { WebSocketStatus } from "./WebSocketStatus"
import './Header.css'

// Lazy load UploadModal to improve initial page load
const UploadModal = lazy(() => import('./UploadModal').then(module => ({ default: module.default })))

export const Header = memo(function Header() {
  const { accessToken, signOut, isInitializing } = useAuthStore()
  const { user } = useUserStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const searchBarRef = useRef<SearchBarRef>(null)
  
  // Track if we've completed initial auth check to prevent showing sign-in button prematurely
  // Show placeholder during initialization to prevent layout shift
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  
  useEffect(() => {
    // Once initialization completes, mark as checked
    // If we have an accessToken, we can mark as checked immediately
    if (!isInitializing) {
      // Once initialization is complete, we know the auth state
      // Set hasCheckedAuth to true regardless of whether we have a token or not
      // This allows us to show the correct UI (buttons if logged in, sign-in if not)
      const timer = setTimeout(() => {
        setHasCheckedAuth(true)
      }, 50) // Small delay to ensure Zustand state has propagated
      return () => clearTimeout(timer)
    } else {
      // Reset when initialization starts again (e.g., on rapid refresh)
      setHasCheckedAuth(false)
    }
  }, [isInitializing])
  
  // Show placeholder only during actual initialization
  // Once initialization is complete, show the appropriate UI based on accessToken
  const showPlaceholder = isInitializing || !hasCheckedAuth

  useEffect(() => {
    // Update favicon with configured logo on initial load
    updateFaviconWithImage(LOGO_CONFIG.faviconLogo)
  }, [])


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
              <img
                src={LOGO_CONFIG.mainLogo}
                alt={LOGO_CONFIG.altText}
                className="header-logo-image"
                width={LOGO_CONFIG.headerWidth || 120}
                height={LOGO_CONFIG.headerHeight}
                style={{ height: `${LOGO_CONFIG.headerHeight}px`, width: 'auto' }}
              />
            </Link>
          </div>

          {/* Mobile Header Actions - Icons visible on mobile */}
          <div className="mobile-header-actions">
            {showPlaceholder ? (
              // Prevent layout shift: show placeholder with exact dimensions during auth init
              // Matches: NotificationBell (40px on mobile) + Avatar (32px) + gap (8px) = ~80px total
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', // Match mobile-header-actions gap
                minWidth: '80px', // Reserve space for NotificationBell + Avatar
                height: '40px' // Match NotificationBell height on mobile
              }}>
                <div style={{ width: '40px', height: '40px', flexShrink: 0 }} /> {/* Placeholder for NotificationBell (40x40 on mobile) */}
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} /> {/* Placeholder for Avatar */}
              </div>
            ) : accessToken ? (
              <>
                {/* Notification Bell */}
                <div className="mobile-header-icon-wrapper">
                  <NotificationBell />
                </div>
                {/* User Icon/Avatar - Custom Menu */}
                <UserMenu
                  user={user}
                  onSignOut={handleSignOut}
                  align="start"
                  trigger={
                    user ? (
                      <Avatar
                        user={user}
                        size={32}
                        className="mobile-header-avatar"
                        fallbackClassName="mobile-header-avatar-placeholder"
                      />
                    ) : (
                      <User size={20} />
                    )
                  }
                />
              </>
            ) : (
              <>
                {/* User Icon for Sign In */}
                <Link to="/signin" className="mobile-header-icon" aria-label={t('auth.signIn')}>
                  <User size={20} />
                </Link>
              </>
            )}

          </div>

          {/* Search Bar */}
          <SearchBar ref={searchBarRef} />

          {/* Right Actions - Desktop */}
          <div className="header-actions desktop-only">
            {showPlaceholder ? (
              // Prevent layout shift: show placeholder with exact dimensions during auth init
              // Matches: WebSocketStatus (~120px) + Upload button (~100px) + NotificationBell (60px) + Avatar (50px) + gaps (20px × 3 = 60px)
              // Total: ~390px to prevent any layout shift
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px', // Match header-actions gap exactly
                minWidth: '390px', // Reserve space for all elements
                height: '56px' // Match header-container height
              }}>
                <div style={{ width: '120px', height: '24px', flexShrink: 0 }} /> {/* Placeholder for WebSocketStatus */}
                <div style={{ width: '100px', height: '32px', flexShrink: 0 }} /> {/* Placeholder for Upload button */}
                <div style={{ width: '60px', height: '60px', flexShrink: 0 }} /> {/* Placeholder for NotificationBell (60x60) */}
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0 }} /> {/* Placeholder for Avatar (50x50) */}
              </div>
            ) : accessToken ? (
              <>
                <WebSocketStatus />
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
                    user ? (
                      <Avatar
                        user={user}
                        size={50}
                        className="header-user-avatar"
                        fallbackClassName="header-user-avatar-placeholder"
                      />
                    ) : (
                      <User size={18} />
                    )
                  }
                />
              </>
            ) : (
              <>
                <Link to="/signin" className="header-link">{t('auth.signIn')}</Link>
                <Button onClick={() => navigate('/signin')} className="header-button">{t('header.addImage')}</Button>
              </>
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

    </header >
  )
})

export default Header