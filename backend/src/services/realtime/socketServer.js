import { canJoinCollectionRoom, canJoinImageRoom, canJoinProfileRoom } from './roomPermissions.js';
export { clearPermissionCache } from './roomPermissions.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import User from '../../models/User.js';
import { enrichUserWithAdminStatus } from '../permissions/adminUtils.js';
import { logger } from '../../utils/logger.js';
import { socketMetrics } from './socketMetrics.js';

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
				socketMetrics.recordError('auth');
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
			socketMetrics.recordError('auth');
			socketMetrics.recordFailedConnection();
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
		// Connection logged at debug level only

		// Record connection in metrics (with userId for unique user tracking)
		socketMetrics.recordConnection(socket.id, userId);

		// Join user's personal room for notifications
		socket.join(`user:${userId}`);

		// Handle joining a collection room for real-time collaboration
		socket.on('collection:join', async (collectionId) => {
			if (!collectionId || typeof collectionId !== 'string') {
				return socket.emit('error', { message: 'Invalid collection ID', code: 'INVALID_INPUT' });
			}
			
			try {
				// Authorization check
				const hasPermission = await canJoinCollectionRoom(userId, collectionId);
				
			if (!hasPermission) {
				logger.warn(`User ${userId} attempted to join unauthorized collection room: ${collectionId}`);
				socketMetrics.recordError('join');
				return socket.emit('error', { 
					message: 'Unauthorized: You do not have access to this collection',
					code: 'ROOM_ACCESS_DENIED',
					resourceType: 'collection',
					resourceId: collectionId
				});
			}
			
			socket.join(`collection:${collectionId}`);
			socketMetrics.recordRoomJoin(`collection:${collectionId}`);
			// Room join logged silently
				
				// Acknowledge successful join
				socket.emit('collection:joined', { collectionId });
			} catch (error) {
				logger.error(`Error joining collection room ${collectionId}:`, error);
				socket.emit('error', { 
					message: 'Failed to join collection room',
					code: 'JOIN_ERROR'
				});
			}
		});

		// Handle leaving a collection room
		socket.on('collection:leave', (collectionId) => {
			if (collectionId && typeof collectionId === 'string') {
				socket.leave(`collection:${collectionId}`);
				socketMetrics.recordRoomLeave(`collection:${collectionId}`);
				// Room leave logged silently
			}
		});

		// Handle joining an image room for real-time favorite count updates
		socket.on('image:join', async (imageId) => {
			if (!imageId || typeof imageId !== 'string') {
				return socket.emit('error', { message: 'Invalid image ID', code: 'INVALID_INPUT' });
			}
			
			try {
				// Authorization check
				const hasPermission = await canJoinImageRoom(userId, imageId);
				
			if (!hasPermission) {
				logger.warn(`User ${userId} attempted to join unauthorized image room: ${imageId}`);
				socketMetrics.recordError('join');
				return socket.emit('error', { 
					message: 'Unauthorized: You do not have access to this image',
					code: 'ROOM_ACCESS_DENIED',
					resourceType: 'image',
					resourceId: imageId
				});
			}
			
			socket.join(`image:${imageId}`);
			socketMetrics.recordRoomJoin(`image:${imageId}`);
			// Room join logged silently
				
				// Acknowledge successful join
				socket.emit('image:joined', { imageId });
			} catch (error) {
				logger.error(`Error joining image room ${imageId}:`, error);
				socket.emit('error', { 
					message: 'Failed to join image room',
					code: 'JOIN_ERROR'
				});
			}
		});

		// Handle leaving an image room
		socket.on('image:leave', (imageId) => {
			if (imageId && typeof imageId === 'string') {
				socket.leave(`image:${imageId}`);
				socketMetrics.recordRoomLeave(`image:${imageId}`);
				// Room leave logged silently
			}
		});

		// Handle joining a user profile room for real-time follow count updates
		socket.on('profile:join', async (targetUserId) => {
			if (!targetUserId || typeof targetUserId !== 'string') {
				return socket.emit('error', { message: 'Invalid user ID', code: 'INVALID_INPUT' });
			}
			
			try {
				// Authorization check
				const hasPermission = await canJoinProfileRoom(socket.userId, targetUserId);
				
			if (!hasPermission) {
				logger.warn(`User ${socket.userId} attempted to join unauthorized profile room: ${targetUserId}`);
				socketMetrics.recordError('join');
				return socket.emit('error', { 
					message: 'Unauthorized: You do not have access to this profile',
					code: 'ROOM_ACCESS_DENIED',
					resourceType: 'profile',
					resourceId: targetUserId
				});
			}
			
			socket.join(`profile:${targetUserId}`);
			socketMetrics.recordRoomJoin(`profile:${targetUserId}`);
			// Room join logged silently
				
				// Acknowledge successful join
				socket.emit('profile:joined', { userId: targetUserId });
			} catch (error) {
				logger.error(`Error joining profile room ${targetUserId}:`, error);
				socket.emit('error', { 
					message: 'Failed to join profile room',
					code: 'JOIN_ERROR'
				});
			}
		});

		// Handle leaving a user profile room
		socket.on('profile:leave', (userId) => {
			if (userId && typeof userId === 'string') {
				socket.leave(`profile:${userId}`);
				socketMetrics.recordRoomLeave(`profile:${userId}`);
				// Room leave logged silently
			}
		});

		// Handle disconnection
		socket.on('disconnect', (reason) => {
			// Disconnection logged at debug level only
			// Record disconnection in metrics
			socketMetrics.recordDisconnection(socket.id);
		});

		// Handle errors
		socket.on('error', (error) => {
			logger.error(`Socket error for user ${userId}:`, error);
			socketMetrics.recordError('other');
		});
	});

	// Socket.io initialized silently
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
		// Socket not initialized - skip silently (expected in some scenarios)
		return;
	}

	try {
		const startTime = Date.now();
		io.to(`user:${userId}`).emit('notification', notification);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('notification', latency);
		// Notification emitted silently
	} catch (error) {
		socketMetrics.recordError('emit');
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
		// Socket not initialized - skip silently
		return;
	}

	try {
		const startTime = Date.now();
		// Emit to collection room (all users viewing this collection)
		io.to(`collection:${collectionId}`).emit('collection:updated', update);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('collection:updated', latency);
		// Collection update emitted silently
	} catch (error) {
		socketMetrics.recordError('emit');
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
		// Socket not initialized - skip silently
		return;
	}

	try {
		const startTime = Date.now();
		// Emit to image room (all users viewing this image)
		io.to(`image:${imageId}`).emit('image:favorite_updated', update);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('image:favorite_updated', latency);
		// Favorite update emitted silently
	} catch (error) {
		socketMetrics.recordError('emit');
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
		// Socket not initialized - skip silently
		return;
	}

	try {
		const startTime = Date.now();
		// Emit to profile room (all users viewing this profile)
		// Note: We use 'profile:userId' room which is different from the personal notification room 'user:userId'
		// This allows multiple users viewing the same profile to get updates
		io.to(`profile:${userId}`).emit('user:follow_updated', update);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('user:follow_updated', latency);
		// Follow update emitted silently
	} catch (error) {
		socketMetrics.recordError('emit');
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
		// Socket not initialized - skip silently
		return;
	}

	try {
		const startTime = Date.now();
		// Emit to image room (all users viewing this image)
		io.to(`image:${imageId}`).emit('image:stats_updated', update);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('image:stats_updated', latency);
		// Stats update emitted silently
	} catch (error) {
		socketMetrics.recordError('emit');
		logger.error('Failed to emit image stats update:', error);
	}
};

