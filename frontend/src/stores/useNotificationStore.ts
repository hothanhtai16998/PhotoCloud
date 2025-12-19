import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { notificationService, type Notification } from '@/services/notificationService';

// Simple logger for polling (avoid circular dependency)
const logPolling = (message: string) => {
	if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
		console.log(`[Notification Polling] ${message}`);
	}
};

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
			// Don't start polling if WebSocket is connected
			const currentState = get();
			if (currentState.websocketConnected) {
				return;
			}

			// Only start polling if no interval exists
			if (globalPollingInterval !== null) {
				pollingSubscribers++;
				return;
			}

			pollingSubscribers++;
			
			// Smart polling with exponential backoff
			let pollAttempts = 0;
			let currentInterval = 10000; // Start at 10 seconds (optimized from 1.5s)
			const maxAttempts = 5; // Stop after 5 attempts
			const maxInterval = 30000; // Max 30 seconds
			let lastPollTime = 0;
			const minPollGap = 5000; // Minimum 5 seconds between polls
			
			// Set up visibility change listener
			const handleVisibilityChange = () => {
				const wasHidden = !isTabVisible;
				isTabVisible = !document.hidden;
				
				// If tab becomes visible after being hidden > 30 seconds, poll immediately
				if (isTabVisible && wasHidden && !get().websocketConnected) {
					const timeHidden = Date.now() - (lastPollTime || Date.now());
					if (timeHidden > 30000) {
						get().fetchUnreadCount();
						lastPollTime = Date.now();
						pollAttempts = 0; // Reset attempts on manual poll
						currentInterval = 10000; // Reset interval
					}
				}
			};
			
			document.addEventListener('visibilitychange', handleVisibilityChange);
			
			// Smart polling with exponential backoff
			const poll = () => {
				const state = get();
				
				// Stop if WebSocket connected
				if (state.websocketConnected) {
					get().stopPolling();
					return;
				}
				
				// Stop after max attempts
				if (pollAttempts >= maxAttempts) {
					logPolling('Stopped after max attempts, WebSocket likely unavailable');
					get().stopPolling();
					return;
				}
				
				// Only poll if tab is visible
				if (!isTabVisible) {
					return;
				}
				
				// Check minimum gap between polls
				const timeSinceLastPoll = Date.now() - lastPollTime;
				if (timeSinceLastPoll < minPollGap) {
					return;
				}
				
				// Perform poll
				state.fetchUnreadCount();
				lastPollTime = Date.now();
				pollAttempts++;
				
				// Exponential backoff: 10s → 15s → 22s → 30s (max)
				if (pollAttempts > 1) {
					currentInterval = Math.min(currentInterval * 1.5, maxInterval);
					// Restart interval with new delay
					clearInterval(globalPollingInterval!);
					globalPollingInterval = window.setInterval(poll, currentInterval);
				}
			};
			
			// Poll immediately on start, then use interval
			poll();
			globalPollingInterval = window.setInterval(poll, currentInterval);

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
				// Stop polling when WebSocket connects
				if (connected && globalPollingInterval !== null) {
					get().stopPolling();
				}
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

