import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Heart, User, LogOut, Info, Moon, Sun } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { t } from '@/i18n'
import './Header.css'

// Theme toggle menu item that doesn't use Radix UI
function ThemeToggleMenuItem({ onToggle }: { onToggle: () => void }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return saved === 'dark' || (saved === null && prefersDark)
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])
  
  const handleClick = () => {
    setIsDark(!isDark)
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

            <Link to="/profile" className="user-menu-item" onClick={handleMenuItemClick}>
              <User size={16} />
              {t('header.account')}
            </Link>

            <div className="user-menu-separator" />

            <ThemeToggleMenuItem onToggle={handleMenuItemClick} />

            <div className="user-menu-separator" />

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

