import SystemLog from '../models/SystemLog.js';

/**
 * Get client IP address from request
 * Handles proxy headers (x-forwarded-for) and direct connections
 */
export const getClientIp = (req) => {
    // Check for forwarded IP (when behind proxy/load balancer)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }
    
    // Check req.ip (set by Express when trust proxy is enabled)
    if (req.ip) {
        return req.ip;
    }
    
    // Fallback to connection remote address
    return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

/**
 * Compare two permission objects and return what changed
 * Returns object with: added, removed, unchanged permissions
 */
export const comparePermissions = (oldPermissions, newPermissions) => {
    const allPermissions = new Set([
        ...Object.keys(oldPermissions || {}),
        ...Object.keys(newPermissions || {}),
    ]);
    
    const changes = {
        added: [],
        removed: [],
        unchanged: [],
    };
    
    for (const perm of allPermissions) {
        const oldValue = oldPermissions?.[perm] || false;
        const newValue = newPermissions?.[perm] || false;
        
        if (oldValue !== newValue) {
            if (newValue) {
                changes.added.push(perm);
            } else {
                changes.removed.push(perm);
            }
        } else {
            changes.unchanged.push(perm);
        }
    }
    
    return changes;
};

/**
 * Log permission changes to SystemLog
 * 
 * @param {Object} params
 * @param {string} params.action - 'create', 'update', or 'delete'
 * @param {Object} params.performedBy - User who performed the action (req.user)
 * @param {Object} params.targetUser - User whose permissions were changed
 * @param {Object} params.oldRole - Old role data (for update/delete)
 * @param {Object} params.newRole - New role data (for create/update)
 * @param {string} params.reason - Optional reason for the change
 * @param {string} params.ipAddress - Client IP address
 */
export const logPermissionChange = async ({
    action,
    performedBy,
    targetUser,
    oldRole = null,
    newRole = null,
    reason = null,
    ipAddress = 'unknown',
}) => {
    try {
        // Build metadata with all relevant information
        const metadata = {
            action,
            targetUserId: targetUser?._id || targetUser,
            targetUsername: targetUser?.username || 'unknown',
            targetEmail: targetUser?.email || 'unknown',
            ipAddress,
            reason: reason || null,
        };
        
        // Add role information
        if (action === 'create' && newRole) {
            metadata.role = newRole.role;
            metadata.permissions = newRole.permissions;
            metadata.grantedBy = newRole.grantedBy;
        } else if (action === 'update') {
            // Track role changes
            if (oldRole?.role !== newRole?.role) {
                metadata.roleChange = {
                    from: oldRole?.role,
                    to: newRole?.role,
                };
            }
            
            // Track permission changes
            if (oldRole?.permissions && newRole?.permissions) {
                const permissionChanges = comparePermissions(
                    oldRole.permissions,
                    newRole.permissions
                );
                
                if (permissionChanges.added.length > 0 || permissionChanges.removed.length > 0) {
                    metadata.permissionChanges = {
                        added: permissionChanges.added,
                        removed: permissionChanges.removed,
                    };
                }
            }
            
            // Include current state
            metadata.role = newRole?.role;
            metadata.permissions = newRole?.permissions;
        } else if (action === 'delete' && oldRole) {
            metadata.role = oldRole.role;
            metadata.permissions = oldRole.permissions;
        }
        
        // Create log entry
        const logMessage = buildLogMessage(action, targetUser, metadata);
        
        await SystemLog.create({
            level: 'info',
            message: logMessage,
            userId: performedBy?._id || performedBy,
            action: `permission_${action}`,
            metadata,
        });
        
        return true;
    } catch (error) {
        // Don't throw - logging failures shouldn't break the main operation
        console.error('Failed to log permission change:', error);
        return false;
    }
};

/**
 * Build human-readable log message
 */
const buildLogMessage = (action, targetUser, metadata) => {
    const targetName = targetUser?.username || targetUser?.displayName || targetUser || 'unknown';
    
    switch (action) {
        case 'create':
            return `Admin role created for ${targetName} (role: ${metadata.role})`;
        
        case 'update':
            const changes = [];
            if (metadata.roleChange) {
                changes.push(`role: ${metadata.roleChange.from} → ${metadata.roleChange.to}`);
            }
            if (metadata.permissionChanges) {
                if (metadata.permissionChanges.added.length > 0) {
                    changes.push(`added permissions: ${metadata.permissionChanges.added.join(', ')}`);
                }
                if (metadata.permissionChanges.removed.length > 0) {
                    changes.push(`removed permissions: ${metadata.permissionChanges.removed.join(', ')}`);
                }
            }
            const changeText = changes.length > 0 ? ` (${changes.join('; ')})` : '';
            return `Admin role updated for ${targetName}${changeText}`;
        
        case 'delete':
            return `Admin role deleted for ${targetName} (role: ${metadata.role})`;
        
        default:
            return `Permission change: ${action} for ${targetName}`;
    }
};

