import { Camera, Users, Folder, BarChart3, UserPlus, CalendarDays } from "lucide-react";
import { t } from "@/i18n";

type TabType = 'photos' | 'following' | 'followers' | 'collections' | 'stats' | 'bookings';

interface ProfileTabsProps {
    activeTab: TabType;
    photosCount: number;
    followingCount: number;
    followersCount: number;
    collectionsCount: number;
    onTabChange: (tab: TabType) => void;
    isOwnProfile?: boolean;
}

export function ProfileTabs({
    activeTab,
    photosCount,
    followingCount,
    followersCount,
    collectionsCount,
    onTabChange,
    isOwnProfile = false,
}: ProfileTabsProps) {
    return (
        <div className="profile-tabs">
            <button
                className={`profile-tab ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => onTabChange('photos')}
            >
                <Camera size={18} className="tab-icon" />
                <span className="tab-label">{t('profile.photos')}</span>
                <span className="tab-count">{photosCount}</span>
            </button>
            <button
                className={`profile-tab ${activeTab === 'following' ? 'active' : ''}`}
                onClick={() => onTabChange('following')}
            >
                <UserPlus size={18} className="tab-icon" />
                <span className="tab-label">{t('profile.following')}</span>
                <span className="tab-count">{followingCount}</span>
            </button>
            <button
                className={`profile-tab ${activeTab === 'followers' ? 'active' : ''}`}
                onClick={() => onTabChange('followers')}
            >
                <Users size={18} className="tab-icon" />
                <span className="tab-label">{t('profile.followers')}</span>
                <span className="tab-count">{followersCount}</span>
            </button>
            <button
                className={`profile-tab ${activeTab === 'collections' ? 'active' : ''}`}
                onClick={() => onTabChange('collections')}
            >
                <Folder size={18} className="tab-icon" />
                <span className="tab-label">{t('profile.collections')}</span>
                <span className="tab-count">{collectionsCount}</span>
            </button>
            {isOwnProfile && (
                <button
                    className={`profile-tab ${activeTab === 'bookings' ? 'active' : ''}`}
                    onClick={() => onTabChange('bookings')}
                >
                    <CalendarDays size={18} className="tab-icon" />
                    <span className="tab-label">Lịch đặt</span>
                </button>
            )}
            {/* Statistics tab - Only visible for own profile */}
            {isOwnProfile && (
                <button
                    className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => onTabChange('stats')}
                >
                    <BarChart3 size={18} className="tab-icon" />
                    <span className="tab-label">{t('profile.stats')}</span>
                </button>
            )}
        </div>
    );
}

