import { asyncHandler } from '../middlewares/asyncHandler.js';
import mongoose from 'mongoose';
import Report from '../models/Report.js';
import Image from '../models/Image.js';
import Collection from '../models/Collection.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { logger } from '../utils/logger.js';

/**
 * Create a report
 * POST /api/reports
 */
export const createReport = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { type, targetId, reason, description } = req.body;

    // Validate required fields
    if (!type || !targetId || !reason) {
        return res.status(400).json({
            success: false,
            message: 'Type, targetId, and reason are required',
        });
    }

    // Validate type
    if (!['image', 'collection', 'user'].includes(type)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid report type',
        });
    }

    // Validate reason
    const validReasons = [
        'inappropriate_content',
        'spam',
        'copyright_violation',
        'harassment',
        'fake_account',
        'other',
    ];
    if (!validReasons.includes(reason)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid report reason',
        });
    }

    // Check if target exists
    let target;
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ success: false, message: 'Invalid target ID' });
    }

    if (type === 'image') {
        target = await Image.findById(targetId);
    } else if (type === 'collection') {
        target = await Collection.findById(targetId);
    } else if (type === 'user') {
        target = await User.findById(targetId);
        // Prevent reporting yourself
        if (target && target._id && target._id.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot report yourself',
            });
        }
    }

    if (!target) {
        return res.status(404).json({
            success: false,
            message: 'Target not found',
        });
    }

    // Check if user already reported this target
    const existingReport = await Report.findOne({
        type,
        targetId,
        reporter: userId,
        status: { $in: ['pending', 'reviewing'] },
    });

    if (existingReport) {
        return res.status(409).json({
            success: false,
            message: 'You have already reported this item',
        });
    }

    // Create report
    const report = await Report.create({
        reporter: userId,
        type,
        targetId,
        reason,
        description: String(description || '').trim() || '',
        status: 'pending',
    });

    // Create notification for all admins
    try {
        // Find all admins to notify
        const admins = await User.find({
            $or: [{ isAdmin: true }, { isSuperAdmin: true }]
        }).select('_id').lean();

        if (admins.length > 0) {
            const notificationType = type === 'image' ? 'image_reported' :
                type === 'collection' ? 'collection_reported' :
                    'user_reported';

            // Create notifications for all admins
            const notificationPromises = admins.map(admin => {
                const notificationData = {
                    recipient: admin._id,
                    type: notificationType,
                    actor: userId,
                    metadata: {
                        reportId: report._id.toString(),
                        reason: reason,
                        description: String(description || '').trim() || '',
                        targetType: type,
                    },
                };

                // Add target reference based on type
                if (type === 'image') {
                    notificationData.image = targetId;
                } else if (type === 'collection') {
                    notificationData.collection = targetId;
                }

                return Notification.create(notificationData);
            });

            await Promise.all(notificationPromises);
        }
    } catch (notifError) {
        logger.error('Failed to create report notification:', notifError);
        // Don't fail the report if notification fails
    }

    res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        report,
    });
});

/**
 * Get user's reports
 * GET /api/reports
 */
export const getUserReports = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
        Report.find({ reporter: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Report.countDocuments({ reporter: userId }),
    ]);

    res.json({
        success: true,
        reports,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Get all reports (admin only)
 * GET /api/reports/admin
 */
export const getAllReports = asyncHandler(async (req, res) => {
    const { status, type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) {
        query.status = status;
    }
    if (type) {
        query.type = type;
    }

    const [reports, total] = await Promise.all([
        Report.find(query)
            .populate('reporter', 'username displayName avatarUrl')
            .populate('reviewedBy', 'username displayName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Report.countDocuments(query),
    ]);

    res.json({
        success: true,
        reports,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
        },
    });
});

/**
 * Update report status (admin only)
 * PATCH /api/reports/:reportId
 */
export const updateReportStatus = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { status, resolution } = req.body;
    const userId = req.user._id;

    // Validate status
    const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status',
        });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
        return res.status(404).json({
            success: false,
            message: 'Report not found',
        });
    }

    // Update report
    report.status = status;
    if (status === 'reviewing' || status === 'resolved' || status === 'dismissed') {
        report.reviewedBy = userId;
        report.reviewedAt = new Date();
    }
    if (resolution) {
        report.resolution = String(resolution).trim();
    }

    await report.save();

    // Notify reporter about status change
    try {
        await Notification.create({
            recipient: report.reporter,
            type: 'system_announcement',
            actor: userId,
            metadata: {
                title: 'Report Status Update',
                message: `Your report has been ${status}. ${resolution || ''}`,
                reportId: report._id,
            },
        });
    } catch (notifError) {
        logger.error('Failed to create report status notification:', notifError);
        // Don't fail if notification fails
    }

    res.json({
        success: true,
        message: 'Report status updated',
        report,
    });
});

