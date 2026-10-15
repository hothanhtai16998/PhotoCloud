import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import type { JSX } from 'react';
import { useUserStore } from '@/stores/useUserStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { AdminRolePermissions } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';
import { Menu, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import {
    useAdminUsers,
    useAdminImages,
    useAdminCategories,
    useAdminRoles,
} from './hooks';
import { AdminSidebar, type TabType, TAB_LABELS } from './components/AdminSidebar';
import { AdminErrorBoundary } from './components/AdminErrorBoundary';
import './AdminPage.css';

// Lazy load admin tab components to reduce initial bundle size
const AdminAnalytics = lazy(() => import('./components/tabs/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminUsersTab = lazy(() => import('./components/tabs/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminImagesTab = lazy(() => import('./components/tabs/AdminImages').then(m => ({ default: m.AdminImages })));
const AdminCategoriesTab = lazy(() => import('./components/tabs/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminCollections = lazy(() => import('./components/tabs/AdminCollections').then(m => ({ default: m.AdminCollections })));
const AdminRolesTab = lazy(() => import('./components/tabs/AdminRoles').then(m => ({ default: m.AdminRoles })));
const AdminFavorites = lazy(() => import('./components/tabs/AdminFavorites').then(m => ({ default: m.AdminFavorites })));
const AdminModeration = lazy(() => import('./components/tabs/AdminModeration').then(m => ({ default: m.AdminModeration })));
const AdminLogs = lazy(() => import('./components/tabs/AdminLogs').then(m => ({ default: m.AdminLogs })));
const AdminSettings = lazy(() => import('./components/tabs/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminBookings = lazy(() => import('./components/tabs/AdminBookings').then(m => ({ default: m.AdminBookings })));
const PermissionMatrix = lazy(() => import('./components/PermissionMatrix').then(m => ({ default: m.PermissionMatrix })));

// Loading fallback for admin tabs
const AdminTabLoader = () => (
    <div className="admin-tab-loader">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-12 w-full mb-6" />
        <div className="admin-loader-grid">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full mt-6" />
    </div>
);

function AdminPage() {
    // AdminRoute handles authentication and admin permission checks
    // So user is guaranteed to exist and have admin access here
    const { user } = useUserStore();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<TabType>('analytics');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Listen for tab change events from quick actions
    useEffect(() => {
        const handleTabChange = (e: Event) => {
            const customEvent = e as CustomEvent<TabType>;
            if (customEvent.detail) {
                setActiveTab(customEvent.detail);
            }
        };
        window.addEventListener('adminTabChange', handleTabChange as EventListener);
        return () => window.removeEventListener('adminTabChange', handleTabChange as EventListener);
    }, []);

    // Scroll to top when tab changes — schedule on idle so it doesn't block
    // the first paint or interaction with the sidebar/header tabs.
    useEffect(() => {
        const idleCallback = (window as any).requestIdleCallback as ((cb: () => void, opts?: { timeout: number }) => number) | undefined;
        const handle = idleCallback
            ? idleCallback(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), { timeout: 200 })
            : window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 50);
        return () => {
            if (idleCallback) {
                (window as any).cancelIdleCallback?.(handle);
            } else {
                window.clearTimeout(handle);
            }
        };
    }, [activeTab]);

    // Stable handlers — passed to memoized children so they don't churn.
    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
    }, []);
    const handleToggleSidebar = useCallback(() => {
        setSidebarCollapsed((prev) => !prev);
    }, []);
    const handleCloseMobile = useCallback(() => {
        setMobileMenuOpen(false);
    }, []);

    // Use custom hooks for each domain. They are always mounted (rules of
    // hooks), but they are intentionally cheap to mount: each hook only
    // initializes useState and one usePermissions call. The data-loading
    // effect in AdminPage is what kicks off API calls, and that effect is
    // gated by activeTab. So the hooks themselves do not make any network
    // requests until the matching tab is opened.
    const usersAdmin = useAdminUsers();
    const imagesAdmin = useAdminImages();
    const categoriesAdmin = useAdminCategories();
    const rolesAdmin = useAdminRoles();

    // Store stable references to load functions so the data-load effect
    // below doesn't depend on hook identity. We read the *current* functions
    // lazily inside the effect, so identity changes here are harmless.
    const loadFunctionsRef = useRef({
        loadUsers: usersAdmin.loadUsers,
        loadImages: imagesAdmin.loadImages,
        loadCategories: categoriesAdmin.loadCategories,
        loadAdminRoles: rolesAdmin.loadAdminRoles,
        getUsersLength: () => usersAdmin.users.length,
    });
    loadFunctionsRef.current = {
        loadUsers: usersAdmin.loadUsers,
        loadImages: imagesAdmin.loadImages,
        loadCategories: categoriesAdmin.loadCategories,
        loadAdminRoles: rolesAdmin.loadAdminRoles,
        getUsersLength: () => usersAdmin.users.length,
    };

    // Load data when tab changes. Deferred via requestIdleCallback so the
    // first paint / header click isn't blocked by an API round-trip.
    useEffect(() => {
        const idleCallback = (window as any).requestIdleCallback as ((cb: () => void, opts?: { timeout: number }) => number) | undefined;
        const handle = idleCallback
            ? idleCallback(() => {
                const fns = loadFunctionsRef.current;
                switch (activeTab) {
                    case 'users':
                        fns.loadUsers();
                        break;
                    case 'images':
                        fns.loadImages();
                        if (categoriesAdmin.categories.length === 0) {
                            fns.loadCategories();
                        }
                        break;
                    case 'categories':
                        fns.loadCategories();
                        break;
                    case 'roles':
                        fns.loadAdminRoles(fns.loadUsers, fns.getUsersLength());
                        break;
                }
            }, { timeout: 600 })
            : window.setTimeout(() => {
                const fns = loadFunctionsRef.current;
                switch (activeTab) {
                    case 'users': fns.loadUsers(); break;
                    case 'images':
                        fns.loadImages();
                        if (categoriesAdmin.categories.length === 0) fns.loadCategories();
                        break;
                    case 'categories': fns.loadCategories(); break;
                    case 'roles': fns.loadAdminRoles(fns.loadUsers, fns.getUsersLength()); break;
                }
            }, 200);
        return () => {
            if (idleCallback) {
                (window as any).cancelIdleCallback?.(handle);
            } else {
                window.clearTimeout(handle);
            }
        };
    }, [activeTab, categoriesAdmin.categories.length]);

    // Handler wrappers — depend on the specific functions we call so they
    // don't churn every render (which would re-render every <AdminUsersTab/>
    // child on every parent re-render).
    const handleDeleteUser = useCallback(async (userId: string, username: string) => {
        await usersAdmin.deleteUser(userId, username);
    }, [usersAdmin.deleteUser]);

    const handleUpdateUser = useCallback(async (userId: string, updates: Partial<AuthUser>) => {
        await usersAdmin.updateUser(userId, updates);
    }, [usersAdmin.updateUser]);

    const handleDeleteImage = useCallback(async (imageId: string, imageTitle: string) => {
        await imagesAdmin.deleteImage(imageId, imageTitle);
    }, [imagesAdmin.deleteImage]);

    const handleCreateRole = useCallback(async (data: {
        userId: string;
        role: 'super_admin' | 'admin' | 'moderator';
        permissions: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => {
        await rolesAdmin.createRole(data, usersAdmin.loadUsers, usersAdmin.pagination.page);
    }, [rolesAdmin.createRole, usersAdmin.loadUsers, usersAdmin.pagination.page]);

    const handleDeleteRole = useCallback(async (userId: string, username: string) => {
        await rolesAdmin.deleteRole(userId, username, usersAdmin.loadUsers, usersAdmin.pagination.page);
    }, [rolesAdmin.deleteRole, usersAdmin.loadUsers, usersAdmin.pagination.page]);

    const activeTabLabel = TAB_LABELS[activeTab] || t('admin.title');

    // Render the active tab inside an error boundary so a single failing
    // tab doesn't unmount the whole admin shell.
    const renderActiveTab = (): JSX.Element => {
        switch (activeTab) {
            case 'analytics':
                return <AdminAnalytics />;
            case 'users':
                return (
                    <AdminUsersTab
                        users={usersAdmin.users}
                        pagination={usersAdmin.pagination}
                        search={usersAdmin.search}
                        currentUser={user as AuthUser | null}
                        onSearchChange={usersAdmin.setSearch}
                        onSearch={() => usersAdmin.loadUsers(1)}
                        onPageChange={usersAdmin.loadUsers}
                        onEdit={usersAdmin.setEditingUser}
                        onDelete={handleDeleteUser}
                        editingUser={usersAdmin.editingUser}
                        onCloseEdit={() => usersAdmin.setEditingUser(null)}
                        onSaveEdit={handleUpdateUser}
                    />
                );
            case 'images':
                return (
                    <AdminImagesTab
                        images={imagesAdmin.images}
                        pagination={imagesAdmin.pagination}
                        search={imagesAdmin.search}
                        onSearchChange={imagesAdmin.setSearch}
                        onSearch={() => imagesAdmin.loadImages(1)}
                        onPageChange={imagesAdmin.loadImages}
                        onDelete={handleDeleteImage}
                        onImageUpdated={() => imagesAdmin.loadImages(imagesAdmin.pagination.page)}
                        categories={categoriesAdmin.categories}
                    />
                );
            case 'categories':
                return (
                    <AdminCategoriesTab
                        categories={categoriesAdmin.categories}
                        creatingCategory={categoriesAdmin.creatingCategory}
                        editingCategory={categoriesAdmin.editingCategory}
                        onCreateClick={() => categoriesAdmin.setCreatingCategory(true)}
                        onEdit={categoriesAdmin.setEditingCategory}
                        onDelete={categoriesAdmin.deleteCategory}
                        onCloseCreate={() => categoriesAdmin.setCreatingCategory(false)}
                        onCloseEdit={() => categoriesAdmin.setEditingCategory(null)}
                        onSaveCreate={categoriesAdmin.createCategory}
                        onSaveEdit={categoriesAdmin.updateCategory}
                    />
                );
            case 'collections':
                return <AdminCollections />;
            case 'bookings':
                return <AdminBookings />;
            case 'roles':
                return (
                    <AdminRolesTab
                        roles={rolesAdmin.adminRoles}
                        users={usersAdmin.users}
                        currentUser={user as AuthUser | null}
                        creatingRole={rolesAdmin.creatingRole}
                        editingRole={rolesAdmin.editingRole}
                        onCreateClick={() => rolesAdmin.setCreatingRole(true)}
                        onEdit={rolesAdmin.setEditingRole}
                        onDelete={handleDeleteRole}
                        onCloseCreate={() => rolesAdmin.setCreatingRole(false)}
                        onCloseEdit={() => rolesAdmin.setEditingRole(null)}
                        onSaveCreate={handleCreateRole}
                        onSaveEdit={rolesAdmin.updateRole}
                    />
                );
            case 'permissions':
                return <PermissionMatrix />;
            case 'favorites':
                return <AdminFavorites />;
            case 'moderation':
                return <AdminModeration />;
            case 'logs':
                return <AdminLogs />;
            case 'settings':
                return <AdminSettings />;
            default:
                return <AdminAnalytics />;
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-container">
                {/* Mobile Menu Button */}
                {isMobile && (
                    <button
                        className={`admin-mobile-menu-btn ${mobileMenuOpen ? 'menu-open' : ''}`}
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? (
                            <X size={20} />
                        ) : (
                            <>
                                <Menu size={20} className="admin-mobile-menu-icon" />
                                <span className="admin-mobile-tab-name">{activeTabLabel}</span>
                            </>
                        )}
                    </button>
                )}

                {/* Mobile Menu Overlay */}
                {isMobile && mobileMenuOpen && (
                    <div
                        className="admin-mobile-overlay"
                        onClick={handleCloseMobile}
                    />
                )}

                <AdminSidebar
                    activeTab={activeTab}
                    isSuperAdmin={isSuperAdmin}
                    hasPermission={hasPermission}
                    sidebarCollapsed={sidebarCollapsed}
                    isMobile={isMobile}
                    mobileMenuOpen={mobileMenuOpen}
                    onTabChange={handleTabChange}
                    onToggleCollapse={handleToggleSidebar}
                    onCloseMobile={handleCloseMobile}
                />

                {/* Main Content */}
                <div className="admin-content">
                    <Suspense fallback={<AdminTabLoader />}>
                        <AdminErrorBoundary scope={activeTabLabel}>
                            {renderActiveTab()}
                        </AdminErrorBoundary>
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;
