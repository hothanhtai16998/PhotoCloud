import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Heart, User, LogOut, Info, Moon, Sun, Download } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { t } from '@/i18n'
import { useUserStore } from '@/stores/useUserStore'
import './Header.css'

// Theme toggle menu item that doesn't use Radix UI
// Currently hidden but keeping code for future use
function ThemeToggleMenuItem({ onToggle }: { onToggle: () => void }) {
  // Initialize state from actual DOM state to ensure sync
  const [isDark, setIsDark] = useState(() => {
    // Force light theme for now - always return false
    // Future: Uncomment below to restore dark theme support
    // const hasDarkClass = document.documentElement.classList.contains('dark')
    // if (hasDarkClass) {
    //   return true
    // }
    // const saved = localStorage.getItem('theme')
    // if (saved === 'dark') return true
    // if (saved === 'light') return false
    // return window.matchMedia('(prefers-color-scheme: dark)').matches
    return false
  })

  useEffect(() => {
    const root = document.documentElement
    // Force light theme - always remove dark class
    root.classList.remove('dark')
    localStorage.setItem('theme', 'light')
    
    // Future: Uncomment below to restore dark theme support
    // if (isDark) {
    //   root.classList.add('dark')
    //   localStorage.setItem('theme', 'dark')
    // } else {
    //   root.classList.remove('dark')
    //   localStorage.setItem('theme', 'light')
    // }
  }, [isDark])
  
  const handleClick = () => {
    setIsDark(prev => !prev)
    onToggle()
  }

  return (
    <button
      className="user-menu-item"
      onClick={handleClick}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? t('theme.lightMode') : t('theme.darkMode')}</span>
    </button>
  )
}

interface UserMenuProps {
  user: any
  onSignOut: () => void
  trigger: React.ReactNode
  align?: 'start' | 'end'
}

export function UserMenu({ user, onSignOut, trigger, align = 'end' }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Refs for timeout IDs - using refs instead of state to avoid unnecessary re-renders
  const leaveTimeoutRef = useRef<number | null>(null)
  const { user: currentUser } = useUserStore()

  // No need for click outside handler with hover behavior

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
    return undefined;
  }, [isOpen])

  const handleMenuItemClick = () => {
    setIsOpen(false)
  }

  // Reset avatar error when menu opens or user changes
  useEffect(() => {
    if (isOpen) {
      setAvatarError(false)
    }
  }, [isOpen, currentUser?._id])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current)
      }
    }
  }, [])

  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    // Open menu immediately on hover
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    // Small delay before closing to prevent accidental closes
    // Using ref to store timeout ID so we can clear it if user hovers back
    // Refs don't cause re-renders, unlike state - perfect for storing timeout IDs
    leaveTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
      leaveTimeoutRef.current = null
    }, 150)
  }

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        className="header-link user-menu-trigger"
        aria-label={t('header.userMenu')}
        aria-expanded={isOpen}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="user-menu-content menu-enter"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align === 'end' ? 'right' : 'left']: 0,
            zIndex: 2002,
          }}
        >
          <div className="user-menu-items">
            {/* Desktop Menu - User Info Section */}
            <Link
              to={currentUser?.username ? `/@${currentUser.username}` : '/profile'}
              className="user-menu-desktop-header"
              onClick={handleMenuItemClick}
            >
              <div className="user-menu-avatar-wrapper">
                {currentUser?.avatarUrl && !avatarError ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName || currentUser.username || 'User'}
                    className="user-menu-avatar"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="user-menu-avatar-placeholder">
                    {(currentUser?.displayName?.trim() || currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="user-menu-user-info">
                <div className="user-menu-name">
                  {currentUser?.displayName || currentUser?.username || 'User'}
                </div>
                <div className="user-menu-view-profile">
                  {t('header.viewProfile')}
                </div>
              </div>
            </Link>

            <div className="user-menu-separator user-menu-separator-desktop" />

            {/* Desktop Menu - Account Settings */}
            <Link
              to="/profile/edit"
              className="user-menu-item user-menu-item-desktop"
              onClick={handleMenuItemClick}
            >
              {t('header.accountSettings')}
            </Link>

            <div className="user-menu-separator user-menu-separator-desktop" />

            {/* Desktop Menu - Logout */}
            <button
              className="user-menu-item user-menu-item-desktop user-menu-item-destructive"
              onClick={() => {
                handleMenuItemClick()
                onSignOut()
              }}
            >
              {t('auth.signOut')} {currentUser?.username ? `@${currentUser.username}` : ''}
            </button>

            {/* Mobile Menu Items */}
            <Link to="/favorites" className="user-menu-item user-menu-item-mobile-only" onClick={handleMenuItemClick}>
              <Heart size={16} />
              {t('header.favorites')}
            </Link>

            <Link to="/downloads" className="user-menu-item user-menu-item-mobile-only" onClick={handleMenuItemClick}>
              <Download size={16} />
              {t('profile.downloadHistory')}
            </Link>

            {user?.isAdmin && (
              <Link to="/admin" className="user-menu-item user-menu-item-mobile-only" onClick={handleMenuItemClick}>
                <Shield size={16} />
                Admin
              </Link>
            )}

            <div className="user-menu-separator user-menu-separator-mobile-only" />

            <Link to="/about" className="user-menu-item user-menu-item-mobile-only" onClick={handleMenuItemClick}>
              <Info size={16} />
              {t('header.about')}
            </Link>

            <Link 
              to={currentUser?.username ? `/@${currentUser.username}` : '/profile'} 
              className="user-menu-item user-menu-item-mobile-only" 
              onClick={handleMenuItemClick}
            >
              <User size={16} />
              {t('header.account')}
            </Link>

            <div className="user-menu-separator user-menu-separator-mobile-only" />

            {/* Theme toggle - hidden for now, keeping code for future use */}
            {/* <ThemeToggleMenuItem onToggle={handleMenuItemClick} /> */}

            {/* <div className="user-menu-separator" /> */}

            <div className="user-menu-item-mobile-only-wrapper">
              <LanguageSwitcher variant="menu-item" onSwitch={handleMenuItemClick} />
            </div>

            <div className="user-menu-separator user-menu-separator-mobile-only" />

            <button
              className="user-menu-item user-menu-item-mobile-only user-menu-item-destructive"
              onClick={() => {
                handleMenuItemClick()
                onSignOut()
              }}
            >
              <LogOut size={16} />
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

