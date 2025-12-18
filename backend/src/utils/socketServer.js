import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../libs/env.js';
import User from '../models/User.js';
import Collection from '../models/Collection.js';
import Image from '../models/Image.js';
import { enrichUserWithAdminStatus } from './adminUtils.js';
import { logger } from './logger.js';
import mongoose from 'mongoose';
import { socketMetrics } from './socketMetrics.js';

let io = null;

// Permission cache to reduce database queries
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if user has permission to join a collection room
 * @param {string} userId - User ID
 * @param {string} collectionId - Collection ID
 * @returns {Promise<boolean>} True if user has permission
 */
const canJoinCollectionRoom = async (userId, collectionId) => {
	const cacheKey = `collection:${userId}:${collectionId}`;
	const cached = permissionCache.get(cacheKey);
	
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.hasPermission;
	}
	
	try {
		if (!mongoose.Types.ObjectId.isValid(collectionId)) {
			return false;
		}
		
		const collection = await Collection.findOne({
			_id: collectionId,
			$or: [
				{ createdBy: new mongoose.Types.ObjectId(userId) }, // Owner
				{ isPublic: true }, // Public collection
				{ 'collaborators.user': new mongoose.Types.ObjectId(userId) }, // Collaborator
			],
		}).lean();
		
		const hasPermission = !!collection;
		
		// Cache the result
		permissionCache.set(cacheKey, {
			hasPermission,
			timestamp: Date.now()
		});
		
		return hasPermission;
	} catch (error) {
		logger.error(`Error checking collection room permission: ${error.message}`);
		return false;
	}
};

/**
 * Check if user has permission to join an image room
 * For now, all images are public, but we can add private image logic later
 * @param {string} userId - User ID
 * @param {string} imageId - Image ID
 * @returns {Promise<boolean>} True if user has permission
 */
const canJoinImageRoom = async (userId, imageId) => {
	const cacheKey = `image:${userId}:${imageId}`;
	const cached = permissionCache.get(cacheKey);
	
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.hasPermission;
	}
	
	try {
		if (!mongoose.Types.ObjectId.isValid(imageId)) {
			return false;
		}
		
		const image = await Image.findById(imageId).lean();
		const hasPermission = !!image; // All images are public for now
		
		// Cache the result
		permissionCache.set(cacheKey, {
			hasPermission,
			timestamp: Date.now()
		});
		
		return hasPermission;
	} catch (error) {
		logger.error(`Error checking image room permission: ${error.message}`);
		return false;
	}
};

/**
 * Check if user has permission to join a profile room
 * All profiles are public for now, but we can add private profile logic later
 * @param {string} userId - User ID requesting access
 * @param {string} targetUserId - Target user ID
 * @returns {Promise<boolean>} True if user has permission
 */
const canJoinProfileRoom = async (userId, targetUserId) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
			return false;
		}
		
		// Check if target user exists
		const targetUser = await User.findById(targetUserId).lean();
		return !!targetUser; // All profiles are public for now
	} catch (error) {
		logger.error(`Error checking profile room permission: ${error.message}`);
		return false;
	}
};

/**
 * Clear permission cache for a specific resource (called when permissions change)
 * @param {string} resourceType - 'collection', 'image', or 'profile'
 * @param {string} resourceId - Resource ID
 */
export const clearPermissionCache = (resourceType, resourceId) => {
	const keysToDelete = [];
	for (const key of permissionCache.keys()) {
		if (key.includes(`${resourceType}:`) && key.includes(`:${resourceId}`)) {
			keysToDelete.push(key);
		}
	}
	keysToDelete.forEach(key => permissionCache.delete(key));
};

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
		logger.info(`Socket connected: ${userId}`);

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
			logger.info(`User ${userId} joined collection room: ${collectionId}`);
				
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
				logger.info(`User ${userId} left collection room: ${collectionId}`);
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
			logger.info(`User ${userId} joined image room: ${imageId}`);
				
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
				logger.info(`User ${userId} left image room: ${imageId}`);
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
			logger.info(`User ${socket.userId} joined profile room: ${targetUserId}`);
				
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
				logger.info(`User ${socket.userId} left profile room: ${userId}`);
			}
		});

		// Handle disconnection
		socket.on('disconnect', (reason) => {
			logger.info(`Socket disconnected: ${userId}, reason: ${reason}`);
			// Record disconnection in metrics
			socketMetrics.recordDisconnection(socket.id);
		});

		// Handle errors
		socket.on('error', (error) => {
			logger.error(`Socket error for user ${userId}:`, error);
			socketMetrics.recordError('other');
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
		const startTime = Date.now();
		io.to(`user:${userId}`).emit('notification', notification);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('notification', latency);
		logger.info(`Notification emitted to user ${userId}:`, notification.type);
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
		logger.warn('Socket.io not initialized, collection update not sent via WebSocket');
		return;
	}

	try {
		const startTime = Date.now();
		// Emit to collection room (all users viewing this collection)
		io.to(`collection:${collectionId}`).emit('collection:updated', update);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('collection:updated', latency);
		logger.info(`Collection update emitted to collection ${collectionId}:`, update.type);
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
		logger.warn('Socket.io not initialized, image favorite update not sent via WebSocket');
		return;
	}

	try {
		const startTime = Date.now();
		// Emit to image room (all users viewing this image)
		io.to(`image:${imageId}`).emit('image:favorite_updated', update);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('image:favorite_updated', latency);
		logger.info(`Image favorite update emitted to image ${imageId}:`, update.action);
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
		logger.warn('Socket.io not initialized, user follow update not sent via WebSocket');
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
		logger.info(`User follow update emitted to profile ${userId}:`, update.action);
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
		logger.warn('Socket.io not initialized, image stats update not sent via WebSocket');
		return;
	}

	try {
		const startTime = Date.now();
		// Emit to image room (all users viewing this image)
		io.to(`image:${imageId}`).emit('image:stats_updated', update);
		const latency = Date.now() - startTime;
		socketMetrics.recordEvent('image:stats_updated', latency);
		logger.info(`Image stats update emitted to image ${imageId}:`, update.action);
	} catch (error) {
		socketMetrics.recordError('emit');
		logger.error('Failed to emit image stats update:', error);
	}
};

