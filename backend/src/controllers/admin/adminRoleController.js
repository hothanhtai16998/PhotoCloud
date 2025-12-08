import mongoose from 'mongoose';
import User from '../../models/User.js';
import AdminRole from '../../models/AdminRole.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logPermissionChange, getClientIp } from '../../utils/auditLogger.js';
import { validatePermissionsForRole, applyRoleInheritance } from '../../utils/permissionValidator.js';
import { invalidateUserCache } from '../../utils/permissionCache.js';

// Admin Role Management (Only Super Admin)
export const getAllAdminRoles = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewAdmins') middleware

    const adminRoles = await AdminRole.find()
        .populate('userId', 'username email displayName')
        .populate('grantedBy', 'username displayName')
        .sort({ createdAt: -1 })
        .lean();

    // Filter out any admin roles for super admin users (check via AdminRole)
    // Super admins should have role === 'super_admin' in AdminRole
    const filteredRoles = adminRoles.filter(role => {
        // Super admin role is valid, but legacy isSuperAdmin users shouldn't have AdminRole entries
        // Since we're unifying, we keep all AdminRole entries
        return true;
    });

    res.status(200).json({
        adminRoles: filteredRoles,
    });
});

export const getAdminRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }
    // Users can view their own role, super admin can view any (computed from AdminRole)
    if (userId !== req.user._id.toString() && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    const adminRole = await AdminRole.findOne({ userId })
        .populate('userId', 'username email displayName')
        .populate('grantedBy', 'username displayName')
        .lean();

    if (!adminRole) {
        return res.status(404).json({
            message: 'Không tìm thấy quyền admin',
        });
    }

    res.status(200).json({
        adminRole,
    });
});

export const createAdminRole = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const { userId, role, permissions, expiresAt, active, allowedIPs } = req.body;

    if (!userId) {
        return res.status(400).json({
            message: 'Cần ID tên tài khoản',
        });
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'moderator'];
    const selectedRole = role || 'admin';
    if (!validRoles.includes(selectedRole)) {
        return res.status(400).json({
            message: `Vai trò không hợp lệ. Phải là một trong: ${validRoles.join(', ')}`,
        });
    }

    // Validate permissions against role constraints
    if (permissions) {
        const validation = validatePermissionsForRole(selectedRole, permissions);
        if (!validation.valid) {
            return res.status(400).json({
                message: 'Quyền hạn không hợp lệ cho vai trò này',
                errors: validation.errors,
            });
        }
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tài khoản',
        });
    }

    // Super admins can create admin roles for anyone, including other super admins

    // Check if admin role already exists
    const existingRole = await AdminRole.findOne({ userId });

    if (existingRole) {
        return res.status(400).json({
            message: 'Tài khoản đang có quyền admin',
        });
    }

    // Note: isAdmin is computed from AdminRole (single source of truth)
    // No need to write to User.isAdmin - it is computed automatically

    // Create admin role with validated permissions
    // Apply role inheritance: admin automatically gets all moderator permissions
    const defaultPermissions = {
        viewDashboard: true, // Default permission for all roles
    };

    // Start with user-provided permissions (if any)
    const userPermissions = permissions
        ? { ...defaultPermissions, ...permissions }
        : defaultPermissions;

    // Apply automatic inheritance based on role
    // Admin inherits all moderator permissions, super_admin inherits all admin permissions
    const finalPermissions = applyRoleInheritance(selectedRole, userPermissions);

    // Validate and process expiresAt
    let expiresAtDate = null;
    if (expiresAt) {
        expiresAtDate = new Date(expiresAt);
        if (isNaN(expiresAtDate.getTime())) {
            return res.status(400).json({ message: 'Ngày hết hạn không hợp lệ' });
        }
        if (expiresAtDate < new Date()) {
            return res.status(400).json({ message: 'Ngày hết hạn không thể là quá khứ' });
        }
    }

    // Validate active flag
    const isActive = active !== undefined ? active : true;

    // Validate and process allowedIPs
    let validatedIPs = [];
    if (allowedIPs && Array.isArray(allowedIPs) && allowedIPs.length > 0) {
        // Basic IP validation (IPv4, IPv6, CIDR)
        const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-3]?[0-9]))?$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(?:\/\d{1,3})?$/;
        const ipv6CompressedRegex = /^::1$|^::$|^([0-9a-fA-F]{1,4}:)+::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}(\/\d{1,3})?$/;

        validatedIPs = allowedIPs.filter(ip => {
            const trimmed = String(ip || '').trim();
            return ipv4Regex.test(trimmed) || ipv6Regex.test(trimmed) || ipv6CompressedRegex.test(trimmed);
        });

        if (validatedIPs.length !== allowedIPs.length) {
            return res.status(400).json({ message: 'Một hoặc nhiều địa chỉ IP không hợp lệ' });
        }
    }

    const adminRole = await AdminRole.create({
        userId,
        role: selectedRole,
        permissions: finalPermissions,
        grantedBy: req.user._id,
        expiresAt: expiresAtDate,
        active: isActive,
        allowedIPs: validatedIPs,
    });

    await adminRole.populate('userId', 'username email displayName');
    await adminRole.populate('grantedBy', 'username displayName');

    // Invalidate permission cache for this user (all IPs)
    invalidateUserCache(userId);

    // Log permission change
    await logPermissionChange({
        action: 'create',
        performedBy: req.user,
        targetUser: user,
        newRole: {
            role: adminRole.role,
            permissions: adminRole.permissions,
            grantedBy: adminRole.grantedBy,
        },
        reason: req.body.reason ? String(req.body.reason) : null,
        ipAddress: getClientIp(req),
    });

    res.status(201).json({
        message: 'Thêm quyền admin thành công',
        adminRole,
    });
});

export const updateAdminRole = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const { userId } = req.params;
    const { role, permissions, reason, expiresAt, active, allowedIPs } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const adminRole = await AdminRole.findOne({ userId });

    if (!adminRole) {
        return res.status(404).json({
            message: 'Tài khoản này không có quyền admin',
        });
    }

    // System-created roles (grantedBy is null) cannot be edited, even by super admins
    if (!adminRole.grantedBy) {
        return res.status(403).json({
            message: 'Không thể chỉnh sửa quyền được tạo bởi hệ thống',
        });
    }

    // Super admins can edit any admin role, including their own and other super admins

    // Store old role data for audit logging
    const oldRole = {
        role: adminRole.role,
        permissions: { ...adminRole.permissions.toObject() },
    };

    // Determine the role to validate against (use new role if provided, otherwise current role)
    const roleToValidate = role !== undefined ? role : adminRole.role;

    // Validate role if it's being changed
    if (role !== undefined) {
        const validRoles = ['super_admin', 'admin', 'moderator'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: `Vai trò không hợp lệ. Phải là một trong: ${validRoles.join(', ')}`,
            });
        }
    }

    // Validate permissions against role constraints
    // If permissions are being updated, validate the merged result
    if (permissions !== undefined) {
        // Merge current permissions with new permissions
        const mergedPermissions = {
            ...adminRole.permissions.toObject(),
            ...permissions,
        };

        // Apply role inheritance to ensure inherited permissions are set
        const permissionsWithInheritance = applyRoleInheritance(roleToValidate, mergedPermissions);

        // Validate merged permissions against the role (new role if changed, otherwise current role)
        const validation = validatePermissionsForRole(roleToValidate, permissionsWithInheritance);
        if (!validation.valid) {
            return res.status(400).json({
                message: 'Quyền hạn không hợp lệ cho vai trò này',
                errors: validation.errors,
            });
        }
    }

    const updateData = {};

    // Handle expiresAt
    if (expiresAt !== undefined) {
        if (expiresAt === null) {
            updateData.expiresAt = null; // Clear expiration
        } else {
            const expiresAtDate = new Date(expiresAt);
            if (isNaN(expiresAtDate.getTime())) {
                return res.status(400).json({ message: 'Ngày hết hạn không hợp lệ' });
            }
            if (expiresAtDate < new Date()) {
                return res.status(400).json({ message: 'Ngày hết hạn không thể là quá khứ' });
            }
            updateData.expiresAt = expiresAtDate;
        }
    }

    // Handle active flag
    if (active !== undefined) {
        updateData.active = active;
    }

    // Handle allowedIPs
    if (allowedIPs !== undefined) {
        if (!Array.isArray(allowedIPs)) {
            return res.status(400).json({ message: 'allowedIPs phải là một mảng' });
        }

        if (allowedIPs.length === 0) {
            updateData.allowedIPs = []; // Clear IP restrictions
        } else {
            // Validate IP addresses
            const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-3]?[0-9]))?$/;
            const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(?:\/\d{1,3})?$/;
            const ipv6CompressedRegex = /^::1$|^::$|^([0-9a-fA-F]{1,4}:)+::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}(\/\d{1,3})?$/;

            const validatedIPs = allowedIPs.filter(ip => {
                const trimmed = String(ip || '').trim();
                return ipv4Regex.test(trimmed) || ipv6Regex.test(trimmed) || ipv6CompressedRegex.test(trimmed);
            });

            if (validatedIPs.length !== allowedIPs.length) {
                return res.status(400).json({ message: 'Một hoặc nhiều địa chỉ IP không hợp lệ' });
            }

            updateData.allowedIPs = validatedIPs;
        }
    }

    if (role !== undefined) {
        updateData.role = role;
    }

    if (permissions !== undefined) {
        // Merge permissions and apply inheritance
        const mergedPermissions = {
            ...adminRole.permissions.toObject(),
            ...permissions,
        };
        // Apply inheritance to ensure inherited permissions are always true
        updateData.permissions = applyRoleInheritance(roleToValidate, mergedPermissions);
    }

    const updatedRole = await AdminRole.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, runValidators: true }
    )
        .populate('userId', 'username email displayName')
        .populate('grantedBy', 'username displayName');

    // Invalidate permission cache for this user (all IPs)
    invalidateUserCache(userId);

    // Get target user for audit logging
    const targetUser = await User.findById(userId).select('username email displayName').lean();

    // Log permission change
    await logPermissionChange({
        action: 'update',
        performedBy: req.user,
        targetUser: targetUser || { _id: userId },
        oldRole,
        newRole: {
            role: updatedRole.role,
            permissions: updatedRole.permissions.toObject(),
        },
        reason: reason ? String(reason) : null,
        ipAddress: getClientIp(req),
    });

    res.status(200).json({
        message: 'Cập nhật quyền admin thành công',
        adminRole: updatedRole,
    });
});

export const deleteAdminRole = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const { userId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const adminRole = await AdminRole.findOne({ userId });

    if (!adminRole) {
        return res.status(404).json({
            message: 'Tải khoản này không có quyền admin',
        });
    }

    // System-created roles (grantedBy is null) cannot be deleted, even by super admins
    if (!adminRole.grantedBy) {
        return res.status(403).json({
            message: 'Không thể xóa quyền được tạo bởi hệ thống',
        });
    }

    // Super admins can delete any admin role, including their own and other super admins

    // Store old role data for audit logging
    const oldRole = {
        role: adminRole.role,
        permissions: { ...adminRole.permissions.toObject() },
    };

    // Get target user for audit logging
    const targetUser = await User.findById(userId).select('username email displayName').lean();

    // Remove admin role
    await AdminRole.findOneAndDelete({ userId });

    // Invalidate permission cache for this user (all IPs)
    invalidateUserCache(userId);

    // Note: isAdmin is computed from AdminRole (single source of truth)
    // No need to write to User.isAdmin - it will be computed as false automatically

    // Log permission change
    await logPermissionChange({
        action: 'delete',
        performedBy: req.user,
        targetUser: targetUser || { _id: userId },
        oldRole,
        reason: reason ? String(reason) : null,
        ipAddress: getClientIp(req),
    });

    res.status(200).json({
        message: 'Xoá quyền admin thành công',
    });
});

