import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useUserStore } from '@/stores/useUserStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Menu, X } from 'lucide-react';
import type { AdminRolePermissions } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';
import Header from '@/components/Header';
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
    Settings
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import {
    useAdminUsers,
    useAdminImages,
    useAdminCategories,
    useAdminRoles,
} from './hooks';
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

type TabType = 'analytics' | 'users' | 'images' | 'categories' | 'collections' | 'roles' | 'permissions' | 'favorites' | 'moderation' | 'logs' | 'settings';

function AdminPage() {
    // AdminRoute handles authentication and admin permission checks
    // So user is guaranteed to exist and have admin access here
    const { user } = useUserStore();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<TabType>('analytics');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Get the display name for the active tab
    const getActiveTabName = (): string => {
        const tabNames: Record<TabType, string> = {
            'analytics': t('admin.analytics'),
            'users': t('admin.users'),
            'images': t('admin.images'),
            'categories': t('admin.categories'),
            'collections': t('admin.collections'),
            'roles': t('admin.roles'),
            'permissions': t('admin.permissions'),
            'favorites': t('admin.favorites'),
            'moderation': t('admin.moderation'),
            'logs': t('admin.logs'),
            'settings': t('admin.settings'),
        };
        return tabNames[activeTab] || 'Menu';
    };

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

    // Use custom hooks for each domain
    const usersAdmin = useAdminUsers();
    const imagesAdmin = useAdminImages();
    const categoriesAdmin = useAdminCategories();
    const rolesAdmin = useAdminRoles();

    // AdminRoute already handles authentication and admin permission checks
    // No need for duplicate checks here

    // Store stable references to load functions to avoid infinite loops
    // This pattern is recommended when you want to call functions on mount/dependency change
    // without re-running when the function references change
    const loadFunctionsRef = useRef({
        loadUsers: usersAdmin.loadUsers,
        loadImages: imagesAdmin.loadImages,
        loadCategories: categoriesAdmin.loadCategories,
        loadAdminRoles: rolesAdmin.loadAdminRoles,
        getUsersLength: () => usersAdmin.users.length,
    });

    // Keep refs in sync with latest functions
    useEffect(() => {
        loadFunctionsRef.current = {
            loadUsers: usersAdmin.loadUsers,
            loadImages: imagesAdmin.loadImages,
            loadCategories: categoriesAdmin.loadCategories,
            loadAdminRoles: rolesAdmin.loadAdminRoles,
            getUsersLength: () => usersAdmin.users.length,
        };
    });

    // Load data when tab changes
    useEffect(() => {
        const fns = loadFunctionsRef.current;
        switch (activeTab) {
            case 'users':
                fns.loadUsers();
                break;
            case 'images':
                fns.loadImages();
                // Also load categories for the category selector
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
    }, [activeTab, categoriesAdmin.categories.length]);

    // Handler wrappers
    const handleDeleteUser = useCallback(async (userId: string, username: string) => {
        await usersAdmin.deleteUser(userId, username);
    }, [usersAdmin]);

    const handleUpdateUser = useCallback(async (userId: string, updates: Partial<AuthUser>) => {
        await usersAdmin.updateUser(userId, updates);
    }, [usersAdmin]);

    const handleDeleteImage = useCallback(async (imageId: string, imageTitle: string) => {
        await imagesAdmin.deleteImage(imageId, imageTitle);
    }, [imagesAdmin]);

    const handleCreateRole = useCallback(async (data: {
        userId: string;
        role: 'super_admin' | 'admin' | 'moderator';
        permissions: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => {
        await rolesAdmin.createRole(data, usersAdmin.loadUsers, usersAdmin.pagination.page);
    }, [rolesAdmin, usersAdmin]);

    const handleDeleteRole = useCallback(async (userId: string, username: string) => {
        await rolesAdmin.deleteRole(userId, username, usersAdmin.loadUsers, usersAdmin.pagination.page);
    }, [rolesAdmin, usersAdmin]);


    return (
        <>
            <Header />
            <div className="admin-page">
                <div className="admin-container">
                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <button
                            className={`admin-mobile-menu-btn ${mobileMenuOpen ? 'menu-open' : ''}`}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? (
                                <X size={20} />
                            ) : (
                                <>
                                    <Menu size={20} className="admin-mobile-menu-icon" />
                                    <span className="admin-mobile-tab-name">{getActiveTabName()}</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Mobile Menu Overlay */}
                    {isMobile && mobileMenuOpen && (
                        <div 
                            className="admin-mobile-overlay"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobile ? (mobileMenuOpen ? 'mobile-open' : 'mobile-closed') : ''}`}>
                        <div className="admin-sidebar-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                {!sidebarCollapsed && <Shield size={24} />}
                                {!sidebarCollapsed && <h2>{t('admin.title')}</h2>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {!isMobile && (
                                    <button
                                        className="admin-sidebar-toggle"
                                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
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
                                                <path d="M15.54,11.29,9.88,5.64a1,1,0,0,0-1.42,0,1,1,0,0,0,0,1.41l4.95,5L8.46,17a1,1,0,0,0,0,1.41,1,1,0,0,0,.71.3,1,1,0,0,0,.71-.3l5.66-5.65A1,1,0,0,0,15.54,11.29Z" fill="currentColor" />
                                            </svg>
                                        ) : (
                                            <svg 
                                                xmlns="http://www.w3.org/2000/svg" 
                                                viewBox="0 0 24 24" 
                                                width="22" 
                                                height="22" 
                                                style={{ display: 'block', fill: 'currentColor' }}
                                            >
                                                <path d="m8.5 12.8 5.7 5.6c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4l-4.9-5 4.9-5c.4-.4.4-1 0-1.4-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3l-5.7 5.6c-.4.5-.4 1.1 0 1.6 0-.1 0-.1 0 0z" fill="currentColor" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                                {isMobile && (
                                    <button
                                        className="admin-sidebar-close"
                                        onClick={() => setMobileMenuOpen(false)}
                                        aria-label="Close menu"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <nav className="admin-nav">
                            {(isSuperAdmin() || hasPermission('viewAnalytics')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('analytics');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.analytics')}
                                >
                                    <BarChart2 size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.analytics')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewUsers')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('users');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.users')}
                                >
                                    <Users size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.users')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewImages')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'images' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('images');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.images')}
                                >
                                    <Images size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.images')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewCategories')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('categories');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.categories')}
                                >
                                    <Tag size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.categories')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewCollections')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'collections' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('collections');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.collections')}
                                >
                                    <FolderDot size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.collections')}</span>}
                                </button>
                            )}
                            {isSuperAdmin() && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('roles');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.roles')}
                                >
                                    <UserCog size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.roles')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewAdmins')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'permissions' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('permissions');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.permissions')}
                                >
                                    <ShieldCheck size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.permissions')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('manageFavorites')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'favorites' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('favorites');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.favorites')}
                                >
                                    <Heart size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.favorites')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('moderateContent')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'moderation' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('moderation');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.moderation')}
                                >
                                    <ShieldCheck size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.moderation')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewLogs')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('logs');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title={t('admin.logs')}
                                >
                                    <FileText size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>{t('admin.logs')}</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('manageSettings')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('settings');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Cài đặt"
                                >
                                    <Settings size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Cài đặt</span>}
                                </button>
                            )}
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="admin-content">
                        <Suspense fallback={<AdminTabLoader />}>
                            {activeTab === 'analytics' && (
                                <AdminAnalytics />
                            )}
                            {activeTab === 'users' && (
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
                            )}
                            {activeTab === 'images' && (
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
                            )}
                            {activeTab === 'categories' && (
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
                            )}
                            {activeTab === 'collections' && (
                                <AdminCollections />
                            )}
                            {activeTab === 'roles' && isSuperAdmin() && (
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
                            )}
                            {activeTab === 'permissions' && (isSuperAdmin() || hasPermission('viewAdmins')) && (
                                <PermissionMatrix />
                            )}
                            {activeTab === 'favorites' && (isSuperAdmin() || hasPermission('manageFavorites')) && (
                                <AdminFavorites />
                            )}
                            {activeTab === 'moderation' && (isSuperAdmin() || hasPermission('moderateContent')) && (
                                <AdminModeration />
                            )}
                            {activeTab === 'logs' && (isSuperAdmin() || hasPermission('viewLogs')) && (
                                <AdminLogs />
                            )}
                            {activeTab === 'settings' && (isSuperAdmin() || hasPermission('manageSettings')) && (
                                <AdminSettings />
                            )}
                        </Suspense>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AdminPage;
