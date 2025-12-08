import { Button, type ButtonProps } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionTooltip } from './PermissionTooltip';
import type { ReactNode } from 'react';
import type { AdminRolePermissions } from '@/services/adminService';

interface PermissionButtonProps extends ButtonProps {
    permission: keyof AdminRolePermissions;
    action?: string; // Description of what action requires this permission
    showTooltip?: boolean;
    children: ReactNode;
}

/**
 * Button component that automatically disables based on permissions
 * Shows tooltip with permission requirement when disabled
 */
export function PermissionButton({
    permission,
    action,
    showTooltip = true,
    disabled,
    children,
    ...props
}: PermissionButtonProps) {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const hasPerm = isSuperAdmin() || hasPermission(permission);
    const isDisabled = disabled || !hasPerm;

    const button = (
        <Button
            {...props}
            disabled={isDisabled}
            className={`permission-button ${!hasPerm ? 'no-permission' : ''} ${props.className || ''}`}
        >
            {children}
        </Button>
    );

    if (showTooltip && !hasPerm) {
        return (
            <PermissionTooltip permission={permission} action={action}>
                {button}
            </PermissionTooltip>
        );
    }

    return button;
}

