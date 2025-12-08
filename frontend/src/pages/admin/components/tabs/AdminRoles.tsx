import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { CreateRoleModal, EditRoleModal, ConfirmModal } from '../modals';
import type { User, AdminRole, AdminRolePermissions } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';
import { t } from '@/i18n';
import { toast } from 'sonner';

interface AdminRolesProps {
    roles: AdminRole[];
    users: User[];
    currentUser: AuthUser | null;
    creatingRole: boolean;
    editingRole: AdminRole | null;
    onCreateClick: () => void;
    onEdit: (role: AdminRole) => void;
    onDelete: (userId: string, username: string) => void;
    onCloseCreate: () => void;
    onCloseEdit: () => void;
    onSaveCreate: (data: { 
        userId: string; 
        role: 'super_admin' | 'admin' | 'moderator'; 
        permissions: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => Promise<void>;
    onSaveEdit: (userId: string, updates: { 
        role?: 'super_admin' | 'admin' | 'moderator'; 
        permissions?: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => Promise<boolean>;
}

export function AdminRoles({
    roles,
    users,
    currentUser,
    creatingRole,
    editingRole,
    onCreateClick,
    onEdit,
    onDelete,
    onCloseCreate,
    onCloseEdit,
    onSaveCreate,
    onSaveEdit,
}: AdminRolesProps) {
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; username: string } | null>(null);

    const handleDeleteClick = (userId: string, username: string, role: AdminRole) => {
        // Prevent deleting system-created roles
        if (!role.grantedBy) {
            toast.error(t('admin.cannotDeleteSystemRole') || 'Không thể xóa quyền được tạo bởi hệ thống');
            return;
        }
        setDeleteModal({ isOpen: true, userId, username });
    };

    const handleDeleteConfirm = () => {
        if (!deleteModal) return;
        onDelete(deleteModal.userId, deleteModal.username);
        setDeleteModal(null);
    };

    return (
        <div className="admin-roles">
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.manageRoles')}</h1>
                <Button onClick={onCreateClick} className="admin-add-category-btn">
                    {t('admin.addRole')}
                </Button>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('admin.username')}</th>
                            <th>{t('admin.role')}</th>
                            <th>{t('admin.status')}</th>
                            <th>{t('admin.permissionsLabel')}</th>
                            <th>{t('admin.grantedBy')}</th>
                            <th>{t('admin.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles
                            .filter((role) => {
                                // Filter out roles without valid user data
                                if (!role.userId) return false;
                                
                                // If userId is an object, check if it has required fields
                                if (typeof role.userId === 'object') {
                                    return !!(role.userId._id || role.userId.username);
                                }
                                
                                // If userId is a string, check if user exists in users array
                                if (typeof role.userId === 'string') {
                                    return users.some(user => user._id === role.userId);
                                }
                                
                                return false;
                            })
                            .map((role) => {
                                const userId = typeof role.userId === 'string' ? role.userId : role.userId?._id;
                                const username = typeof role.userId === 'string' 
                                    ? (users.find(u => u._id === role.userId)?.username || '') 
                                    : (role.userId?.username || '');
                                const userDisplayName = typeof role.userId === 'string'
                                    ? (users.find(u => u._id === role.userId)?.displayName || users.find(u => u._id === role.userId)?.username || '')
                                    : (role.userId?.displayName || role.userId?.username || '');
                                const userEmail = typeof role.userId === 'string'
                                    ? (users.find(u => u._id === role.userId)?.email || '')
                                    : (role.userId?.email || '');
                                
                                return (
                                    <tr key={role._id}>
                                        <td>
                                            <div>
                                                <strong>{userDisplayName}</strong>
                                                <br />
                                                <small>{userEmail}</small>
                                            </div>
                                        </td>
                                    <td>
                                        <span className={`admin-role-badge ${role.role}`}>
                                            {role.role === 'super_admin' ? t('admin.superAdmin') : role.role === 'admin' ? t('admin.adminRoleLabel') : t('admin.moderator')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {role.active === false && (
                                                <span className="admin-status-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                                    {t('admin.suspended')}
                                                </span>
                                            )}
                                            {role.expiresAt && new Date(role.expiresAt) < new Date() && (
                                                <span className="admin-status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                                                    {t('admin.expired')}
                                                </span>
                                            )}
                                            {role.expiresAt && new Date(role.expiresAt) >= new Date() && (
                                                <span className="admin-status-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                                                    {t('admin.expiresAt', { date: new Date(role.expiresAt).toLocaleDateString() })}
                                                </span>
                                            )}
                                            {role.allowedIPs && role.allowedIPs.length > 0 && (
                                                <span className="admin-status-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                                                    {t('admin.ipLimited', { count: role.allowedIPs.length })}
                                                </span>
                                            )}
                                            {(!role.expiresAt && role.active !== false && (!role.allowedIPs || role.allowedIPs.length === 0)) && (
                                                <span className="admin-status-badge" style={{ background: '#d1fae5', color: '#065f46' }}>
                                                    {t('admin.activeStatus2')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-permissions-list">
                                            {Object.entries(role.permissions || {}).map(([key, value]) =>
                                                value ? (
                                                    <span key={key} className="admin-permission-tag">
                                                        {key}
                                                    </span>
                                                ) : null
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {role.grantedBy?.displayName || role.grantedBy?.username || t('admin.system')}
                                    </td>
                                    <td>
                                        <div className="admin-actions">
                                            {/* System-created roles cannot be edited or deleted */}
                                            {!role.grantedBy ? (
                                                <span style={{ color: '#666', fontSize: '14px' }}>
                                                    {t('admin.systemProtected') || 'Được bảo vệ bởi hệ thống'}
                                                </span>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Double-check: prevent editing system roles
                                                            if (!role.grantedBy) {
                                                                toast.error(t('admin.cannotEditSystemRole') || 'Không thể chỉnh sửa quyền được tạo bởi hệ thống');
                                                                return;
                                                            }
                                                            onEdit(role);
                                                        }}
                                                        className="admin-action-edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(userId || '', username, role)}
                                                        disabled={userId === currentUser?._id}
                                                        className="admin-action-delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {roles.length === 0 && (
                <div className="admin-empty-state">
                    <p>{t('admin.noRoles')}</p>
                </div>
            )}

            {creatingRole && (
                <CreateRoleModal
                    users={users}
                    onClose={onCloseCreate}
                    onSave={onSaveCreate}
                />
            )}

            {editingRole && (
                <EditRoleModal
                    role={editingRole}
                    onClose={onCloseEdit}
                    onSave={onSaveEdit}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <ConfirmModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={handleDeleteConfirm}
                    title={t('admin.deleteRole') || 'Xóa quyền admin'}
                    message={t('admin.deleteRoleConfirm', { username: deleteModal.username }) || `Bạn có chắc muốn xóa quyền admin của tài khoản "${deleteModal.username}"?`}
                    confirmText={t('admin.delete') || 'Xóa'}
                    variant="danger"
                />
            )}
        </div>
    );
}

