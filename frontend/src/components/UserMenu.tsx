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
  const [isClosing, setIsClosing] = useState(false)
  const [menuAnimating, setMenuAnimating] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { user: currentUser } = useUserStore()

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isClosing) {
        setIsClosing(true)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
    return undefined;
  }, [isOpen, isClosing])

  const handleMenuItemClick = () => {
    if (isOpen && !isClosing) {
      setIsClosing(true)
    }
  }

  // Reset avatar error when menu opens or user changes
  useEffect(() => {
    if (isOpen) {
      setAvatarError(false)
    }
  }, [isOpen, currentUser?._id])

  // Trigger animation when menu appears (like avatar tooltip)
  useEffect(() => {
    if (isOpen && !isClosing) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMenuAnimating(true)
        })
      })
    } else if (!isOpen && !isClosing) {
      setMenuAnimating(false)
    }
  }, [isOpen, isClosing])

  // Handle closing animation
  useEffect(() => {
    if (isClosing) {
      setMenuAnimating(false)
      const timer = setTimeout(() => {
        setIsClosing(false)
        setIsOpen(false)
      }, 150) // Match CSS transition duration
      return () => clearTimeout(timer)
    }
  }, [isClosing])


  const handleToggle = () => {
    const isMobileNow = typeof window !== 'undefined' && window.innerWidth <= 768
    if (isOpen && !isClosing) {
      // Closing
      setIsClosing(true)
    } else if (!isOpen && !isClosing && triggerRef.current) {
      // Opening
      const rect = triggerRef.current.getBoundingClientRect()
      if (isMobileNow) {
        setMenuPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        })
      } else {
        setMenuPosition(null)
      }
      setIsOpen(true)
    }
  }

  const handleMouseEnter = () => {
    // Only use hover on desktop
    const isMobileNow = typeof window !== 'undefined' && window.innerWidth <= 768
    if (!isMobileNow) {
      setIsOpen(true)
    }
  }

  const handleMouseLeave = () => {
    // Only use hover on desktop
    const isMobileNow = typeof window !== 'undefined' && window.innerWidth <= 768
    if (!isMobileNow && isOpen && !isClosing) {
      setIsClosing(true)
    }
  }

  // Close menu when clicking outside (only on mobile)
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const isMobileNow = window.innerWidth <= 768
        if (
          isMobileNow &&
          isOpen &&
          !isClosing &&
          menuRef.current &&
          triggerRef.current &&
          !menuRef.current.contains(event.target as Node) &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsClosing(true)
        }
      }

    const isMobileNow = typeof window !== 'undefined' && window.innerWidth <= 768
    if (isOpen && isMobileNow) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    return undefined
  }, [isOpen])

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
        onClick={(e) => {
          const isMobileNow = typeof window !== 'undefined' && window.innerWidth <= 768
          if (isMobileNow) {
            handleToggle()
          }
        }}
      >
        {trigger}
      </button>

      {(isOpen || isClosing) && (
        <div
          ref={menuRef}
          className={`user-menu-content ${menuAnimating ? 'menu-enter' : ''} ${isClosing ? 'menu-leave' : ''}`}
          style={{
            position: window.innerWidth <= 768 && menuPosition ? 'fixed' : 'absolute',
            ...(window.innerWidth <= 768 && menuPosition
              ? {
                  top: `${menuPosition.top}px`,
                  right: `${menuPosition.right}px`,
                  left: 'auto',
                }
              : {
                  top: 'calc(100% + 4px)',
                  [align === 'end' ? 'right' : 'left']: 0,
                }),
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
            {/* Mobile Menu - User Info Section */}
            <Link
              to={currentUser?.username ? `/@${currentUser.username}` : '/profile'}
              className="user-menu-item user-menu-item-mobile-only user-menu-mobile-header"
              onClick={handleMenuItemClick}
            >
              <div className="user-menu-mobile-avatar-wrapper">
                {currentUser?.avatarUrl && !avatarError ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName || currentUser.username || 'User'}
                    className="user-menu-mobile-avatar"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="user-menu-mobile-avatar-placeholder">
                    {(currentUser?.displayName?.trim() || currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="user-menu-mobile-user-info">
                <div className="user-menu-mobile-name">
                  {currentUser?.displayName || currentUser?.username || 'User'}
                </div>
                <div className="user-menu-mobile-view-profile">
                  {t('header.viewProfile')}
                </div>
              </div>
            </Link>

            <div className="user-menu-separator user-menu-separator-mobile-only" />

            {/* Mobile Menu - Account Settings */}
            <Link
              to="/profile/edit"
              className="user-menu-item user-menu-item-mobile-only"
              onClick={handleMenuItemClick}
            >
              {t('header.accountSettings')}
            </Link>

            <div className="user-menu-separator user-menu-separator-mobile-only" />

            {/* Mobile Menu - Logout */}
            <button
              className="user-menu-item user-menu-item-mobile-only user-menu-item-destructive"
              onClick={() => {
                handleMenuItemClick()
                onSignOut()
              }}
            >
              {t('auth.signOut')} {currentUser?.username ? `@${currentUser.username}` : ''}
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

