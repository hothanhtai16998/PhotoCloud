import type { Image } from '@/types/image';
import type { User } from '@/types/user';
import { Avatar } from '../Avatar';
import { FollowButton } from '../FollowButton';
import { t } from '@/i18n';

interface UserProfileCardProps {
    image: Image;
    user: User | null;
    showUserProfileCard: boolean;
    isClosingProfileCard: boolean;
    userImages: Image[];
    isLoadingUserImages: boolean;
    userProfileCardRef: React.RefObject<HTMLDivElement | null>;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onViewProfile: (e: React.MouseEvent) => void;
    onUserImageClick: (userImage: Image) => void;
}

export const UserProfileCard = ({
    image,
    user,
    showUserProfileCard,
    isClosingProfileCard,
    userImages,
    isLoadingUserImages,
    userProfileCardRef,
    onMouseEnter,
    onMouseLeave,
    onViewProfile,
    onUserImageClick,
}: UserProfileCardProps) => {
    if (!showUserProfileCard) return null;

    const displayName = image.uploadedBy?.displayName?.trim() || image.uploadedBy?.username || '';
    const username = image.uploadedBy?.username || '';

    return (
        <div
            ref={userProfileCardRef}
            className={`user-profile-card ${isClosingProfileCard ? 'closing' : ''}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="user-profile-card-header">
                <div className="user-profile-card-avatar-section">
                    <Avatar
                        user={image.uploadedBy}
                        size={48}
                        className="user-profile-card-avatar"
                        fallbackClassName="user-profile-card-avatar-placeholder"
                    />
                    <div className="user-profile-card-name-section">
                        <div className="user-profile-card-name">{displayName}</div>
                        <div className="user-profile-card-username">{username}</div>
                    </div>
                </div>
                {user && user._id !== image.uploadedBy?._id && (
                    <div className="user-profile-card-follow">
                        <FollowButton
                            userId={image.uploadedBy._id}
                            userDisplayName={image.uploadedBy.displayName ?? image.uploadedBy.username}
                            variant="default"
                            size="sm"
                        />
                    </div>
                )}
            </div>

            {isLoadingUserImages && userImages.length === 0 ? (
                <div className="user-profile-card-loading">
                    <div className="loading-spinner-small" />
                </div>
            ) : userImages.length > 0 ? (
                <div className="user-profile-card-images">
                    {userImages.map((userImage) => (
                        <div
                            key={userImage._id}
                            className="user-profile-card-image-item"
                            onClick={() => onUserImageClick(userImage)}
                        >
                            <img
                                src={userImage.thumbnailUrl ?? userImage.smallUrl ?? userImage.imageUrl}
                                alt={userImage.imageTitle ?? 'Photo'}
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            ) : null}

            <button
                className="user-profile-card-view-btn"
                onClick={onViewProfile}
            >
                {t('image.viewProfile')}
            </button>
        </div>
    );
};
