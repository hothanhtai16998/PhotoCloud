import Notification from '../models/Notification.js';
import { emitNotification, emitUnreadCount } from './socketServer.js';
import { logger } from './logger.js';

/**
 * Helper function to create notification and emit via WebSocket
 * This ensures notifications are delivered instantly to connected clients
 * 
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} Created notification
 */
export const createAndEmitNotification = async (notificationData) => {
	try {
		// Create notification in database
		const notification = await Notification.create(notificationData);

		// Populate notification with related data
		const populatedNotification = await Notification.findById(notification._id)
			.populate('actor', 'username displayName avatarUrl')
			.populate('image', 'imageTitle thumbnailUrl smallUrl')
			.populate('collection', 'name coverImage')
			.lean();

		// Emit via WebSocket for instant delivery
		emitNotification(notificationData.recipient.toString(), populatedNotification);

		// Also emit updated unread count
		const unreadCount = await Notification.countDocuments({
			recipient: notificationData.recipient,
			isRead: false,
		});
		emitUnreadCount(notificationData.recipient.toString(), unreadCount);

		return populatedNotification;
	} catch (error) {
		logger.error('Failed to create and emit notification:', error);
		throw error;
	}
};


