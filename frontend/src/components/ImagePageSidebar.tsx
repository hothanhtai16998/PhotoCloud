import { Home, Bookmark, Heart, User, Info } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { t } from '@/i18n';
import './ImagePageSidebar.css';

/**
 * Hybrid-style sidebar for all pages, inspired by Unsplash.
 * Icon-only with tooltips, active state indicators, and proper navigation.
 */
const ImagePageSidebar = () => {
  const location = useLocation();
  const { accessToken } = useAuthStore();
  const { user } = useUserStore();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/t/');
    }
    if (path === '/profile') {
      // Match /profile/:username, /@:username, /@:username/tab, and /profile/user/:userId
      return location.pathname === path || 
             location.pathname.startsWith(path + '/') ||
             location.pathname.match(/^\/@[^/]+(\/(following|followers|collections|stats))?$/);
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavItemClass = (path: string) => {
    const baseClass = 'sidebar-nav-item';
    return isActive(path) ? `${baseClass} active` : baseClass;
  };

  return (
    <aside className="image-page-sidebar">
      {/* Top section - Home */}
      <div className="sidebar-section sidebar-section-top">
        <Link
          to="/"
          className={getNavItemClass('/')}
          aria-label={t('common.all')}
          title={t('common.all')}
        >
          <Home className="sidebar-icon" />
        </Link>
      </div>

      {/* Middle section - Main Navigation */}
      <div className="sidebar-section sidebar-section-middle">
        <Link
          to="/collections"
          className={getNavItemClass('/collections')}
          aria-label={t('collections.title')}
          title={t('collections.title')}
        >
          <Bookmark className="sidebar-icon" />
        </Link>

        {accessToken && (
          <Link
            to="/favorites"
            className={getNavItemClass('/favorites')}
            aria-label={t('header.favorites')}
            title={t('header.favorites')}
          >
            <Heart className="sidebar-icon" />
          </Link>
        )}

        {accessToken && user && (
          <Link
            to={user.username ? `/@${user.username}` : '/profile'}
            className={getNavItemClass('/profile')}
            aria-label={t('header.account')}
            title={t('header.account')}
          >
            <User className="sidebar-icon" />
          </Link>
        )}
      </div>

      {/* Bottom section - About */}
      <div className="sidebar-section sidebar-section-bottom">
        <Link
          to="/about"
          className={getNavItemClass('/about')}
          aria-label={t('header.about')}
          title={t('header.about')}
        >
          <Info className="sidebar-icon" />
        </Link>
      </div>
    </aside>
  );
};

export default ImagePageSidebar;


