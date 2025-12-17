import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdminRolePermissions } from '@/services/adminService';

interface PermissionBadgeProps {
    permission: keyof AdminRolePermissions;
    showIcon?: boolean;
    className?: string;
}

/**
 * Badge component that shows if user has a specific permission
 */
export function PermissionBadge({ permission, showIcon = true, className = '' }: PermissionBadgeProps) {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const hasPerm = isSuperAdmin() || hasPermission(permission);

    return (
        <span
            className={`permission-badge ${hasPerm ? 'has-permission' : 'no-permission'} ${className}`}
            title={hasPerm ? `Có quyền: ${permission}` : `Không có quyền: ${permission}`}
        >
            {showIcon && (
                hasPerm ? (
                    <ShieldCheck size={14} />
                ) : (
                    <ShieldAlert size={14} />
                )
            )}
            <span>{permission}</span>
        </span>
    );
}

/**
 * Badge that shows user's role
 */
export function RoleBadge({ role, className = '' }: { role: 'super_admin' | 'admin' | 'moderator' | null; className?: string }) {
    const roleLabels = {
        super_admin: 'Super Admin',
        admin: 'Admin',
        moderator: 'Moderator',
    };

    const roleColors = {
        super_admin: 'super-admin',
        admin: 'admin',
        moderator: 'moderator',
    };

    if (!role) return null;

    return (
        <span className={`role-badge ${roleColors[role]} ${className}`}>
            {roleLabels[role]}
        </span>
    );
}

