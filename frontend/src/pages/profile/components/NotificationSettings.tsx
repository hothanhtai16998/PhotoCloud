import { memo, useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, Check, Loader2 } from 'lucide-react';
import { userService, type NotificationPreferences, type NotificationChannel } from '@/services/userService';
import { toast } from 'sonner';
import { DataLoading } from '@/components/user/DataLoading';
import { Button } from '@/components/ui/button';
import './NotificationSettings.css';

interface CategoryConfig {
    key: keyof NotificationChannel;
    label: string;
    description: string;
}

const EMAIL_CATEGORIES: CategoryConfig[] = [
    { key: 'comments', label: 'Bình luận', description: 'Khi có người bình luận ảnh của bạn.' },
    { key: 'likes', label: 'Yêu thích', description: 'Khi có người thích ảnh của bạn.' },
    { key: 'follows', label: 'Theo dõi', description: 'Khi có người theo dõi bạn.' },
    { key: 'bookings', label: 'Đặt lịch', description: 'Xác nhận và cập nhật đặt lịch chụp.' },
    { key: 'newsletters', label: 'Bản tin studio', description: 'Mẹo chụp ảnh và tin từ PhotoCloud.' },
];

const PUSH_CATEGORIES: CategoryConfig[] = [
    { key: 'comments', label: 'Bình luận', description: 'Hiện trên trình duyệt khi bạn không mở tab.' },
    { key: 'likes', label: 'Yêu thích', description: 'Thông báo đẩy khi có lượt thích mới.' },
    { key: 'follows', label: 'Theo dõi', description: 'Khi có người theo dõi bạn.' },
    { key: 'bookings', label: 'Đặt lịch', description: 'Nhắc nhở lịch chụp sắp tới.' },
];

const DEFAULT_PREFS: NotificationPreferences = {
    email: { comments: true, likes: true, follows: true, bookings: true, newsletters: false },
    push: { comments: true, likes: true, follows: false, bookings: true },
};

/**
 * Notification preferences for the current user.
 * Two channels (email, push) × N categories. State stays local until
 * the user clicks Save; this prevents accidental opt-out.
 */
export default memo(function NotificationSettings() {
    const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
    const [draft, setDraft] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const res = await userService.getNotificationPreferences();
                if (cancelled) return;
                const merged: NotificationPreferences = {
                    email: { ...DEFAULT_PREFS.email, ...(res.preferences?.email ?? {}) },
                    push: { ...DEFAULT_PREFS.push, ...(res.preferences?.push ?? {}) },
                };
                setPrefs(merged);
                setDraft(merged);
            } catch (err) {
                if (cancelled) return;
                // Fall back to defaults so the UI is still usable.
                setPrefs(DEFAULT_PREFS);
                setDraft(DEFAULT_PREFS);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => { cancelled = true; };
    }, []);

    const isDirty = JSON.stringify(prefs) !== JSON.stringify(draft);

    const handleToggle = (channel: 'email' | 'push', key: keyof NotificationChannel) => {
        if (!draft) return;
        setDraft({
            ...draft,
            [channel]: { ...draft[channel], [key]: !draft[channel][key] },
        });
    };

    const handleSave = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            // Send only the differences so the backend doesn't reset missing keys
            const res = await userService.updateNotificationPreferences(draft);
            setPrefs(res.preferences);
            setDraft(res.preferences);
            toast.success('Đã lưu cài đặt thông báo');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể lưu cài đặt.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (prefs) setDraft(prefs);
    };

    if (loading) {
        return (
            <div className="notification-settings">
                <DataLoading message="Đang tải cài đặt thông báo" size="compact" />
            </div>
        );
    }

    if (!draft) return null;

    return (
        <div className="notification-settings">
            <div className="notification-settings-header">
                <div>
                    <h2 className="notification-settings-title">
                        <Bell size={20} aria-hidden="true" />
                        Cài đặt thông báo
                    </h2>
                    <p className="notification-settings-subtitle">
                        Chọn những thông báo bạn muốn nhận qua email và trình duyệt.
                    </p>
                </div>
                <div className="notification-settings-actions">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={!isDirty || saving}
                    >
                        Hủy
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                    >
                        {saving ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                        {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </Button>
                </div>
            </div>

            {/* Email section */}
            <section className="notification-channel" aria-labelledby="email-heading">
                <header className="notification-channel-header">
                    <Mail size={20} aria-hidden="true" />
                    <h3 id="email-heading">Email</h3>
                </header>
                <div className="notification-categories">
                    {EMAIL_CATEGORIES.map((cat) => (
                        <label key={cat.key} className="notification-row">
                            <div className="notification-row-info">
                                <span className="notification-row-label">{cat.label}</span>
                                <span className="notification-row-desc">{cat.description}</span>
                            </div>
                            <span className="notification-switch">
                                <input
                                    type="checkbox"
                                    checked={!!draft.email[cat.key]}
                                    onChange={() => handleToggle('email', cat.key)}
                                    disabled={saving}
                                    aria-label={`Bật email ${cat.label}`}
                                />
                                <span className="notification-switch-slider" />
                            </span>
                        </label>
                    ))}
                </div>
            </section>

            {/* Push section */}
            <section className="notification-channel" aria-labelledby="push-heading">
                <header className="notification-channel-header">
                    <Smartphone size={20} aria-hidden="true" />
                    <h3 id="push-heading">Thông báo đẩy</h3>
                </header>
                <div className="notification-categories">
                    {PUSH_CATEGORIES.map((cat) => (
                        <label key={cat.key} className="notification-row">
                            <div className="notification-row-info">
                                <span className="notification-row-label">{cat.label}</span>
                                <span className="notification-row-desc">{cat.description}</span>
                            </div>
                            <span className="notification-switch">
                                <input
                                    type="checkbox"
                                    checked={!!draft.push[cat.key]}
                                    onChange={() => handleToggle('push', cat.key)}
                                    disabled={saving}
                                    aria-label={`Bật thông báo đẩy ${cat.label}`}
                                />
                                <span className="notification-switch-slider" />
                            </span>
                        </label>
                    ))}
                </div>
            </section>
        </div>
    );
});
