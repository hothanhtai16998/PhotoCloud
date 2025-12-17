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
import './Header.css'

// Lazy load UploadModal to improve initial page load
const UploadModal = lazy(() => import('./UploadModal').then(module => ({ default: module.default })))

export const Header = memo(function Header() {
  const { accessToken, signOut } = useAuthStore()
  const { user } = useUserStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const searchBarRef = useRef<SearchBarRef>(null)

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
            {accessToken ? (
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
            {accessToken ? (
              <>
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