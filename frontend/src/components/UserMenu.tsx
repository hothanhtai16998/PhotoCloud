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
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { user: currentUser } = useUserStore()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    return undefined;
  }, [isOpen])

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

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        className="header-link user-menu-trigger"
        aria-label={t('header.userMenu')}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="user-menu-content"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align === 'end' ? 'right' : 'left']: 0,
            zIndex: 2002,
          }}
        >
          <div className="user-menu-items">
            <Link to="/favorites" className="user-menu-item" onClick={handleMenuItemClick}>
              <Heart size={16} />
              {t('header.favorites')}
            </Link>

            <Link to="/downloads" className="user-menu-item" onClick={handleMenuItemClick}>
              <Download size={16} />
              {t('profile.downloadHistory')}
            </Link>

            {user?.isAdmin && (
              <Link to="/admin" className="user-menu-item" onClick={handleMenuItemClick}>
                <Shield size={16} />
                Admin
              </Link>
            )}

            <div className="user-menu-separator" />

            <Link to="/about" className="user-menu-item" onClick={handleMenuItemClick}>
              <Info size={16} />
              {t('header.about')}
            </Link>

            <Link 
              to={currentUser?.username ? `/@${currentUser.username}` : '/profile'} 
              className="user-menu-item" 
              onClick={handleMenuItemClick}
            >
              <User size={16} />
              {t('header.account')}
            </Link>

            <div className="user-menu-separator" />

            {/* Theme toggle - hidden for now, keeping code for future use */}
            {/* <ThemeToggleMenuItem onToggle={handleMenuItemClick} /> */}

            {/* <div className="user-menu-separator" /> */}

            <LanguageSwitcher variant="menu-item" onSwitch={handleMenuItemClick} />

            <div className="user-menu-separator" />

            <button
              className="user-menu-item user-menu-item-destructive"
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

