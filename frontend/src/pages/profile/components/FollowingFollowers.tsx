import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { followService } from '@/services/followService';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { FollowUser } from '@/types/follow';
import { t } from '@/i18n';
import './FollowingFollowers.css';

interface FollowingFollowersProps {
    userId: string;
}

export function FollowingFollowers({ userId }: FollowingFollowersProps) {
    const navigate = useNavigate();
    const [following, setFollowing] = useState<FollowUser[]>([]);
    const [followers, setFollowers] = useState<FollowUser[]>([]);
    const [followingLoading, setFollowingLoading] = useState(true);
    const [followersLoading, setFollowersLoading] = useState(true);

    useEffect(() => {
        const loadFollowing = async () => {
            try {
                setFollowingLoading(true);
                const response = await followService.getUserFollowing(userId, { page: 1, limit: 20 });
                setFollowing(response.following || []);
            } catch (error) {
                console.error('Failed to load following:', error);
                toast.error(t('profile.loadFollowingFailed'));
            } finally {
                setFollowingLoading(false);
            }
        };

        const loadFollowers = async () => {
            try {
                setFollowersLoading(true);
                const response = await followService.getUserFollowers(userId, { page: 1, limit: 20 });
                setFollowers(response.followers || []);
            } catch (error) {
                console.error('Failed to load followers:', error);
                toast.error(t('profile.loadFollowersFailed'));
            } finally {
                setFollowersLoading(false);
            }
        };

        if (userId) {
            loadFollowing();
            loadFollowers();
        }
    }, [userId]);

    const handleUserClick = (user: FollowUser) => {
        navigate(`/profile/${user.username || user._id}`);
    };

    return (
        <div className="following-followers-container">
            {/* Left Side - Following */}
            <div className="following-section">
                <h3 className="section-title">{t('profile.followingTitle')}</h3>
                {followingLoading ? (
                    <div className="user-list">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="user-item">
                                <Skeleton className="user-avatar" />
                                <div className="user-info">
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : following.length === 0 ? (
                    <div className="empty-state">
                        <p>{t('profile.noFollowing')}</p>
                    </div>
                ) : (
                    <div className="user-list">
                        {following.map((user) => (
                            <div
                                key={user._id}
                                className="user-item"
                                onClick={() => handleUserClick(user)}
                            >
                                <div className="user-avatar">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.displayName || user.username} />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            {((user.displayName || user.username || 'U')[0] || 'U').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="user-info">
                                    <div className="user-name">{user.displayName || user.username}</div>
                                    {user.bio && <div className="user-bio">{user.bio}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Side - Followers */}
            <div className="followers-section">
                <h3 className="section-title">{t('profile.followersTitle')}</h3>
                {followersLoading ? (
                    <div className="user-list">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="user-item">
                                <Skeleton className="user-avatar" />
                                <div className="user-info">
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : followers.length === 0 ? (
                    <div className="empty-state">
                        <p>{t('profile.noFollowers')}</p>
                    </div>
                ) : (
                    <div className="user-list">
                        {followers.map((user) => (
                            <div
                                key={user._id}
                                className="user-item"
                                onClick={() => handleUserClick(user)}
                            >
                                <div className="user-avatar">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.displayName || user.username} />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            {((user.displayName || user.username || 'U')[0] || 'U').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="user-info">
                                    <div className="user-name">{user.displayName || user.username}</div>
                                    {user.bio && <div className="user-bio">{user.bio}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

