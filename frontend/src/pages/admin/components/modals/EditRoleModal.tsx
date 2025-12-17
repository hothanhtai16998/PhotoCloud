import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminRole, AdminRolePermissions } from '@/services/adminService';
import { PERMISSION_GROUPS, getAllPermissionKeys } from '@/utils/permissionGroups';
import { getInheritedPermissions, isPermissionInherited, getInheritedFromRole } from '@/utils/roleInheritance';
import { t } from '@/i18n';

interface EditRoleModalProps {
    role: AdminRole;
    onClose: () => void;
    onSave: (userId: string, updates: { 
        role?: 'super_admin' | 'admin' | 'moderator'; 
        permissions?: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => Promise<boolean>;
}

export function EditRoleModal({ role, onClose, onSave }: EditRoleModalProps) {
    // Prevent editing system-created roles
    if (!role.grantedBy) {
        return (
            <div className="admin-modal-overlay" onClick={onClose}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="admin-modal-header">
                        <h2>{t('admin.cannotEditSystemRole') || 'Không thể chỉnh sửa'}</h2>
                        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">×</Button>
                    </div>
                    <div className="admin-modal-form">
                        <p>{t('admin.cannotEditSystemRole') || 'Không thể chỉnh sửa quyền được tạo bởi hệ thống'}</p>
                        <div className="admin-modal-actions">
                            <Button type="button" onClick={onClose}>
                                {t('common.close')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Get all available permissions
    const allPermissions = getAllPermissionKeys();

    const [selectedRole, setSelectedRole] = useState<'super_admin' | 'admin' | 'moderator'>(role.role);
    // Merge existing permissions with all available permissions to show all checkboxes
    const [permissions, setPermissions] = useState<AdminRolePermissions>({
        ...allPermissions,
        ...(role.permissions || {}),
    });
    
    // Format expiresAt for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        // Convert to local datetime string for input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    const [expiresAt, setExpiresAt] = useState<string>(formatDateForInput(role.expiresAt));
    const [active, setActive] = useState<boolean>(role.active !== undefined ? role.active : true);
    const [allowedIPs, setAllowedIPs] = useState<string>((role.allowedIPs || []).join(', '));

    // Apply inheritance when role changes
    useEffect(() => {
        const inheritedPerms = getInheritedPermissions(selectedRole);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPermissions(prev => {
            const updated = { ...prev };
            // Set all inherited permissions to true
            inheritedPerms.forEach(perm => {
                updated[perm as keyof AdminRolePermissions] = true;
            });
            return updated;
        });
    }, [selectedRole]); // Only run when role changes

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Extract userId - it can be either a string or a User object
        const userId = typeof role.userId === 'string' ? role.userId : role.userId._id;
        
        // Parse allowedIPs from comma-separated string
        const parsedIPs = allowedIPs
            .split(',')
            .map(ip => ip.trim())
            .filter(ip => ip.length > 0);
        
        await onSave(userId, { 
            role: selectedRole, 
            permissions,
            expiresAt: expiresAt || null,
            active,
            allowedIPs: parsedIPs.length > 0 ? parsedIPs : [],
        });
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                    <h2>{t('admin.editAdminRole')}</h2>
                    <button onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="admin-modal-form">
                    <div className="admin-modal-form-content">
                        <div className="admin-modal-form-left">
                        <div className="admin-form-group">
                            <label>{t('admin.adminAccount')}</label>
                            <Input
                                value={
                                    typeof role.userId === 'string'
                                        ? ''
                                        : (role.userId?.displayName || role.userId?.username || '')
                                }
                                disabled
                            />
                        </div>

                        <div className="admin-form-group">
                            <label>{t('admin.roleLabel')}</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => {
                                    const value = e.target.value as 'super_admin' | 'admin' | 'moderator';
                                    if (value === 'super_admin' || value === 'admin' || value === 'moderator') {
                                        setSelectedRole(value);
                                    }
                                }}
                                className="admin-select"
                            >
                                <option value="admin">{t('admin.adminRoleLabel')}</option>
                                <option value="moderator">{t('admin.moderator')}</option>
                                <option value="super_admin">{t('admin.superAdmin')}</option>
                            </select>
                        </div>

                        <div className="admin-form-group">
                            <div className="admin-security-settings">
                                <div className="admin-security-header">
                                    <span className="admin-security-icon">🔒</span>
                                    <label style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{t('admin.securitySettings')}</label>
                                </div>
                                
                                <div className="admin-security-content">
                                    <div className="admin-security-field">
                                        <label className="admin-security-field-label">
                                            <span>{t('admin.expiryDate')}</span>
                                        </label>
                                        <Input
                                            type="datetime-local"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            className="admin-security-input"
                                        />
                                        <p className="admin-security-help">
                                            {t('admin.expiryDateHelp')}
                                        </p>
                                    </div>
                                    
                                    <div className="admin-security-field">
                                        <label className="admin-security-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={(e) => setActive(e.target.checked)}
                                                className="admin-security-checkbox"
                                            />
                                            <span className="admin-security-checkbox-text">
                                                <strong>{t('admin.activateRole')}</strong>
                                                <small>{t('admin.deactivateRole')}</small>
                                            </span>
                                        </label>
                                    </div>
                                    
                                    <div className="admin-security-field">
                                        <label className="admin-security-field-label">
                                            <span>{t('admin.ipLimit')}</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={allowedIPs}
                                            onChange={(e) => setAllowedIPs(e.target.value)}
                                            placeholder={t('admin.ipLimitPlaceholder')}
                                            className="admin-security-input"
                                        />
                                        <p className="admin-security-help">
                                            {t('admin.ipLimitHelp')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-modal-form-right">
                        <div className="admin-form-group">
                            <label>{t('admin.permissionsLabel')}</label>
                            {selectedRole !== 'moderator' && (
                                <p className="admin-form-help" style={{ marginBottom: '12px', color: '#059669' }}>
                                    <strong>{t('admin.permissionsNote')}</strong>
                                </p>
                            )}
                            <div className="admin-permissions-container">
                                {PERMISSION_GROUPS.map((group, groupIndex) => (
                                    <div key={groupIndex} className="admin-permission-group">
                                        <h4 className="admin-permission-group-title">{t(`admin.${group.labelKey}`)}</h4>
                                        <div className="admin-permissions-checkboxes">
                                            {group.permissions.map((perm) => {
                                                const permissionKey = perm.key as keyof AdminRolePermissions;
                                                const isInherited = isPermissionInherited(selectedRole, perm.key);
                                                const inheritedFrom = getInheritedFromRole(selectedRole, perm.key);
                                                const isChecked = permissions[permissionKey] || false;
                                                const inheritedFromLabel = inheritedFrom === 'moderator' ? t('admin.moderator') : t('admin.adminRoleLabel');
                                                
                                                return (
                                                    <label 
                                                        key={perm.key} 
                                                        className={`admin-checkbox-label ${isInherited ? 'inherited-permission' : ''}`}
                                                        title={isInherited ? t('admin.inheritedFrom', { role: inheritedFromLabel }) : undefined}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (!isInherited) {
                                                                    setPermissions({ ...permissions, [permissionKey]: e.target.checked });
                                                                }
                                                            }}
                                                            disabled={perm.key === 'viewDashboard' || isInherited}
                                                        />
                                                        <span>
                                                            {t(`admin.${perm.key}`)}
                                                            {isInherited && (
                                                                <span className="inherited-badge" title={t('admin.inheritedFrom', { role: inheritedFromLabel })}>
                                                                    {t('admin.inherited')}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="admin-modal-actions">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">{t('admin.save')}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

