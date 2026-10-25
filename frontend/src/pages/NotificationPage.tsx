import { DataLoading } from '@/components/user/DataLoading';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Bell,
    BellOff,
    Check,
    CheckCheck,
    Heart,
    MessageSquare,
    Settings,
    Sparkles,
    Trash2,
    Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { notificationService } from '@/services/notificationService';
import { getErrorMessage } from '@/lib/utils';
import type { Notification } from '@/types/notification';
import './NotificationPage.css';

type FilterTab = 'all' | 'unread';

/** Hiển thị thời gian kiểu "5 phút trước", "2 ngày trước" (vi-VN). */
function getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return 'vừa xong';
    if (diff < hour) return `${Math.floor(diff / minute)} phút trước`;
    if (diff < day) return `${Math.floor(diff / hour)} giờ trước`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

function NotificationPage() {
    useDocumentMeta({
        title: 'Thông báo',
        description: 'Cập nhật hoạt động, lời mời, lượt thích và các sự kiện tài khoản của bạn.',
        noIndex: false,
    });

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>('all');
    const [busyId, setBusyId] = useState<string | null>(null);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications]
    );

    const visible = useMemo(
        () => (filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications),
        [filter, notifications]
    );

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const res = await notificationService.getNotifications({ limit: 100 });
            setNotifications(res.notifications);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Không thể tải thông báo'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const markAsRead = async (notification: Notification) => {
        if (notification.isRead) return;
        setBusyId(notification._id);
        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        try {
            await notificationService.markAsRead(notification._id);
        } catch (error: unknown) {
            // Rollback
            setNotifications((prev) =>
                prev.map((n) => (n._id === notification._id ? { ...n, isRead: false } : n))
            );
            toast.error(getErrorMessage(error, 'Không thể đánh dấu đã đọc'));
        } finally {
            setBusyId(null);
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        const previous = notifications;
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            await notificationService.markAllAsRead();
            toast.success('Đã đánh dấu tất cả là đã đọc');
        } catch (error: unknown) {
            setNotifications(previous);
            toast.error(getErrorMessage(error, 'Không thể đánh dấu tất cả'));
        }
    };

    const remove = async (notification: Notification) => {
        setBusyId(notification._id);
        const previous = notifications;
        setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
        try {
            await notificationService.deleteNotification(notification._id);
        } catch (error: unknown) {
            setNotifications(previous);
            toast.error(getErrorMessage(error, 'Không thể xoá thông báo'));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="notification-page">
            <div className="notification-container">
                <header className="notification-header">
                    <div>
                        <p className="notification-eyebrow">HỘP THƯ CỦA BẠN</p>
                        <h1>Thông báo</h1>
                        <p className="notification-subtitle">
                            Mọi hoạt động liên quan đến ảnh, bộ sưu tập và tài khoản của bạn.
                        </p>
                    </div>
                    <div className="notification-header-actions">
                        <Link to="/settings/notifications" className="notification-icon-button" aria-label="Cài đặt thông báo">
                            <Settings size={16} />
                        </Link>
                        <button
                            type="button"
                            className="notification-mark-all"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            <CheckCheck size={16} /> Đánh dấu tất cả đã đọc
                        </button>
                    </div>
                </header>

                <div className="notification-toolbar" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filter === 'all'}
                        className={`notification-tab ${filter === 'all' ? 'is-active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Tất cả
                        <span className="notification-tab-count">{notifications.length}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filter === 'unread'}
                        className={`notification-tab ${filter === 'unread' ? 'is-active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Chưa đọc
                        <span className="notification-tab-count">{unreadCount}</span>
                    </button>
                </div>

                {loading && notifications.length > 0 && <DataLoading size="inline" message="Đang cập nhật thông báo" />}
                {loading && notifications.length === 0 ? (
                    <DataLoading message="Đang tải thông báo" />
                ) : visible.length === 0 ? (
                    <div className="notification-empty">
                        {filter === 'unread' ? <BellOff size={36} /> : <Bell size={36} />}
                        <h2>
                            {filter === 'unread' ? 'Bạn đã đọc hết rồi' : 'Chưa có thông báo nào'}
                        </h2>
                        <p>
                            {filter === 'unread'
                                ? 'Tất cả thông báo của bạn đã được đánh dấu đã đọc.'
                                : 'Khi có hoạt động mới (lời mời, lượt thích, bình luận…) bạn sẽ thấy ở đây.'}
                        </p>
                    </div>
                ) : (
                    <ul className="notification-list">
                        {visible.map((n) => (
                            <NotificationRow
                                key={n._id}
                                notification={n}
                                busy={busyId === n._id}
                                onRead={() => markAsRead(n)}
                                onRemove={() => remove(n)}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function NotificationRow({
    notification,
    busy,
    onRead,
    onRemove,
}: {
    notification: Notification;
    busy: boolean;
    onRead: () => void;
    onRemove: () => void;
}) {
    const iconInfo = pickIcon(notification.type);
    const Icon = iconInfo.Icon;
    const tone = iconInfo.tone;

    return (
        <li className={`notification-row ${notification.isRead ? 'is-read' : 'is-unread'}`}>
            <div className={`notification-icon notification-icon--${tone}`}>
                <Icon size={18} />
            </div>
            <div className="notification-body">
                <p className="notification-message">{formatMessage(notification)}</p>
                <span className="notification-time">
                    {getRelativeTime(new Date(notification.createdAt))}
                </span>
            </div>
            <div className="notification-actions">
                {!notification.isRead && (
                    <button
                        type="button"
                        className="notification-action"
                        onClick={onRead}
                        disabled={busy}
                        aria-label="Đánh dấu đã đọc"
                    >
                        <Check size={15} />
                    </button>
                )}
                <button
                    type="button"
                    className="notification-action notification-action--danger"
                    onClick={onRemove}
                    disabled={busy}
                    aria-label="Xoá thông báo"
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </li>
    );
}

function pickIcon(type: Notification['type']): { Icon: typeof Heart; tone: 'love' | 'share' | 'system' | 'account' | 'upload' } {
    if (type.startsWith('image_favorited') || type === 'collection_favorited') {
        return { Icon: Heart, tone: 'love' };
    }
    if (type.startsWith('collection_') || type === 'user_followed' || type === 'user_unfollowed') {
        return { Icon: Users, tone: 'share' };
    }
    if (type.startsWith('upload_') || type === 'bulk_upload_completed' || type === 'bulk_add_to_collection') {
        return { Icon: Sparkles, tone: 'upload' };
    }
    if (type.startsWith('account_') || type === 'password_changed' || type === 'email_changed' || type === 'two_factor_enabled' || type === 'login_new_device') {
        return { Icon: Bell, tone: 'account' };
    }
    if (type.startsWith('image_removed_admin') || type === 'user_banned_admin' || type === 'user_unbanned_admin' || type === 'image_reported' || type === 'collection_reported' || type === 'user_reported') {
        return { Icon: MessageSquare, tone: 'system' };
    }
    return { Icon: Bell, tone: 'system' };
}

function formatMessage(n: Notification): string {
    const actor = n.actor?.displayName || n.actor?.username || 'Ai đó';
    const coll = n.metadata?.collectionName || n.collection?.name || 'một bộ sưu tập';
    const imageTitle = n.image?.imageTitle || 'một ảnh';

    switch (n.type) {
        case 'image_favorited':
            return `${actor} đã thích ảnh ${imageTitle} của bạn.`;
        case 'image_downloaded':
            return `${actor} đã tải xuống ảnh ${imageTitle} của bạn.`;
        case 'collection_favorited':
            return `${actor} đã lưu bộ sưu tập ${coll} của bạn.`;
        case 'collection_invited':
            return `${actor} đã mời bạn cộng tác trong bộ sưu tập ${coll}.`;
        case 'collection_image_added':
            return `${actor} đã thêm ảnh vào bộ sưu tập ${coll}.`;
        case 'collection_image_removed':
            return `${actor} đã xoá ảnh khỏi bộ sưu tập ${coll}.`;
        case 'collection_permission_changed':
            return `${actor} đã thay đổi quyền của bạn trong bộ sưu tập ${coll}.`;
        case 'user_followed':
            return `${actor} đã theo dõi bạn.`;
        case 'upload_completed':
            return 'Ảnh của bạn đã được xử lý và đăng tải thành công.';
        case 'upload_failed':
            return 'Có lỗi xảy ra trong quá trình xử lý ảnh của bạn.';
        case 'system_announcement':
        case 'feature_update':
            return 'Có thông báo mới từ PhotoCloud.';
        case 'maintenance_scheduled':
            return 'Đã có lịch bảo trì hệ thống được thông báo.';
        case 'login_new_device':
            return 'Đã phát hiện đăng nhập từ thiết bị mới — nếu không phải bạn, hãy đổi mật khẩu.';
        case 'password_changed':
            return 'Mật khẩu của bạn vừa được thay đổi.';
        default:
            return `${actor} đã tương tác với nội dung của bạn.`;
    }
}

export default NotificationPage;
