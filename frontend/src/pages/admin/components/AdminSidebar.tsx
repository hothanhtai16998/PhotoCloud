import { memo } from 'react';
import {
    Users,
    Images,
    Shield,
    UserCog,
    Tag,
    BarChart2,
    FolderDot,
    Heart,
    ShieldCheck,
    FileText,
    Settings,
    CalendarClock,
    X,
} from 'lucide-react';
import { t } from '@/i18n';
import type { ComponentType } from 'react';

export type TabType =
    | 'analytics'
    | 'users'
    | 'images'
    | 'categories'
    | 'collections'
    | 'bookings'
    | 'roles'
    | 'permissions'
    | 'favorites'
    | 'moderation'
    | 'logs'
    | 'settings';

export interface TabDefinition {
    key: TabType;
    label: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    /** Show only for super admins. If false, gated by hasPermission. */
    superAdminOnly?: boolean;
    /** Permission required (skipped if superAdminOnly). */
    permission?: string;
}

/**
 * Single source of truth for admin sidebar navigation. The list itself is
 * stable across renders (defined at module scope) and the component is
 * memoized, so navigating between tabs only re-renders the active item —
 * the parent AdminPage can re-render freely (e.g. when a data hook
 * updates) without invalidating the whole sidebar.
 */
const TAB_DEFINITIONS: TabDefinition[] = [
    { key: 'analytics', label: t('admin.analytics'), icon: BarChart2, permission: 'viewAnalytics' },
    { key: 'users', label: t('admin.users'), icon: Users, permission: 'viewUsers' },
    { key: 'images', label: t('admin.images'), icon: Images, permission: 'viewImages' },
    { key: 'categories', label: t('admin.categories'), icon: Tag, permission: 'viewCategories' },
    { key: 'collections', label: t('admin.collections'), icon: FolderDot, permission: 'viewCollections' },
    { key: 'bookings', label: 'Đặt lịch chụp', icon: CalendarClock, permission: 'viewDashboard' },
    { key: 'roles', label: t('admin.roles'), icon: UserCog, superAdminOnly: true },
    { key: 'permissions', label: t('admin.permissions'), icon: ShieldCheck, permission: 'viewAdmins' },
    { key: 'favorites', label: t('admin.favorites'), icon: Heart, permission: 'manageFavorites' },
    { key: 'moderation', label: t('admin.moderation'), icon: ShieldCheck, permission: 'moderateContent' },
    { key: 'logs', label: t('admin.logs'), icon: FileText, permission: 'viewLogs' },
    { key: 'settings', label: 'Cài đặt', icon: Settings, permission: 'manageSettings' },
];

export const TAB_LABELS: Record<TabType, string> = TAB_DEFINITIONS.reduce(
    (acc, tab) => ({ ...acc, [tab.key]: tab.label }),
    {} as Record<TabType, string>
);

export interface AdminSidebarProps {
    activeTab: TabType;
    isSuperAdmin: () => boolean;
    hasPermission: (perm: string) => boolean;
    sidebarCollapsed: boolean;
    isMobile: boolean;
    mobileMenuOpen: boolean;
    onTabChange: (tab: TabType) => void;
    onToggleCollapse: () => void;
    onCloseMobile: () => void;
}

/**
 * Memoized sidebar — does not re-render unless one of its props changes
 * by reference. Because we pass stable callbacks from AdminPage (or use
 * primitive props) the sidebar is effectively constant.
 */
export const AdminSidebar = memo(function AdminSidebar({
    activeTab,
    isSuperAdmin,
    hasPermission,
    sidebarCollapsed,
    isMobile,
    mobileMenuOpen,
    onTabChange,
    onToggleCollapse,
    onCloseMobile,
}: AdminSidebarProps) {
    const canSee = (tab: TabDefinition): boolean => {
        if (tab.superAdminOnly) return isSuperAdmin();
        if (!tab.permission) return true;
        return isSuperAdmin() || hasPermission(tab.permission);
    };

    return (
        <div
            className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
                isMobile ? (mobileMenuOpen ? 'mobile-open' : 'mobile-closed') : ''
            }`}
        >
            <div className="admin-sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    {!sidebarCollapsed && <Shield size={24} />}
                    {!sidebarCollapsed && <h2>{t('admin.title')}</h2>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isMobile && (
                        <button
                            className="admin-sidebar-toggle"
                            onClick={onToggleCollapse}
                            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {sidebarCollapsed ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    width="22"
                                    height="22"
                                    style={{ display: 'block', fill: 'currentColor' }}
                                >
                                    <path
                                        d="M15.54,11.29,9.88,5.64a1,1,0,0,0-1.42,0,1,1,0,0,0,0,1.41l4.95,5L8.46,17a1,1,0,0,0,0,1.41,1,1,0,0,0,.71.3,1,1,0,0,0,.71-.3l5.66-5.65A1,1,0,0,0,15.54,11.29Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    width="22"
                                    height="22"
                                    style={{ display: 'block', fill: 'currentColor' }}
                                >
                                    <path
                                        d="m8.5 12.8 5.7 5.6c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4l-4.9-5 4.9-5c.4-.4.4-1 0-1.4-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3l-5.7 5.6c-.4.5-.4 1.1 0 1.6 0-.1 0-.1 0 0z"
                                        fill="currentColor"
                                    />
                                </svg>
                            )}
                        </button>
                    )}
                    {isMobile && (
                        <button
                            className="admin-sidebar-close"
                            onClick={onCloseMobile}
                            aria-label="Close menu"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>
            <nav className="admin-nav" role="navigation" aria-label="Admin sections">
                {TAB_DEFINITIONS.filter(canSee).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            className={`admin-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.key)}
                            title={tab.label}
                            role="tab"
                            aria-selected={isActive}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon size={20} className="admin-nav-icon" aria-hidden="true" />
                            {!sidebarCollapsed && <span>{tab.label}</span>}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
});
