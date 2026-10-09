import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { t } from '@/i18n'
import type { User } from '@/types/user'
import { useIsMobile } from '@/hooks/useIsMobile'
import './UserMenu.css'

interface UserMenuProps {
  user: User | null | undefined
  onSignOut: () => void
  trigger: React.ReactNode
  align?: 'start' | 'end'
  onUpload?: () => void
}

export function UserMenu({ user, onSignOut, trigger, align = 'end', onUpload }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [menuAnimating, setMenuAnimating] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentUser = user
  const isMobile = useIsMobile()

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
  }, [isOpen, currentUser?.avatarUrl])

  // Trigger animation when menu appears (like avatar tooltip)
  useEffect(() => {
    let firstFrame = 0
    let secondFrame = 0
    if (isOpen && !isClosing) {
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          setMenuAnimating(true)
        })
      })
    } else if (!isOpen && !isClosing) {
      setMenuAnimating(false)
    }
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
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
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
    if (isOpen && !isClosing) {
      // Closing
      setIsClosing(true)
    } else if (!isOpen && !isClosing && triggerRef.current) {
      // Opening
      const rect = triggerRef.current.getBoundingClientRect()
      if (isMobile) {
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
    if (!isMobile) {
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
      setIsClosing(false)
      setIsOpen(true)
    }
  }

  const handleMouseLeave = () => {
    // Only use hover on desktop
    if (!isMobile && isOpen && !isClosing) {
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
      hoverCloseTimer.current = setTimeout(() => setIsClosing(true), 200)
    }
  }

  useEffect(() => () => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
  }, [])

  // Register dismissal listeners only while the menu is open.
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) &&
          !triggerRef.current?.contains(event.target as Node)) {
        if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
        setIsClosing(true);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
        setIsClosing(true);
        triggerRef.current?.focus();
      }
    };
    const closeOnResize = () => setIsClosing(true);
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [isOpen, isClosing]);

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        ref={triggerRef}
        className="header-link user-menu-trigger"
        aria-label={t('header.userMenu')}
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        {trigger}
      </button>

      {(isOpen || isClosing) && (
        <div
          ref={menuRef}
          className={`user-menu-content account-menu-content ${menuAnimating ? 'menu-enter' : ''} ${isClosing ? 'menu-leave' : ''}`}
          style={{
            position: isMobile && menuPosition ? 'fixed' : 'absolute',
            ...(isMobile && menuPosition
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
            {!isMobile && <>
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

            </>}
            {isMobile && <>
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

            {/* Mobile Menu - Upload */}
            {onUpload && (
              <>
                <button
                  className="user-menu-item user-menu-item-mobile-only"
                  onClick={() => {
                    handleMenuItemClick()
                    onUpload()
                  }}
                >
                  <Upload size={16} />
                  {t('header.addImage')}
                </button>
                <div className="user-menu-separator user-menu-separator-mobile-only" />
              </>
            )}

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

            </>}
          </div>
        </div>
      )}
    </div>
  )
}

