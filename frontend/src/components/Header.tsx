import { memo, useState, useRef, useEffect, lazy, Suspense } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Shield, Heart, User, LogOut, Info } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUserStore } from "@/stores/useUserStore"
import { useImageStore } from "@/stores/useImageStore"
import { SearchBar } from "./SearchBar"
import { Avatar } from "./Avatar"
import NotificationBell, { type NotificationBellRef } from "./NotificationBell"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { ThemeToggle } from "./admin/ThemeToggle"
import { Button } from "@/components/ui/button"
import LOGO_CONFIG from "@/config/logo"
import { updateFaviconWithImage } from "@/utils/faviconUpdater"
import { t } from "@/i18n"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import CategoryNavigation from "./CategoryNavigation"
import './Header.css'

// Lazy load UploadModal to improve initial page load
const UploadModal = lazy(() => import('./UploadModal').then(module => ({ default: module.default })))

// Reusable user menu items component
function UserMenuItems({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  return (
    <>
      <DropdownMenuItem asChild>
        <Link to="/favorites" className="user-menu-item">
          <Heart size={16} />
          {t('header.favorites')}
        </Link>
      </DropdownMenuItem>
      {user?.isAdmin && (
        <DropdownMenuItem asChild>
          <Link to="/admin" className="user-menu-item">
            <Shield size={16} />
            Admin
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/about" className="user-menu-item">
          <Info size={16} />
          {t('header.about')}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/profile" className="user-menu-item">
          <User size={16} />
          {t('header.account')}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <ThemeToggle asMenuItem={true} />
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <LanguageSwitcher variant="menu-item" />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onSignOut}
        className="user-menu-item"
        variant="destructive"
      >
        <LogOut size={16} />
        {t('auth.signOut')}
      </DropdownMenuItem>
    </>
  );
}

// Reusable user menu dropdown component
function UserMenuDropdown({ 
  user, 
  onSignOut, 
  onOpenChange,
  variant = "desktop"
}: { 
  user: any; 
  onSignOut: () => void;
  onOpenChange?: (open: boolean) => void;
  variant?: "mobile" | "desktop";
}) {
  const isMobile = variant === "mobile";
  
  return (
    <DropdownMenu 
      modal={false}
      onOpenChange={onOpenChange}
    >
      <DropdownMenuTrigger asChild>
        <button 
          className={isMobile ? "mobile-header-icon" : "header-link user-menu-trigger"} 
          aria-label={t('header.userMenu')}
        >
          {user ? (
            <Avatar
              user={user}
              size={32}
              className={isMobile ? "mobile-header-avatar" : "header-user-avatar"}
              fallbackClassName={isMobile ? "mobile-header-avatar-placeholder" : "header-user-avatar-placeholder"}
            />
          ) : (
            <User size={isMobile ? 20 : 18} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isMobile ? "start" : "end"} 
        side="bottom" 
        className="user-menu-content"
      >
        <UserMenuItems user={user} onSignOut={onSignOut} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Header = memo(function Header() {
  const { accessToken, signOut } = useAuthStore()
  const { user } = useUserStore()
  const { fetchImages } = useImageStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const notificationBellRef = useRef<NotificationBellRef>(null)

  useEffect(() => {
    // Update favicon with configured logo on initial load
    updateFaviconWithImage(LOGO_CONFIG.faviconLogo)
  }, [])

  const handleLogoClick = () => {
    if (window.location.pathname !== '/') {
      navigate('/')
    } else {
      // If already on homepage, refresh images
      fetchImages()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  const handleUserMenuOpen = (open: boolean) => {
    if (open && notificationBellRef.current) {
      notificationBellRef.current.close();
    }
  }

  return (
    <header className="photo-header">
      <div className="header-top">
        <div className="header-container">
          {/* Logo */}
          <div className="header-logo-container">
            <Link to="/" className="header-logo" onClick={handleLogoClick}>
              <img
                src={LOGO_CONFIG.mainLogo}
                alt={LOGO_CONFIG.altText}
                className="header-logo-image"
                width="56"
                height="40"
                style={{ height: `${LOGO_CONFIG.headerHeight}px`, width: 'auto' }}
                loading="eager"
                fetchPriority="high"
              />
            </Link>
          </div>

          {/* Mobile Header Actions - Icons visible on mobile */}
          <div className="mobile-header-actions">
            {accessToken ? (
              <>
                {/* Notification Bell */}
                <div className="mobile-header-icon-wrapper">
                  <NotificationBell ref={notificationBellRef} />
                </div>
                {/* User Icon/Avatar - Dropdown Menu like Desktop */}
                <UserMenuDropdown
                  user={user}
                  onSignOut={handleSignOut}
                  variant="mobile"
                  onOpenChange={handleUserMenuOpen}
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
          <SearchBar />

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
                <NotificationBell ref={notificationBellRef} />
                <UserMenuDropdown
                  user={user}
                  onSignOut={handleSignOut}
                  variant="desktop"
                  onOpenChange={handleUserMenuOpen}
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