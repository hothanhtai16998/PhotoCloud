import { usePermissions } from '@/hooks/usePermissions';
import type { ReactNode } from 'react';
import type { AdminRolePermissions } from '@/services/adminService';

interface PermissionTooltipProps {
    permission: keyof AdminRolePermissions;
    children: ReactNode;
    action?: string; // Description of what action requires this permission
}

/**
 * Tooltip that shows permission requirement for an action
 * Uses native title attribute with custom styling
 */
export function PermissionTooltip({ permission, children, action }: PermissionTooltipProps) {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const hasPerm = isSuperAdmin() || hasPermission(permission);

    const tooltipText = hasPerm
        ? action
            ? `${action} (Có quyền: ${permission})`
            : `Có quyền: ${permission}`
        : action
            ? `⚠️ Bạn không có quyền thực hiện hành động này. Cần quyền: ${permission}`
            : `⚠️ Cần quyền: ${permission}`;

    return (
        <div className="permission-tooltip-wrapper" title={tooltipText}>
            {children}
        </div>
    );
}

