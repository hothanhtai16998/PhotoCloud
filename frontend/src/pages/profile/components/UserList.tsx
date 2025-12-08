import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { followService } from '@/services/followService';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { FollowUser } from '@/types/follow';
import { t } from '@/i18n';
import './FollowingFollowers.css';

interface UserListProps {
    userId: string;
    mode: 'following' | 'followers';
}

export function UserList({ userId, mode }: UserListProps) {
    const navigate = useNavigate();
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoading(true);
                const response = mode === 'following'
                    ? await followService.getUserFollowing(userId, { page: 1, limit: 20 })
                    : await followService.getUserFollowers(userId, { page: 1, limit: 20 });
                if (mode === 'following') {
                    setUsers('following' in response ? response.following : []);
                } else {
                    setUsers('followers' in response ? response.followers : []);
                }
            } catch (error) {
                console.error(`Failed to load ${mode}:`, error);
                toast.error(mode === 'following' 
                    ? t('profile.loadFollowingFailed')
                    : t('profile.loadFollowersFailed'));
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            loadUsers();
        }
    }, [userId, mode]);

    const handleUserClick = (user: FollowUser) => {
        navigate(`/profile/${user.username || user._id}`);
    };

    if (loading) {
        return (
            <div className="user-list">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="user-item">
                        <Skeleton className="user-avatar" />
                        <div className="user-info">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="empty-state">
                <p>{mode === 'following' ? t('profile.noFollowing') : t('profile.noFollowers')}</p>
            </div>
        );
    }

    return (
        <div className="user-list">
            {users.map((user) => (
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
    );
}

