import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../libs/env.js';
import User from '../models/User.js';
import { enrichUserWithAdminStatus } from './adminUtils.js';
import { logger } from './logger.js';

let io = null;

/**
 * Initialize Socket.io server
 * @param {import('http').Server} httpServer - HTTP server instance
 */
export const initializeSocketServer = (httpServer) => {
	io = new Server(httpServer, {
		cors: {
			origin: env.CLIENT_URL || env.FRONTEND_URL || '*',
			credentials: true,
			methods: ['GET', 'POST'],
		},
		transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
	});

	// Authentication middleware for Socket.io
	io.use(async (socket, next) => {
		try {
			// Try to get token from auth object first, then from headers
			const token = socket.handshake.auth?.token || 
				(socket.handshake.headers?.authorization?.startsWith('Bearer ') 
					? socket.handshake.headers.authorization.split(' ')[1]
					: null);

			if (!token) {
				logger.warn('Socket connection attempt without token');
				return next(new Error('Authentication token required'));
			}

			// Verify JWT token
			const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

			// Find user
			const user = await User.findById(decoded.userId).select('-hashedPassword').lean();

			if (!user) {
				return next(new Error('User not found'));
			}

			// Enrich user with admin status
			const clientIP = socket.handshake.address || socket.request.connection.remoteAddress;
			const enrichedUser = await enrichUserWithAdminStatus(user, clientIP);

			// Attach user to socket
			socket.userId = enrichedUser._id.toString();
			socket.user = enrichedUser;

			next();
		} catch (error) {
			if (error.name === 'TokenExpiredError') {
				logger.warn('Socket connection with expired token');
				return next(new Error('Token expired'));
			}
			if (error.name === 'JsonWebTokenError') {
				logger.warn('Socket connection with invalid token');
				return next(new Error('Invalid token'));
			}
			logger.error('Socket authentication error:', error.message || error);
			next(new Error('Authentication failed'));
		}
	});

	// Handle connections
	io.on('connection', (socket) => {
		const userId = socket.userId;
		logger.info(`Socket connected: ${userId}`);

		// Join user's personal room for notifications
		socket.join(`user:${userId}`);

		// Handle joining a collection room for real-time collaboration
		socket.on('collection:join', (collectionId) => {
			if (collectionId && typeof collectionId === 'string') {
				socket.join(`collection:${collectionId}`);
				logger.info(`User ${userId} joined collection room: ${collectionId}`);
			}
		});

		// Handle leaving a collection room
		socket.on('collection:leave', (collectionId) => {
			if (collectionId && typeof collectionId === 'string') {
				socket.leave(`collection:${collectionId}`);
				logger.info(`User ${userId} left collection room: ${collectionId}`);
			}
		});

		// Handle joining an image room for real-time favorite count updates
		socket.on('image:join', (imageId) => {
			if (imageId && typeof imageId === 'string') {
				socket.join(`image:${imageId}`);
				logger.info(`User ${userId} joined image room: ${imageId}`);
			}
		});

		// Handle leaving an image room
		socket.on('image:leave', (imageId) => {
			if (imageId && typeof imageId === 'string') {
				socket.leave(`image:${imageId}`);
				logger.info(`User ${userId} left image room: ${imageId}`);
			}
		});

		// Handle joining a user profile room for real-time follow count updates
		socket.on('profile:join', (userId) => {
			if (userId && typeof userId === 'string') {
				socket.join(`profile:${userId}`);
				logger.info(`User ${socket.userId} joined profile room: ${userId}`);
			}
		});

		// Handle leaving a user profile room
		socket.on('profile:leave', (userId) => {
			if (userId && typeof userId === 'string') {
				socket.leave(`profile:${userId}`);
				logger.info(`User ${socket.userId} left profile room: ${userId}`);
			}
		});

		// Handle disconnection
		socket.on('disconnect', (reason) => {
			logger.info(`Socket disconnected: ${userId}, reason: ${reason}`);
		});

		// Handle errors
		socket.on('error', (error) => {
			logger.error(`Socket error for user ${userId}:`, error);
		});
	});

	logger.info('✅ Socket.io server initialized');
	return io;
};

/**
 * Get Socket.io instance
 */
export const getSocketServer = () => {
	if (!io) {
		throw new Error('Socket.io server not initialized. Call initializeSocketServer first.');
	}
	return io;
};

/**
 * Emit notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - Notification object
 */
export const emitNotification = (userId, notification) => {
	if (!io) {
		logger.warn('Socket.io not initialized, notification not sent via WebSocket');
		return;
	}

	try {
		io.to(`user:${userId}`).emit('notification', notification);
		logger.info(`Notification emitted to user ${userId}:`, notification.type);
	} catch (error) {
		logger.error('Failed to emit notification:', error);
	}
};

/**
 * Emit unread count update to a specific user
 * @param {string} userId - User ID
 * @param {number} unreadCount - New unread count
 */
export const emitUnreadCount = (userId, unreadCount) => {
	if (!io) {
		return;
	}

	try {
		io.to(`user:${userId}`).emit('unread-count', { unreadCount });
	} catch (error) {
		logger.error('Failed to emit unread count:', error);
	}
};

/**
 * Emit collection update to all users viewing the collection
 * @param {string} collectionId - Collection ID
 * @param {object} update - Update data (type, imageId, image, etc.)
 */
export const emitCollectionUpdate = (collectionId, update) => {
	if (!io) {
		logger.warn('Socket.io not initialized, collection update not sent via WebSocket');
		return;
	}

	try {
		// Emit to collection room (all users viewing this collection)
		io.to(`collection:${collectionId}`).emit('collection:updated', update);
		logger.info(`Collection update emitted to collection ${collectionId}:`, update.type);
	} catch (error) {
		logger.error('Failed to emit collection update:', error);
	}
};

/**
 * Helper to get all user IDs who should receive collection updates
 * (owner + collaborators)
 * @param {object} collection - Collection object with createdBy and collaborators
 * @returns {string[]} Array of user IDs
 */
export const getCollectionRecipients = (collection) => {
	const recipients = new Set();
	
	// Add owner
	if (collection.createdBy) {
		const ownerId = typeof collection.createdBy === 'object' 
			? collection.createdBy._id?.toString() 
			: collection.createdBy.toString();
		if (ownerId) {
			recipients.add(ownerId);
		}
	}
	
	// Add collaborators
	if (collection.collaborators && Array.isArray(collection.collaborators)) {
		collection.collaborators.forEach(collab => {
			if (collab.user) {
				const collabId = typeof collab.user === 'object'
					? collab.user._id?.toString()
					: collab.user.toString();
				if (collabId) {
					recipients.add(collabId);
				}
			}
		});
	}
	
	return Array.from(recipients);
};

/**
 * Emit image favorite count update to all users viewing the image
 * @param {string} imageId - Image ID
 * @param {object} update - Update data (favoriteCount, action, etc.)
 */
export const emitImageFavoriteUpdate = (imageId, update) => {
	if (!io) {
		logger.warn('Socket.io not initialized, image favorite update not sent via WebSocket');
		return;
	}

	try {
		// Emit to image room (all users viewing this image)
		io.to(`image:${imageId}`).emit('image:favorite_updated', update);
		logger.info(`Image favorite update emitted to image ${imageId}:`, update.action);
	} catch (error) {
		logger.error('Failed to emit image favorite update:', error);
	}
};

/**
 * Emit user follow count update to all users viewing the profile
 * @param {string} userId - User ID whose counts changed
 * @param {object} update - Update data (followersCount, followingCount, action, etc.)
 */
export const emitUserFollowUpdate = (userId, update) => {
	if (!io) {
		logger.warn('Socket.io not initialized, user follow update not sent via WebSocket');
		return;
	}

	try {
		// Emit to profile room (all users viewing this profile)
		// Note: We use 'profile:userId' room which is different from the personal notification room 'user:userId'
		// This allows multiple users viewing the same profile to get updates
		io.to(`profile:${userId}`).emit('user:follow_updated', update);
		logger.info(`User follow update emitted to profile ${userId}:`, update.action);
	} catch (error) {
		logger.error('Failed to emit user follow update:', error);
	}
};

/**
 * Emit image stats update (views/downloads) to all users viewing the image
 * @param {string} imageId - Image ID
 * @param {object} update - Update data (views, downloads, dailyViews, dailyDownloads, action, etc.)
 */
export const emitImageStatsUpdate = (imageId, update) => {
	if (!io) {
		logger.warn('Socket.io not initialized, image stats update not sent via WebSocket');
		return;
	}

	try {
		// Emit to image room (all users viewing this image)
		io.to(`image:${imageId}`).emit('image:stats_updated', update);
		logger.info(`Image stats update emitted to image ${imageId}:`, update.action);
	} catch (error) {
		logger.error('Failed to emit image stats update:', error);
	}
};

