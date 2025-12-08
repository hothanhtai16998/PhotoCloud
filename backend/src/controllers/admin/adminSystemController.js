import User from '../../models/User.js';
import SystemLog from '../../models/SystemLog.js';
import Settings from '../../models/Settings.js';
import Notification from '../../models/Notification.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { getCacheStats as getPermissionCacheStats } from '../../utils/permissionCache.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

// System Logs
export const getSystemLogs = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewLogs') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
    const skip = (page - 1) * limit;
    const level = req.query.level; // Filter by level
    const action = req.query.action; // Filter by action (e.g., 'permission_create', 'permission_update', 'permission_delete')
    const search = req.query.search || '';

    // Build query
    let query = {};
    if (level) {
        query.level = level;
    }
    if (action) {
        query.action = action;
    }
    if (search) {
        query.message = { $regex: escapeRegex(search), $options: 'i' };
    }

    const [logs, total] = await Promise.all([
        SystemLog.find(query)
            .populate('userId', 'username displayName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SystemLog.countDocuments(query),
    ]);

    res.json({
        logs: logs.map(log => ({
            _id: log._id,
            timestamp: log.createdAt,
            level: log.level,
            message: log.message,
            userId: log.userId,
            action: log.action,
            metadata: log.metadata,
        })),
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

// Public Settings (read-only, no authentication required)
export const getPublicSettings = asyncHandler(async (req, res) => {
    const settings = await Settings.findOne({ key: 'system' });

    if (!settings) {
        // Return default settings without creating them (public endpoint shouldn't modify data)
        return res.json({
            settings: {
                siteName: 'PhotoApp',
                siteDescription: 'Discover beautiful photos',
                maxUploadSize: 10,
                allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
                maintenanceMode: false,
                // Password requirements (public, needed for signup form)
                passwordMinLength: 8,
                passwordRequireUppercase: true,
                passwordRequireLowercase: true,
                passwordRequireNumber: true,
                passwordRequireSpecialChar: false,
            },
        });
    }

    // Return only public settings (exclude sensitive data if any)
    const publicSettings = {
        siteName: settings.value.siteName || 'PhotoApp',
        siteDescription: settings.value.siteDescription || 'Discover beautiful photos',
        maxUploadSize: settings.value.maxUploadSize || 10,
        allowedFileTypes: settings.value.allowedFileTypes || ['jpg', 'jpeg', 'png', 'webp'],
        maintenanceMode: settings.value.maintenanceMode || false,
        // Password requirements (public, needed for signup form)
        passwordMinLength: settings.value.passwordMinLength || 8,
        passwordRequireUppercase: settings.value.passwordRequireUppercase ?? true,
        passwordRequireLowercase: settings.value.passwordRequireLowercase ?? true,
        passwordRequireNumber: settings.value.passwordRequireNumber ?? true,
        passwordRequireSpecialChar: settings.value.passwordRequireSpecialChar ?? false,
    };

    res.json({ settings: publicSettings });
});

// Settings Management (admin only)
export const getSettings = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageSettings') middleware

    const settings = await Settings.findOne({ key: 'system' });

    if (!settings) {
        // Create default settings
        const defaultSettings = await Settings.create({
            key: 'system',
            value: {
                siteName: 'PhotoApp',
                siteDescription: 'Discover beautiful photos',
                maxUploadSize: 10,
                allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
                maintenanceMode: false,
            },
            description: 'System-wide settings',
        });
        return res.json({ settings: defaultSettings.value });
    }

    res.json({ settings: settings.value });
});

export const updateSettings = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageSettings') middleware

    const { settings } = req.body;

    let systemSettings = await Settings.findOne({ key: 'system' });

    if (!systemSettings) {
        systemSettings = await Settings.create({
            key: 'system',
            value: settings,
            description: 'System-wide settings',
            updatedBy: req.user._id,
        });
    } else {
        systemSettings.value = { ...systemSettings.value, ...settings };
        systemSettings.updatedBy = req.user._id;
        await systemSettings.save();
    }

    // Log action
    await SystemLog.create({
        level: 'info',
        message: 'System settings updated',
        userId: req.user._id,
        action: 'updateSettings',
        metadata: { settings },
    });

    // Invalidate monitoring settings cache if it exists
    try {
        const { invalidateSettingsCache } = await import('../../utils/alertMonitor.js');
        invalidateSettingsCache();
    } catch (error) {
        // Ignore if alertMonitor not available
    }

    res.json({
        message: 'Đã cập nhật cài đặt thành công',
        settings: systemSettings.value,
    });
});

/**
 * Create system announcement
 * POST /api/admin/announcements
 */
export const createSystemAnnouncement = asyncHandler(async (req, res) => {
    const { type, title, message, recipientIds } = req.body;

    // Validate required fields
    if (!type || !title || !message) {
        return res.status(400).json({
            success: false,
            message: 'Type, title, and message are required',
        });
    }

    // Validate type
    const validTypes = ['system_announcement', 'feature_update', 'maintenance_scheduled', 'terms_updated'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid announcement type',
        });
    }

    try {
        let recipients = [];

        // If recipientIds provided, send to specific users
        if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
            // Validate ObjectIds
            const validIds = recipientIds.filter(id => mongoose.Types.ObjectId.isValid(id));
            recipients = validIds;
        } else {
            // Send to all users
            const allUsers = await User.find({}).select('_id').lean();
            recipients = allUsers.map(user => user._id);
        }

        const titleStr = String(title);
        const messageStr = String(message);

        // Create notifications for all recipients
        const notificationPromises = recipients.map(recipientId =>
            Notification.create({
                recipient: recipientId,
                type: type,
                actor: req.user._id,
                metadata: {
                    title: titleStr,
                    message: messageStr,
                    announcementType: type,
                },
            })
        );

        await Promise.all(notificationPromises);

        // Log action
        await SystemLog.create({
            level: 'info',
            message: `System announcement created: ${type}`,
            userId: req.user._id,
            action: 'createAnnouncement',
            metadata: { type, title, recipientCount: recipients.length },
        });

        res.json({
            success: true,
            message: `Đã gửi thông báo đến ${recipients.length} người dùng`,
            recipientCount: recipients.length,
        });
    } catch (error) {
        logger.error('Error creating system announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create system announcement',
        });
    }
});

// Cache Test Endpoint (for testing permission caching)
export const getCacheStats = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const stats = getPermissionCacheStats();

    res.json({
        message: 'Permission cache statistics',
        cache: stats,
        timestamp: new Date().toISOString(),
    });
});

// System Metrics Endpoint
export const getSystemMetrics = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewDashboard') middleware in routes
    
    const { getSystemStatus } = await import('../../utils/systemMetrics.js');
    const status = await getSystemStatus();
    
    res.json(status);
});

