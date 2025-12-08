import { asyncHandler } from '../middlewares/asyncHandler.js';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { logger } from '../utils/logger.js';

/**
 * Get user's notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { unreadOnly = false, limit = 50 } = req.query;

    const query = { recipient: userId };
    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const notifications = await Notification.find(query)
        .populate('collection', 'name coverImage')
        .populate('actor', 'username displayName avatarUrl')
        .populate('image', 'imageTitle thumbnailUrl smallUrl')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    res.json({
        success: true,
        notifications,
        unreadCount,
    });
});

/**
 * Mark notification as read
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId,
    });

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thông báo',
        });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    res.json({
        success: true,
        notification,
        unreadCount,
    });
});

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
    );

    res.json({
        success: true,
        message: 'Đã đánh dấu tất cả thông báo là đã đọc',
    });
});

/**
 * Delete notification
 */
export const deleteNotification = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId,
    });

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thông báo',
        });
    }

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    res.json({
        success: true,
        message: 'Đã xóa thông báo',
        unreadCount,
    });
});

/**
 * Get unread notification count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    res.json({
        success: true,
        unreadCount,
    });
});

