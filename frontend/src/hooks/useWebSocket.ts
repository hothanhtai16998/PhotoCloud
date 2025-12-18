import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/services/authService';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

interface UseWebSocketOptions {
	onNotification?: (notification: any) => void;
	onUnreadCount?: (count: number) => void;
	onCollectionUpdate?: (update: {
		type: 'image_added' | 'image_removed' | 'images_reordered' | 'collection_updated';
		collectionId: string;
		imageId?: string;
		image?: any;
		imageIds?: string[];
		actorId?: string;
		imageCount?: number;
		coverImageId?: string | null;
		changes?: string[];
		name?: string;
		description?: string;
	}) => void;
	onImageFavoriteUpdate?: (update: {
		imageId: string;
		favoriteCount: number;
		actorId?: string;
		action: 'favorited' | 'unfavorited';
	}) => void;
	onUserFollowUpdate?: (update: {
		userId: string;
		followersCount?: number;
		followingCount?: number;
		actorId?: string;
		action: 'followed' | 'unfollowed';
	}) => void;
	onImageStatsUpdate?: (update: {
		imageId: string;
		views: number;
		downloads: number;
		dailyViews?: Record<string, number>;
		dailyDownloads?: Record<string, number>;
		action: 'view_incremented' | 'download_incremented';
	}) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onError?: (error: Error) => void;
}

// Global WebSocket instance - singleton pattern
let globalSocket: Socket | null = null;
let globalSubscribers = 0;
const eventHandlers = new Map<string, Set<Function>>();
const connectionStateCallbacks = new Set<() => void>();
let isRefreshingToken = false;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

/**
 * Custom hook for WebSocket connection with auto-reconnect
 * Handles authentication, reconnection, and event listeners
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
	const { accessToken, setAccessToken, clearAuth } = useAuthStore();
	const [isConnected, setIsConnected] = useState(globalSocket?.connected || false);
	const [reconnectAttempts, setReconnectAttempts] = useState(0);
	const optionsRef = useRef(options);
	const handlersRef = useRef<{
		onNotification?: (notification: any) => void;
		onUnreadCount?: (count: number) => void;
		onCollectionUpdate?: (update: any) => void;
		onImageFavoriteUpdate?: (update: any) => void;
		onUserFollowUpdate?: (update: any) => void;
		onImageStatsUpdate?: (update: any) => void;
		onConnect?: () => void;
		onDisconnect?: () => void;
		onError?: (error: Error) => void;
	}>({});

	// Keep handlers updated
	useEffect(() => {
		handlersRef.current = {
			onNotification: options.onNotification,
			onUnreadCount: options.onUnreadCount,
			onCollectionUpdate: options.onCollectionUpdate,
			onImageFavoriteUpdate: options.onImageFavoriteUpdate,
			onUserFollowUpdate: options.onUserFollowUpdate,
			onImageStatsUpdate: options.onImageStatsUpdate,
			onConnect: options.onConnect,
			onDisconnect: options.onDisconnect,
			onError: options.onError,
		};
	}, [options]);

	const connect = useCallback(() => {
		if (!accessToken) {
			logger.warn('Cannot connect WebSocket: no access token');
			return;
		}

		// If global socket exists (in any state), just subscribe
		if (globalSocket) {
			globalSubscribers++;
			// Update state if already connected
			if (globalSocket.connected) {
				setIsConnected(true);
			}
			return;
		}

		// Get API URL - use same logic as axios config
		// Socket.io connects to the base server URL (not /api)
		let apiUrl: string;
		if (import.meta.env.VITE_API_URL) {
			// Remove /api suffix if present (Socket.io doesn't use /api)
			apiUrl = import.meta.env.VITE_API_URL.trim().replace(/\/api\/?$/, '');
		} else if (import.meta.env.MODE === 'development') {
			// In development, frontend runs on 5173, backend on 3000
			apiUrl = 'http://localhost:3000';
		} else if (typeof window !== 'undefined') {
			// In production, use same origin
			apiUrl = window.location.origin;
		} else {
			apiUrl = 'http://localhost:3000';
		}

		logger.info(`Connecting to WebSocket at: ${apiUrl}`);

		// Create socket connection with authentication (singleton)
		const socket = io(apiUrl, {
			auth: {
				token: accessToken,
			},
			transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			reconnectionAttempts: Infinity,
			timeout: 20000,
		});

		// Store token in socket for comparison later
		(socket as any).auth = { token: accessToken };

		globalSocket = socket;
		globalSubscribers++;

		// Connection events (only set up once for singleton)
		if (!socket.hasListeners('connect')) {
			socket.on('connect', () => {
				// Update all component states
				connectionStateCallbacks.forEach(callback => callback());
				setReconnectAttempts(0);
				refreshAttempts = 0; // Reset refresh attempts on successful connection
				isRefreshingToken = false;
				logger.info('WebSocket connected');
				// Call all subscriber handlers
				eventHandlers.get('connect')?.forEach(handler => handler());
			});

			socket.on('disconnect', (reason) => {
				// Update all component states
				connectionStateCallbacks.forEach(callback => callback());
				// Only log disconnect if it's not a normal close or auth error
				if (reason !== 'io client disconnect' && !reason.includes('Authentication')) {
					logger.warn('WebSocket disconnected:', reason);
					// Show warning toast for unexpected disconnects
					if (reason !== 'io client disconnect') {
						toast.warning('Real-time updates disconnected', { duration: 3000 });
					}
				}
				// Call all subscriber handlers
				eventHandlers.get('disconnect')?.forEach(handler => handler());

				// If disconnected due to server error, attempt reconnection
				if (reason === 'io server disconnect' || reason === 'transport close') {
					setReconnectAttempts((prev) => prev + 1);
				}
			});

			socket.on('connect_error', async (error) => {
				const isAuthError = 
					error.message?.includes('Authentication') || 
					error.message?.includes('token') ||
					error.message?.includes('Token expired') ||
					error.message?.includes('Invalid token');

				if (isAuthError && !isRefreshingToken && refreshAttempts < MAX_REFRESH_ATTEMPTS) {
					logger.info('WebSocket auth error detected, attempting token refresh...');
					isRefreshingToken = true;
					refreshAttempts++;

					try {
						// Attempt to refresh token
						const newToken = await authService.refresh();
						setAccessToken(newToken);
						
						logger.info('Token refreshed, reconnecting WebSocket...');
						
						// Disconnect old socket
						if (globalSocket) {
							globalSocket.disconnect();
							globalSocket = null;
							globalSubscribers = 0;
							eventHandlers.clear();
						}
						
						// Wait a bit before reconnecting
						await new Promise(resolve => setTimeout(resolve, 500));
						
						// Reconnect with new token - trigger by updating accessToken
						// The useEffect will handle the actual reconnection
						refreshAttempts = 0; // Reset attempts
					} catch (refreshError) {
						logger.error('Failed to refresh token for WebSocket:', refreshError);
						refreshAttempts = MAX_REFRESH_ATTEMPTS; // Stop retrying
						
						// Clear auth state if refresh fails
						clearAuth();
						
						// Notify error handlers
						eventHandlers.get('error')?.forEach(handler => 
							handler(new Error('Authentication failed. Please sign in again.'))
						);
						
						toast.error('Connection failed. Please sign in again.', { duration: 5000 });
					} finally {
						isRefreshingToken = false;
					}
				} else if (!isAuthError) {
					// Non-auth errors
					logger.error('WebSocket connection error:', error.message || error);
					eventHandlers.get('error')?.forEach(handler => handler(error));
				} else if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
					// Auth error but max attempts reached
					logger.error('WebSocket auth error: Max refresh attempts reached');
					eventHandlers.get('error')?.forEach(handler => 
						handler(new Error('Authentication failed. Please sign in again.'))
					);
					toast.error('Connection failed. Please refresh the page.', { duration: 5000 });
				}
			});

			// Notification events (broadcast to all subscribers)
			socket.on('notification', (notification) => {
				logger.info('Received notification via WebSocket:', notification.type);
				eventHandlers.get('notification')?.forEach(handler => handler(notification));
			});

			socket.on('unread-count', (data: { unreadCount: number }) => {
				logger.info('Received unread count update:', data.unreadCount);
				eventHandlers.get('unread-count')?.forEach(handler => handler(data.unreadCount));
			});

			// Collection update events (broadcast to all subscribers)
			socket.on('collection:updated', (update) => {
				logger.info('Received collection update via WebSocket:', update.type);
				eventHandlers.get('collection:updated')?.forEach(handler => handler(update));
			});

			// Image favorite update events (broadcast to all subscribers)
			socket.on('image:favorite_updated', (update) => {
				logger.info('Received image favorite update via WebSocket:', update.imageId);
				eventHandlers.get('image:favorite_updated')?.forEach(handler => handler(update));
			});

			// User follow update events (broadcast to all subscribers)
			socket.on('user:follow_updated', (update) => {
				logger.info('Received user follow update via WebSocket:', update.userId);
				eventHandlers.get('user:follow_updated')?.forEach(handler => handler(update));
			});

			// Image stats update events (broadcast to all subscribers)
			socket.on('image:stats_updated', (update) => {
				logger.info('Received image stats update via WebSocket:', update.imageId);
				eventHandlers.get('image:stats_updated')?.forEach(handler => handler(update));
			});
		}

		// Register this component's handlers
		if (handlersRef.current.onConnect) {
			if (!eventHandlers.has('connect')) eventHandlers.set('connect', new Set());
			eventHandlers.get('connect')!.add(handlersRef.current.onConnect);
		}
		if (handlersRef.current.onDisconnect) {
			if (!eventHandlers.has('disconnect')) eventHandlers.set('disconnect', new Set());
			eventHandlers.get('disconnect')!.add(handlersRef.current.onDisconnect);
		}
		if (handlersRef.current.onError) {
			if (!eventHandlers.has('error')) eventHandlers.set('error', new Set());
			eventHandlers.get('error')!.add(handlersRef.current.onError);
		}
		if (handlersRef.current.onNotification) {
			if (!eventHandlers.has('notification')) eventHandlers.set('notification', new Set());
			eventHandlers.get('notification')!.add(handlersRef.current.onNotification);
		}
		if (handlersRef.current.onUnreadCount) {
			if (!eventHandlers.has('unread-count')) eventHandlers.set('unread-count', new Set());
			eventHandlers.get('unread-count')!.add(handlersRef.current.onUnreadCount);
		}
		if (handlersRef.current.onCollectionUpdate) {
			if (!eventHandlers.has('collection:updated')) eventHandlers.set('collection:updated', new Set());
			eventHandlers.get('collection:updated')!.add(handlersRef.current.onCollectionUpdate);
		}
		if (handlersRef.current.onImageFavoriteUpdate) {
			if (!eventHandlers.has('image:favorite_updated')) eventHandlers.set('image:favorite_updated', new Set());
			eventHandlers.get('image:favorite_updated')!.add(handlersRef.current.onImageFavoriteUpdate);
		}
		if (handlersRef.current.onUserFollowUpdate) {
			if (!eventHandlers.has('user:follow_updated')) eventHandlers.set('user:follow_updated', new Set());
			eventHandlers.get('user:follow_updated')!.add(handlersRef.current.onUserFollowUpdate);
		}
		if (handlersRef.current.onImageStatsUpdate) {
			if (!eventHandlers.has('image:stats_updated')) eventHandlers.set('image:stats_updated', new Set());
			eventHandlers.get('image:stats_updated')!.add(handlersRef.current.onImageStatsUpdate);
		}

		// Reconnection events (only set up once)
		if (!socket.io.hasListeners('reconnect_attempt')) {
			socket.io.on('reconnect_attempt', (attemptNumber) => {
				logger.info(`WebSocket reconnection attempt ${attemptNumber}`);
				setReconnectAttempts(attemptNumber);
			});

			socket.io.on('reconnect', (attemptNumber) => {
				logger.info(`WebSocket reconnected after ${attemptNumber} attempts`);
				setReconnectAttempts(0);
			});

			socket.io.on('reconnect_failed', () => {
				logger.error('WebSocket reconnection failed');
				eventHandlers.get('error')?.forEach(handler => handler(new Error('WebSocket reconnection failed')));
			});
		}
	}, [accessToken]);

	const disconnect = useCallback(() => {
		// Unregister handlers
		if (handlersRef.current.onConnect) {
			eventHandlers.get('connect')?.delete(handlersRef.current.onConnect);
		}
		if (handlersRef.current.onDisconnect) {
			eventHandlers.get('disconnect')?.delete(handlersRef.current.onDisconnect);
		}
		if (handlersRef.current.onError) {
			eventHandlers.get('error')?.delete(handlersRef.current.onError);
		}
		if (handlersRef.current.onNotification) {
			eventHandlers.get('notification')?.delete(handlersRef.current.onNotification);
		}
		if (handlersRef.current.onUnreadCount) {
			eventHandlers.get('unread-count')?.delete(handlersRef.current.onUnreadCount);
		}
		if (handlersRef.current.onCollectionUpdate) {
			eventHandlers.get('collection:updated')?.delete(handlersRef.current.onCollectionUpdate);
		}
		if (handlersRef.current.onImageFavoriteUpdate) {
			eventHandlers.get('image:favorite_updated')?.delete(handlersRef.current.onImageFavoriteUpdate);
		}
		if (handlersRef.current.onUserFollowUpdate) {
			eventHandlers.get('user:follow_updated')?.delete(handlersRef.current.onUserFollowUpdate);
		}
		if (handlersRef.current.onImageStatsUpdate) {
			eventHandlers.get('image:stats_updated')?.delete(handlersRef.current.onImageStatsUpdate);
		}

		globalSubscribers = Math.max(0, globalSubscribers - 1);
		
		// Only disconnect if no subscribers left AND socket exists
		// Use setTimeout to debounce - prevents race conditions during rapid mount/unmount
		if (globalSubscribers <= 0 && globalSocket) {
			setTimeout(() => {
				// Double-check no new subscribers joined
				if (globalSubscribers <= 0 && globalSocket) {
					globalSocket.disconnect();
					globalSocket = null;
					globalSubscribers = 0;
					eventHandlers.clear();
					// Update all component states
					connectionStateCallbacks.forEach(callback => callback());
				}
			}, 100); // Small delay to prevent race conditions
		}
	}, []);

	// Sync connection state with global socket
	useEffect(() => {
		const updateState = () => {
			setIsConnected(globalSocket?.connected || false);
		};
		
		connectionStateCallbacks.add(updateState);
		updateState(); // Initial state

		return () => {
			connectionStateCallbacks.delete(updateState);
		};
	}, []);

	// Connect when accessToken is available
	useEffect(() => {
		if (!accessToken) {
			disconnect();
			return;
		}

		// If token changed and socket exists, reconnect with new token
		if (globalSocket && (globalSocket as any).auth?.token !== accessToken) {
			logger.info('Access token changed, reconnecting WebSocket...');
			
			// Disconnect old connection
			if (globalSocket.connected) {
				globalSocket.disconnect();
			}
			globalSocket = null;
			globalSubscribers = 0;
			eventHandlers.clear();
			refreshAttempts = 0; // Reset refresh attempts
			isRefreshingToken = false;
			
			// Reconnect with new token
			setTimeout(() => {
				connect();
			}, 100);
		} else if (!globalSocket) {
			// Initial connection
			const timeoutId = setTimeout(() => {
				connect();
			}, 50);

			return () => {
				clearTimeout(timeoutId);
			};
		}
	}, [accessToken, connect, disconnect]);

	// Proactive token refresh before expiration
	useEffect(() => {
		if (!accessToken || !globalSocket?.connected) return;

		// Decode JWT to get expiration time
		const decodeToken = (token: string) => {
			try {
				const payload = JSON.parse(atob(token.split('.')[1]));
				return payload.exp * 1000; // Convert to milliseconds
			} catch {
				return null;
			}
		};

		const tokenExpiry = decodeToken(accessToken);
		if (!tokenExpiry) return;

		const now = Date.now();
		const timeUntilExpiry = tokenExpiry - now;
		const refreshThreshold = 5 * 60 * 1000; // Refresh 5 minutes before expiry

		const checkAndRefresh = () => {
			const currentExpiry = decodeToken(accessToken);
			if (!currentExpiry) return;
			
			const timeLeft = currentExpiry - Date.now();
			if (timeLeft < refreshThreshold && timeLeft > 0) {
				logger.info('Token expiring soon, refreshing proactively...');
				
				authService.refresh()
					.then(newToken => {
						setAccessToken(newToken);
						logger.info('Token refreshed proactively');
					})
					.catch(error => {
						logger.error('Proactive token refresh failed:', error);
					});
			}
		};

		// Check immediately
		checkAndRefresh();

		// Check every minute
		const interval = setInterval(checkAndRefresh, 60 * 1000);

		return () => clearInterval(interval);
	}, [accessToken, setAccessToken, globalSocket?.connected]);

	// Collection room management
	const joinCollectionRoom = useCallback((collectionId: string) => {
		if (globalSocket?.connected && collectionId) {
			globalSocket.emit('collection:join', collectionId);
			logger.info(`Joined collection room: ${collectionId}`);
		}
	}, []);

	const leaveCollectionRoom = useCallback((collectionId: string) => {
		if (globalSocket?.connected && collectionId) {
			globalSocket.emit('collection:leave', collectionId);
			logger.info(`Left collection room: ${collectionId}`);
		}
	}, []);

	// Image room management
	const joinImageRoom = useCallback((imageId: string) => {
		if (globalSocket?.connected && imageId) {
			globalSocket.emit('image:join', imageId);
			logger.info(`Joined image room: ${imageId}`);
		}
	}, []);

	const leaveImageRoom = useCallback((imageId: string) => {
		if (globalSocket?.connected && imageId) {
			globalSocket.emit('image:leave', imageId);
			logger.info(`Left image room: ${imageId}`);
		}
	}, []);

	// Profile room management
	const joinProfileRoom = useCallback((userId: string) => {
		if (globalSocket?.connected && userId) {
			globalSocket.emit('profile:join', userId);
			logger.info(`Joined profile room: ${userId}`);
		}
	}, []);

	const leaveProfileRoom = useCallback((userId: string) => {
		if (globalSocket?.connected && userId) {
			globalSocket.emit('profile:leave', userId);
			logger.info(`Left profile room: ${userId}`);
		}
	}, []);

	return {
		isConnected,
		reconnectAttempts,
		connect,
		disconnect,
		joinCollectionRoom,
		leaveCollectionRoom,
		joinImageRoom,
		leaveImageRoom,
		joinProfileRoom,
		leaveProfileRoom,
	};
};

