import { memo, useState } from 'react';
import { User, Bell } from 'lucide-react';
import EditProfilePage from '@/pages/EditProfilePage';
import NotificationSettings from './components/NotificationSettings';
import './SettingsPage.css';

type Tab = 'profile' | 'notifications';

export default memo(function SettingsPage() {
    const [tab, setTab] = useState<Tab>('profile');

    return (
        <div className="settings-page">
            <header className="settings-page-header">
                <h1 className="settings-page-title">Cài đặt</h1>
                <p className="settings-page-subtitle">
                    Quản lý thông tin cá nhân và tùy chọn thông báo.
                </p>
            </header>

            <nav className="settings-tabs" aria-label="Cài đặt">
                <button
                    type="button"
                    className={`settings-tab ${tab === 'profile' ? 'active' : ''}`}
                    onClick={() => setTab('profile')}
                    aria-selected={tab === 'profile'}
                    role="tab"
                >
                    <User size={16} aria-hidden="true" />
                    Hồ sơ
                </button>
                <button
                    type="button"
                    className={`settings-tab ${tab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setTab('notifications')}
                    aria-selected={tab === 'notifications'}
                    role="tab"
                >
                    <Bell size={16} aria-hidden="true" />
                    Thông báo
                </button>
            </nav>

            <div className="settings-tab-content" role="tabpanel">
                {tab === 'profile' && <EditProfilePage />}
                {tab === 'notifications' && <NotificationSettings />}
            </div>
        </div>
    );
});
