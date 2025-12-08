import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Users, Image as ImageIcon, Shield, Folder, RefreshCw, Heart, Download, Share2, Upload, CheckCircle, XCircle, Loader2, Star, AlertTriangle, Ban, User, Eye, Key, Mail, Smartphone, LogIn, Megaphone, Wrench, FileText, Sparkles, Flag, UserPlus, UserMinus } from 'lucide-react';
import { notificationService, type Notification } from '@/services/notificationService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { t, getLocale } from '@/i18n';
import './NotificationBell.css';

export default function NotificationBell() {
	const { accessToken } = useAuthStore();
	const { user } = useUserStore();
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [hasNewNotification, setHasNewNotification] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const bellButtonRef = useRef<HTMLButtonElement>(null);
	const pollingIntervalRef = useRef<number | null>(null);
	const previousUnreadCountRef = useRef(0);

	// Get notification message helper
	const getNotificationMessage = useCallback((notification: Notification): string => {
		const actorName = notification.actor?.displayName || notification.actor?.username || t('notifications.someone');
		const collectionName = notification.collection?.name || t('notifications.collection');
		const imageTitle = notification.image?.imageTitle || t('notifications.yourPhoto');

		switch (notification.type) {
			case 'collection_invited': {
				const permission = notification.metadata?.permission;
				const permissionText =
					permission === 'admin'
						? t('notifications.permissionAdmin')
						: permission === 'edit'
						? t('notifications.permissionEdit')
						: t('notifications.permissionView');
				return t('notifications.collectionInvited', { actor: actorName, collection: collectionName, permission: permissionText });
			}
			case 'collection_image_added':
				return t('notifications.collectionImageAdded', { actor: actorName, collection: collectionName });
			case 'collection_image_removed':
				return t('notifications.collectionImageRemoved', { actor: actorName, collection: collectionName });
			case 'collection_permission_changed':
				return t('notifications.collectionPermissionChanged', { actor: actorName, collection: collectionName });
			case 'collection_removed':
				return t('notifications.collectionRemoved', { collection: collectionName });
			case 'image_favorited':
				return t('notifications.imageFavorited', { actor: actorName, image: imageTitle });
			case 'image_downloaded':
				return t('notifications.imageDownloaded', { actor: actorName, image: imageTitle });
			case 'collection_favorited':
				return t('notifications.collectionFavorited', { actor: actorName, collection: collectionName });
			case 'collection_shared':
				return t('notifications.collectionShared', { actor: actorName, collection: collectionName });
			case 'upload_completed':
				return t('notifications.uploadCompleted', { image: String(notification.image?.imageTitle || notification.metadata?.imageTitle || t('notifications.yourPhoto')) });
			case 'upload_failed':
				return t('notifications.uploadFailed', { image: String(notification.metadata?.imageTitle || t('notifications.yourPhoto')), error: String(notification.metadata?.error || t('notifications.unknownError')) });
			case 'upload_processing':
				return t('notifications.uploadProcessing');
			case 'bulk_upload_completed': {
				const successCount = notification.metadata?.successCount || 0;
				const totalCount = notification.metadata?.totalCount || 0;
				const failedCount = notification.metadata?.failedCount || 0;
				if (failedCount === 0) {
					return t('notifications.bulkUploadCompleted', { success: successCount, total: totalCount });
				} else {
					return t('notifications.bulkUploadWithFailed', { success: successCount, total: totalCount, failed: failedCount });
				}
			}
			case 'collection_updated': {
				const changes = (notification.metadata?.changes as string[]) || [];
				const changeText = changes.length > 0 ? changes.join(', ') : t('notifications.info');
				return t('notifications.collectionUpdated', { actor: actorName, changes: changeText, collection: collectionName });
			}
			case 'collection_cover_changed':
				return t('notifications.collectionCoverChanged', { actor: actorName, collection: collectionName });
			case 'collection_reordered': {
				const imageCount = notification.metadata?.imageCount || 0;
				return t('notifications.collectionReordered', { actor: actorName, count: imageCount, collection: collectionName });
			}
			case 'bulk_delete_completed': {
				const deletedCount = notification.metadata?.deletedCount || 0;
				return t('notifications.bulkDeleteCompleted', { count: deletedCount });
			}
			case 'bulk_add_to_collection': {
				const addedCount = notification.metadata?.addedCount || 0;
				return t('notifications.bulkAddToCollection', { count: addedCount, collection: collectionName });
			}
			case 'image_featured':
				return t('notifications.imageFeatured', { image: imageTitle });
			case 'image_removed':
			case 'image_removed_admin': {
				const reason = notification.metadata?.reason || t('notifications.unknownReason');
				return t('notifications.imageRemovedAdmin', { image: imageTitle, reason });
			}
			case 'account_verified':
				return t('notifications.accountVerified');
			case 'account_warning': {
				const warningReason = notification.metadata?.reason || t('notifications.unknownReason');
				return t('notifications.accountWarning', { reason: warningReason });
			}
			case 'account_banned':
			case 'user_banned_admin': {
				const banReason = notification.metadata?.reason || t('notifications.unknownReason');
				const bannedBy = notification.metadata?.bannedBy || t('notifications.unknownAdmin');
				return t('notifications.accountBanned', { admin: bannedBy, reason: banReason });
			}
			case 'user_unbanned_admin': {
				const unbannedBy = notification.metadata?.unbannedBy || t('notifications.unknownAdmin');
				return t('notifications.accountUnbanned', { admin: unbannedBy });
			}
			case 'profile_viewed':
				return t('notifications.profileViewed', { actor: actorName });
			case 'profile_updated': {
				const changedFields = (notification.metadata?.changedFields as string[]) || [];
				if (changedFields.length === 0) {
					return t('notifications.profileUpdatedSimple');
				}
				
				// Map field names to translated names
				const fieldNameKeys: Record<string, string> = {
					displayName: 'notifications.fieldDisplayName',
					firstName: 'notifications.fieldFirstName',
					lastName: 'notifications.fieldLastName',
					email: 'notifications.fieldEmail',
					bio: 'notifications.fieldBio',
					location: 'notifications.fieldLocation',
					phone: 'notifications.fieldPhone',
					website: 'notifications.fieldWebsite',
					instagram: 'notifications.fieldInstagram',
					twitter: 'notifications.fieldTwitter',
					facebook: 'notifications.fieldFacebook',
				};
				
				const translatedFields = changedFields.map(field => fieldNameKeys[field] ? t(fieldNameKeys[field]) : field);
				const fieldsText = translatedFields.join(', ');
				return t('notifications.profileUpdated', { fields: fieldsText });
			}
			case 'login_new_device': {
				const deviceUserAgent = (notification.metadata?.userAgent as string) || t('notifications.newDevice');
				const deviceIpAddress = (notification.metadata?.ipAddress as string) || t('notifications.unknownIP');
				// Extract browser name from user agent
				const browserName = deviceUserAgent.includes('Chrome') ? 'Chrome' :
					deviceUserAgent.includes('Firefox') ? 'Firefox' :
					deviceUserAgent.includes('Safari') ? 'Safari' :
					deviceUserAgent.includes('Edge') ? 'Edge' :
					t('notifications.newDevice');
				return t('notifications.loginNewDevice', { browser: browserName, ip: deviceIpAddress });
			}
			case 'password_changed': {
				const changeIp = notification.metadata?.ipAddress || t('notifications.unknownIP');
				return t('notifications.passwordChanged', { ip: changeIp });
			}
			case 'email_changed': {
				const oldEmail = String(notification.metadata?.oldEmail || 'old@email.com');
				const newEmail = String(notification.metadata?.newEmail || 'new@email.com');
				return t('notifications.emailChanged', { oldEmail, newEmail });
			}
			case 'two_factor_enabled':
				return t('notifications.twoFactorEnabled');
			case 'system_announcement': {
				const announcementTitle = String(notification.metadata?.title || t('notifications.title'));
				return t('notifications.systemAnnouncement', { title: announcementTitle, message: String(notification.metadata?.message || t('notifications.newNotification')) });
			}
			case 'feature_update': {
				const featureTitle = String(notification.metadata?.title || t('notifications.title'));
				return t('notifications.featureUpdate', { title: featureTitle, message: String(notification.metadata?.message || t('notifications.newNotification')) });
			}
			case 'maintenance_scheduled': {
				const maintenanceTitle = String(notification.metadata?.title || t('notifications.title'));
				return t('notifications.maintenanceScheduled', { title: maintenanceTitle, message: String(notification.metadata?.message || t('notifications.newNotification')) });
			}
			case 'terms_updated': {
				const termsTitle = String(notification.metadata?.title || t('notifications.title'));
				return t('notifications.termsUpdated', { title: termsTitle, message: String(notification.metadata?.message || t('notifications.newNotification')) });
			}
			case 'image_reported': {
				const imageReportReason = notification.metadata?.reason || t('notifications.unknownReason');
				const imageReportDescription = notification.metadata?.description ? ` - ${notification.metadata.description}` : '';
				return t('notifications.imageReported', { image: imageTitle, reason: imageReportReason + imageReportDescription });
			}
			case 'collection_reported': {
				const collectionReportReason = notification.metadata?.reason || t('notifications.unknownReason');
				const collectionReportDescription = notification.metadata?.description ? ` - ${notification.metadata.description}` : '';
				return t('notifications.collectionReported', { collection: collectionName, reason: collectionReportReason + collectionReportDescription });
			}
			case 'user_reported': {
				const userReportReason = notification.metadata?.reason || t('notifications.unknownReason');
				const userReportDescription = notification.metadata?.description ? ` - ${notification.metadata.description}` : '';
				return t('notifications.userReported', { reason: userReportReason + userReportDescription });
			}
			case 'user_followed':
				return t('notifications.userFollowed', { actor: actorName });
			case 'user_unfollowed':
				return t('notifications.userUnfollowed', { actor: actorName });
			default:
				return t('notifications.newNotification');
		}
	}, []);


	// Fetch notifications
	const fetchNotifications = useCallback(async (showLoading = false) => {
		if (!accessToken || !user) return;

		if (showLoading) {
			setRefreshing(true);
		}

		try {
			const response = await notificationService.getNotifications({ limit: 20 });
			const newNotifications = response.notifications;
			const newUnreadCount = response.unreadCount;

			// Check for new notifications and trigger visual feedback
			if (previousUnreadCountRef.current > 0 && newUnreadCount > previousUnreadCountRef.current) {
				// New notification arrived - trigger bell animation
				setHasNewNotification(true);
				setTimeout(() => setHasNewNotification(false), 500);
			} else if (previousUnreadCountRef.current === 0 && newUnreadCount > 0) {
				// First notification after having none - trigger bell animation
				setHasNewNotification(true);
				setTimeout(() => setHasNewNotification(false), 500);
			}

			setNotifications(newNotifications);
			setUnreadCount(newUnreadCount);
			previousUnreadCountRef.current = newUnreadCount;
		} catch (error) {
			console.error('Failed to fetch notifications:', error);
		} finally {
			if (showLoading) {
				setRefreshing(false);
			}
			setLoading(false);
		}
	}, [accessToken, user]);

	// Poll for unread count - Option 3: Faster polling (5 seconds)
	useEffect(() => {
		if (!accessToken || !user) return;

		// Initial fetch
		fetchNotifications();

		// Poll for updates - Option 3: Faster polling (5 seconds)
		pollingIntervalRef.current = window.setInterval(() => {
			notificationService.getUnreadCount()
				.then(count => {
					// If count increased, fetch full notifications
					if (count > unreadCount) {
						fetchNotifications();
					} else {
						setUnreadCount(count);
					}
				})
				.catch(err => console.error('Failed to fetch unread count:', err));
		}, 5000); // Poll every 5 seconds (Option 3: Faster polling)

		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
			}
		};
	}, [accessToken, user, fetchNotifications, unreadCount]);

	// Listen for manual refresh triggers (Option 3: Optimistic update)
	useEffect(() => {
		const handleRefresh = () => {
			fetchNotifications();
		};

		window.addEventListener('notification:refresh', handleRefresh);
		return () => {
			window.removeEventListener('notification:refresh', handleRefresh);
		};
	}, [fetchNotifications]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
		return undefined;
	}, [isOpen]);

	// Fetch notifications when dropdown opens
	useEffect(() => {
		if (isOpen && accessToken) {
			fetchNotifications();
		}
	}, [isOpen, accessToken, fetchNotifications]);

	const handleMarkAsRead = async (notificationId: string) => {
		try {
			const response = await notificationService.markAsRead(notificationId);
			setUnreadCount(response.unreadCount);
			setNotifications(prev =>
				prev.map(notif =>
					notif._id === notificationId
						? { ...notif, isRead: true, readAt: new Date().toISOString() }
						: notif
				)
			);
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
			toast.error(t('notifications.markReadFailed'));
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			await notificationService.markAllAsRead();
			setUnreadCount(0);
			setNotifications(prev =>
				prev.map(notif => ({ ...notif, isRead: true, readAt: new Date().toISOString() }))
			);
			toast.success(t('notifications.markAllReadSuccess'));
		} catch (error) {
			console.error('Failed to mark all as read:', error);
			toast.error(t('notifications.markAllReadFailed'));
		}
	};

	const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			const response = await notificationService.deleteNotification(notificationId);
			setUnreadCount(response.unreadCount);
			setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
		} catch (error) {
			console.error('Failed to delete notification:', error);
			toast.error(t('notifications.deleteFailed'));
		}
	};

	const handleNotificationClick = (notification: Notification) => {
		if (!notification.isRead) {
			handleMarkAsRead(notification._id);
		}

		setIsOpen(false);

		// Navigate based on notification type
		if (notification.image?._id) {
			// For image-related notifications, navigate to the image
			const imageTitle = notification.image.imageTitle || '';
			const imageSlug = imageTitle 
				? `${imageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${notification.image._id.slice(-12)}`
				: notification.image._id.slice(-12);
			navigate(`/?image=${imageSlug}`);
		} else if (notification.collection?._id) {
			// For collection-related notifications, navigate to the collection
			navigate(`/collections/${notification.collection._id}`);
		} else if (notification.type === 'user_followed' || notification.type === 'user_unfollowed') {
			// For follow notifications, navigate to the actor's profile (if we add profile viewing)
			// For now, just close the notification
		}
	};

	const getNotificationIcon = (type: Notification['type']) => {
		switch (type) {
			case 'collection_invited':
				return <Users size={16} />;
			case 'collection_image_added':
			case 'collection_image_removed':
				return <ImageIcon size={16} />;
			case 'collection_permission_changed':
				return <Shield size={16} />;
			case 'collection_removed':
				return <Folder size={16} />;
			case 'image_favorited':
			case 'collection_favorited':
				return <Heart size={16} />;
			case 'image_downloaded':
				return <Download size={16} />;
			case 'collection_shared':
				return <Share2 size={16} />;
			case 'upload_completed':
				return <CheckCircle size={16} />;
			case 'upload_failed':
				return <XCircle size={16} />;
			case 'upload_processing':
				return <Loader2 size={16} className="spinning" />;
			case 'bulk_upload_completed':
				return <Upload size={16} />;
			case 'collection_updated':
			case 'collection_cover_changed':
				return <Folder size={16} />;
			case 'collection_reordered':
				return <RefreshCw size={16} />;
			case 'bulk_delete_completed':
				return <Trash2 size={16} />;
			case 'bulk_add_to_collection':
				return <ImageIcon size={16} />;
			case 'image_featured':
				return <Star size={16} />;
			case 'image_removed':
				return <Trash2 size={16} />;
			case 'account_verified':
				return <CheckCircle size={16} />;
			case 'account_warning':
				return <AlertTriangle size={16} />;
			case 'account_banned':
			case 'user_banned_admin':
				return <Ban size={16} />;
			case 'user_unbanned_admin':
				return <CheckCircle size={16} />;
			case 'image_removed_admin':
				return <Trash2 size={16} />;
			case 'profile_viewed':
				return <Eye size={16} />;
			case 'profile_updated':
				return <User size={16} />;
			case 'login_new_device':
				return <LogIn size={16} />;
			case 'password_changed':
				return <Key size={16} />;
			case 'email_changed':
				return <Mail size={16} />;
			case 'two_factor_enabled':
				return <Smartphone size={16} />;
			case 'system_announcement':
				return <Megaphone size={16} />;
			case 'feature_update':
				return <Sparkles size={16} />;
			case 'maintenance_scheduled':
				return <Wrench size={16} />;
			case 'terms_updated':
				return <FileText size={16} />;
			case 'image_reported':
			case 'collection_reported':
			case 'user_reported':
				return <Flag size={16} />;
			case 'user_followed':
				return <UserPlus size={16} />;
			case 'user_unfollowed':
				return <UserMinus size={16} />;
			default:
				return <Bell size={16} />;
		}
	};

	// Manual refresh handler
	const handleManualRefresh = useCallback(async () => {
		await fetchNotifications(true);
		toast.success(t('notifications.refreshed'));
	}, [fetchNotifications]);

	if (!accessToken || !user) return null;

	return (
		<div className="notification-bell-wrapper" ref={dropdownRef}>
			<button
				ref={bellButtonRef}
				className={`notification-bell-btn ${hasNewNotification ? 'new-notification' : ''}`}
				onClick={() => setIsOpen(!isOpen)}
				aria-label={t('notifications.title')}
				title={t('notifications.title')}
			>
				<Bell size={20} />
				{unreadCount > 0 && (
					<span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
				)}
			</button>

			{isOpen && (
				<div className="notification-dropdown">
					<div className="notification-dropdown-header">
						<h3>{t('notifications.title')}</h3>
						<div className="notification-dropdown-actions">
							<button
								className={`notification-action-btn ${refreshing ? 'refreshing' : ''}`}
								onClick={handleManualRefresh}
								title={t('notifications.refresh')}
								disabled={refreshing}
							>
								<RefreshCw size={16} />
							</button>
							{unreadCount > 0 && (
								<button
									className="notification-action-btn"
									onClick={handleMarkAllAsRead}
									title={t('notifications.markAllRead')}
								>
									<CheckCheck size={16} />
								</button>
							)}
							<button
								className="notification-action-btn"
								onClick={() => setIsOpen(false)}
								title={t('common.close')}
							>
								<X size={16} />
							</button>
						</div>
					</div>

					<div className="notification-dropdown-content">
						{loading ? (
							<div className="notification-loading">
								<p>{t('common.loading')}</p>
							</div>
						) : notifications.length === 0 ? (
							<div className="notification-empty">
								<Bell size={32} />
								<p>{t('notifications.empty')}</p>
							</div>
						) : (
							<div className="notification-list">
								{notifications.map(notification => (
									<div
										key={notification._id}
										className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
										onClick={() => handleNotificationClick(notification)}
									>
										<div className="notification-item-icon">
											{getNotificationIcon(notification.type)}
										</div>
										<div className="notification-item-content">
											<p className="notification-item-message">
												{getNotificationMessage(notification)}
											</p>
											<span className="notification-item-time">
												{formatNotificationTime(notification.createdAt)}
											</span>
										</div>
										<div className="notification-item-actions">
											{!notification.isRead && (
												<button
													className="notification-item-action-btn"
													onClick={(e) => {
														e.stopPropagation();
														handleMarkAsRead(notification._id);
													}}
													title={t('notifications.markRead')}
												>
													<Check size={14} />
												</button>
											)}
											<button
												className="notification-item-action-btn"
												onClick={(e) => handleDelete(notification._id, e)}
												title={t('notifications.delete')}
											>
												<Trash2 size={14} />
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function formatNotificationTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return t('notifications.justNow');
	if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
	if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
	if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });

	// Format as date based on locale
	const locale = getLocale();
	return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
		day: 'numeric',
		month: 'short',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
	});
}

