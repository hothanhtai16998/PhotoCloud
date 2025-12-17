import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followService } from '@/services/followService';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { t } from '@/i18n';
import './FollowButton.css';

interface FollowButtonProps {
	userId: string;
	userDisplayName?: string;
	variant?: 'default' | 'outline' | 'ghost';
	size?: 'sm' | 'md' | 'lg';
	showIcon?: boolean;
	className?: string;
}

export const FollowButton = ({
	userId,
	userDisplayName,
	variant = 'default',
	size = 'md',
	showIcon = true,
	className = '',
}: FollowButtonProps) => {
	const { user: currentUser } = useUserStore();
	const [isFollowing, setIsFollowing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		const fetchFollowStatus = async () => {
			try {
				setLoading(true);
				const status = await followService.getFollowStatus(userId);
				if (status && typeof status.isFollowing === 'boolean') {
					setIsFollowing(status.isFollowing);
				} else {
					// Default to false if status is invalid
					setIsFollowing(false);
				}
			} catch (error) {
				console.error('Failed to fetch follow status:', error);
				// Default to false on error
				setIsFollowing(false);
			} finally {
				setLoading(false);
			}
		};

		if (userId && currentUser?._id) {
			fetchFollowStatus();
		} else {
			setLoading(false);
		}
	}, [userId, currentUser?._id]);

	// Don't show button if user is viewing their own profile
	if (!currentUser || currentUser._id === userId) {
		return null;
	}

	const handleFollow = async () => {
		if (actionLoading) return;

		try {
			setActionLoading(true);
			if (isFollowing) {
				await followService.unfollowUser(userId);
				setIsFollowing(false);
				toast.success(t('follow.unfollowed', { name: userDisplayName || t('follow.user') }));
			} else {
				await followService.followUser(userId);
				setIsFollowing(true);
				toast.success(t('follow.followed', { name: userDisplayName || t('follow.user') }));
			}
		} catch (error: unknown) {
			console.error('Follow action failed:', error);
			const message = getErrorMessage(error, t('follow.error'));
			toast.error(message);
		} finally {
			setActionLoading(false);
		}
	};

	const buttonSize = size === 'md' ? 'default' : size;

	if (loading) {
		return (
			<Button
				variant={variant}
				size={buttonSize}
				disabled
				className={`follow-btn ${className}`}
			>
				<Loader2 size={16} className="spinning" />
			</Button>
		);
	}

	return (
		<Button
			variant={isFollowing ? 'outline' : variant}
			size={buttonSize}
			onClick={handleFollow}
			disabled={actionLoading}
			className={`follow-btn ${isFollowing ? 'following' : ''} ${className}`}
		>
			{actionLoading ? (
				<Loader2 size={16} className="spinning" />
			) : showIcon ? (
				isFollowing ? (
					<UserMinus size={16} />
				) : (
					<UserPlus size={16} />
				)
			) : null}
			<span>{isFollowing ? t('follow.following') : t('follow.follow')}</span>
		</Button>
	);
};

