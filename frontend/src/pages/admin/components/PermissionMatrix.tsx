import { usePermissions } from '@/hooks/usePermissions';
import { PermissionBadge, RoleBadge } from './PermissionBadge';
import { useUserStore } from '@/stores/useUserStore';
import { t } from '@/i18n';

/**
 * Permission matrix view showing all permissions and user's access
 */
export function PermissionMatrix() {
    const { permissions, isSuperAdmin } = usePermissions();
    const user = useUserStore((state) => state.user);

    // All available permissions grouped by category
    const permissionGroups = [
        {
            label: t('admin.manageUsers'),
            permissions: ['viewUsers', 'editUsers', 'deleteUsers', 'banUsers', 'unbanUsers'] as const,
        },
        {
            label: t('admin.manageImages'),
            permissions: ['viewImages', 'editImages', 'deleteImages', 'moderateImages'] as const,
        },
        {
            label: t('admin.manageCategories'),
            permissions: ['viewCategories', 'createCategories', 'editCategories', 'deleteCategories'] as const,
        },
        {
            label: t('admin.manageAdmins'),
            permissions: ['viewAdmins', 'createAdmins', 'editAdmins', 'deleteAdmins'] as const,
        },
        {
            label: t('admin.dashboardAnalytics'),
            permissions: ['viewDashboard', 'viewAnalytics'] as const,
        },
        {
            label: t('admin.collections'),
            permissions: ['viewCollections', 'manageCollections'] as const,
        },
        {
            label: t('admin.favorites'),
            permissions: ['manageFavorites'] as const,
        },
        {
            label: t('admin.moderation'),
            permissions: ['moderateContent'] as const,
        },
        {
            label: t('admin.systemLogs'),
            permissions: ['viewLogs', 'exportData', 'manageSettings'] as const,
        },
    ];

    const getPermissionLabel = (permission: string): string => {
        const labels: Record<string, string> = {
            viewUsers: t('admin.viewUsers'),
            editUsers: t('admin.editUsers'),
            deleteUsers: t('admin.deleteUsers'),
            banUsers: t('admin.banUsers'),
            unbanUsers: t('admin.unbanUsers'),
            viewImages: t('admin.viewImages'),
            editImages: t('admin.editImages'),
            deleteImages: t('admin.deleteImages'),
            moderateImages: t('admin.moderateImages'),
            viewCategories: t('admin.viewCategories'),
            createCategories: t('admin.createCategories'),
            editCategories: t('admin.editCategories'),
            deleteCategories: t('admin.deleteCategories'),
            viewAdmins: t('admin.viewAdmins'),
            createAdmins: t('admin.createAdmins'),
            editAdmins: t('admin.editAdmins'),
            deleteAdmins: t('admin.deleteAdmins'),
            viewDashboard: t('admin.viewDashboard'),
            viewAnalytics: t('admin.viewAnalytics'),
            viewCollections: t('admin.viewCollections'),
            manageCollections: t('admin.manageCollections'),
            manageFavorites: t('admin.manageFavorites'),
            moderateContent: t('admin.moderateContent'),
            viewLogs: t('admin.viewLogs'),
            exportData: t('admin.exportData'),
            manageSettings: t('admin.manageSettings'),
        };
        return labels[permission] || permission;
    };

    return (
        <div className="permission-matrix">
            <div className="permission-matrix-header">
                <h2>{t('admin.permissions')}</h2>
                <div className="permission-matrix-user-info">
                    <p>
                        <strong>{t('admin.role')}:</strong>{' '}
                        {user?.isSuperAdmin ? (
                            <RoleBadge role="super_admin" />
                        ) : user?.isAdmin ? (
                            <RoleBadge role="admin" />
                        ) : (
                            <span>{t('admin.regularUser')}</span>
                        )}
                    </p>
                    {isSuperAdmin() && (
                        <p className="super-admin-note">
                            <strong>{t('admin.note')}:</strong> {t('admin.superAdminAllPermissions')}
                        </p>
                    )}
                </div>
            </div>

            <div className="permission-matrix-grid">
                {permissionGroups.map((group) => (
                    <div key={group.label} className="permission-group">
                        <h3 className="permission-group-title">{group.label}</h3>
                        <div className="permission-list">
                            {group.permissions.map((permission) => {
                                const hasPerm = isSuperAdmin() || permissions?.[permission] === true;
                                return (
                                    <div
                                        key={permission}
                                        className={`permission-item ${hasPerm ? 'has-permission' : 'no-permission'}`}
                                    >
                                        <PermissionBadge permission={permission} />
                                        <span className="permission-label">
                                            {getPermissionLabel(permission)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="permission-matrix-legend">
                <div className="legend-item">
                    <span className="legend-badge has-permission"></span>
                    <span>{t('admin.hasPermission')}</span>
                </div>
                <div className="legend-item">
                    <span className="legend-badge no-permission"></span>
                    <span>{t('admin.noPermission')}</span>
                </div>
            </div>
        </div>
    );
}

