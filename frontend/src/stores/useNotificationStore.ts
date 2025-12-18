import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { notificationService, type Notification } from '@/services/notificationService';

interface NotificationState {
	notifications: Notification[];
	unreadCount: number;
	loading: boolean;
	refreshing: boolean;
	hasLoaded: boolean;
	lastFetchedAt: number | null;
	pollingInterval: number | null;
	websocketConnected: boolean;
	
	// Actions
	fetchNotifications: (showLoading?: boolean) => Promise<void>;
	fetchUnreadCount: () => Promise<void>;
	markAsRead: (notificationId: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	deleteNotification: (notificationId: string) => Promise<void>;
	startPolling: () => void;
	stopPolling: () => void;
	setWebSocketConnected: (connected: boolean) => void;
	addNotification: (notification: Notification) => void;
	updateUnreadCount: (count: number) => void;
	clearNotifications: () => void;
}

// Global polling interval ref - only one instance should manage polling
let globalPollingInterval: number | null = null;
let pollingSubscribers = 0;
let isTabVisible = !document.hidden; // Track tab visibility

export const useNotificationStore = create(
	immer<NotificationState>((set, get) => ({
		notifications: [],
		unreadCount: 0,
		loading: true,
		refreshing: false,
		hasLoaded: false,
		lastFetchedAt: null,
		pollingInterval: null,
		websocketConnected: false,

		fetchNotifications: async (showLoading = false) => {
			const currentState = get();
			
			// Only show loading if we don't have data yet
			if (showLoading || (!currentState.hasLoaded && currentState.notifications.length === 0)) {
				set((state) => {
					if (showLoading) {
						state.refreshing = true;
					} else {
						state.loading = true;
					}
				});
			}

			try {
				const response = await notificationService.getNotifications({ limit: 20 });
				
				set((state) => {
					state.notifications = response.notifications;
					state.unreadCount = response.unreadCount;
					state.hasLoaded = true;
					state.lastFetchedAt = Date.now();
					state.loading = false;
					state.refreshing = false;
				});
			} catch (error) {
				console.error('Failed to fetch notifications:', error);
				set((state) => {
					state.loading = false;
					state.refreshing = false;
				});
			}
		},

		fetchUnreadCount: async () => {
			try {
				const count = await notificationService.getUnreadCount();
				const currentState = get();
				
				set((state) => {
					state.unreadCount = count;
					
					// If count increased, fetch full notifications
					if (count > currentState.unreadCount && currentState.hasLoaded) {
						// Trigger fetch in background
						get().fetchNotifications(false);
					}
				});
			} catch (error) {
				console.error('Failed to fetch unread count:', error);
			}
		},

		markAsRead: async (notificationId: string) => {
			try {
				const response = await notificationService.markAsRead(notificationId);
				
				set((state) => {
					state.unreadCount = response.unreadCount;
					state.notifications = state.notifications.map(notif =>
						notif._id === notificationId
							? { ...notif, isRead: true, readAt: new Date().toISOString() }
							: notif
					);
				});
			} catch (error) {
				console.error('Failed to mark notification as read:', error);
				throw error;
			}
		},

		markAllAsRead: async () => {
			try {
				await notificationService.markAllAsRead();
				
				set((state) => {
					state.unreadCount = 0;
					state.notifications = state.notifications.map(notif => ({
						...notif,
						isRead: true,
						readAt: new Date().toISOString()
					}));
				});
			} catch (error) {
				console.error('Failed to mark all as read:', error);
				throw error;
			}
		},

		deleteNotification: async (notificationId: string) => {
			try {
				const response = await notificationService.deleteNotification(notificationId);
				
				set((state) => {
					state.unreadCount = response.unreadCount;
					state.notifications = state.notifications.filter(notif => notif._id !== notificationId);
				});
			} catch (error) {
				console.error('Failed to delete notification:', error);
				throw error;
			}
		},

		startPolling: () => {
			// Only start polling if no interval exists
			if (globalPollingInterval !== null) {
				pollingSubscribers++;
				return;
			}

			pollingSubscribers++;
			
			// Set up visibility change listener
			const handleVisibilityChange = () => {
				isTabVisible = !document.hidden;
				// If tab becomes visible and we haven't polled recently, poll immediately
				if (isTabVisible) {
					get().fetchUnreadCount();
				}
			};
			
			document.addEventListener('visibilitychange', handleVisibilityChange);
			
			// Poll for unread count every 1.5 seconds for near-instant notifications
			// This matches the responsiveness of major social apps
			globalPollingInterval = window.setInterval(() => {
				// Only poll if tab is visible
				if (isTabVisible) {
					get().fetchUnreadCount();
				}
			}, 1500); // 1.5 seconds = near-instant feel

			set((state) => {
				state.pollingInterval = globalPollingInterval;
			});
			
			// Store cleanup function
			(window as any).__notificationPollingCleanup = () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			};
		},

		stopPolling: () => {
			pollingSubscribers--;
			
			// Only stop polling if no subscribers left
			if (pollingSubscribers <= 0 && globalPollingInterval !== null) {
				clearInterval(globalPollingInterval);
				globalPollingInterval = null;
				pollingSubscribers = 0;
				
				// Clean up visibility listener
				if ((window as any).__notificationPollingCleanup) {
					(window as any).__notificationPollingCleanup();
					delete (window as any).__notificationPollingCleanup;
				}
				
				set((state) => {
					state.pollingInterval = null;
				});
			}
		},

		setWebSocketConnected: (connected: boolean) => {
			set((state) => {
				state.websocketConnected = connected;
			});
		},

		addNotification: (notification: Notification) => {
			set((state) => {
				// Add notification to the beginning of the array
				state.notifications = [notification, ...state.notifications];
				// Update unread count
				state.unreadCount = state.unreadCount + 1;
			});
		},

		updateUnreadCount: (count: number) => {
			set((state) => {
				state.unreadCount = count;
			});
		},

		clearNotifications: () => {
			set((state) => {
				state.notifications = [];
				state.unreadCount = 0;
				state.hasLoaded = false;
				state.lastFetchedAt = null;
			});
		},
	}))
);

