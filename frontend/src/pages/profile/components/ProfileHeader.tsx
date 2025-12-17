import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
// import { ProfileCompletion } from "./ProfileCompletion";
import { MapPin, Globe, Instagram, Twitter, Users, UserPlus, UserMinus, Pin } from "lucide-react";
import type { PublicUser } from "@/services/userService";
import type { UserStats } from "@/services/userStatsService";
import { t } from "@/i18n";

interface ProfileHeaderProps {
    displayUser: PublicUser;
    isOwnProfile: boolean;
    userStats: UserStats | null;
    displayUserId: string | undefined;
    isSwitchingProfile: boolean;
    statsUserId: string | undefined;
    photosCount: number;
    collectionsCount: number;
    followStats: { followers: number; following: number; isFollowing: boolean };
    onEditProfile: () => void;
    onEditPins: () => void;
    onTabChange: (tab: 'photos' | 'following' | 'followers' | 'collections' | 'stats') => void;
    onFollowToggle?: () => void;
    isFollowingLoading?: boolean;
}

export function ProfileHeader({
    displayUser,
    isOwnProfile,
    followStats,
    onEditProfile,
    onEditPins,
    onFollowToggle,
    isFollowingLoading = false,
}: ProfileHeaderProps) {
    return (
        <div className="profile-header">
            <div className="profile-avatar-container">
                <Avatar
                    user={displayUser}
                    size={120}
                    className="profile-avatar"
                    fallbackClassName="profile-avatar-placeholder"
                />
            </div>
            <div className="profile-info">
                <div className="profile-name-section">
                    <h1 className="profile-name">{displayUser.displayName || displayUser.username}</h1>
                    {isOwnProfile ? (
                        <div className="profile-actions">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEditProfile}
                                className="edit-profile-btn"
                            >
                                {t('profile.editProfile')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEditPins}
                                className="edit-pins-btn"
                                title={t('profile.editPins')}
                            >
                                <Pin size={16} fill={displayUser.pinnedImages?.length ? 'currentColor' : 'none'} />
                                <span>{t('profile.editPins')}</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="profile-actions">
                            <Button
                                variant={followStats.isFollowing ? "outline" : "default"}
                                size="sm"
                                onClick={onFollowToggle}
                                disabled={isFollowingLoading}
                                className="follow-btn"
                            >
                                {isFollowingLoading ? (
                                    <>
                                        <span className="loading-spinner" />
                                        {t('common.loading')}
                                    </>
                                ) : followStats.isFollowing ? (
                                    <>
                                        <UserMinus size={16} />
                                        {t('follow.unfollow') || 'Following'}
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        {t('follow.follow') || 'Follow'}
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
                <p className="profile-description">
                    {displayUser.bio || t('profile.defaultBio', { name: displayUser.displayName || displayUser.username })}
                </p>

                {/* Location */}
                {displayUser.location && (
                    <div className="profile-location">
                        <MapPin size={16} />
                        <span>{displayUser.location}</span>
                    </div>
                )}

                {/* Social Links */}
                {(displayUser.website || displayUser.instagram || displayUser.twitter || displayUser.facebook) && (
                    <div className="profile-social-links">
                        {displayUser.website && (
                            <a
                                href={displayUser.website.startsWith('http') ? displayUser.website : `https://${displayUser.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title={t('profile.website')}
                            >
                                <Globe size={18} />
                            </a>
                        )}
                        {displayUser.instagram && (
                            <a
                                href={`https://instagram.com/${displayUser.instagram.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title={`@${displayUser.instagram}`}
                            >
                                <Instagram size={18} />
                            </a>
                        )}
                        {displayUser.twitter && (
                            <a
                                href={`https://twitter.com/${displayUser.twitter.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title={`@${displayUser.twitter}`}
                            >
                                <Twitter size={18} />
                            </a>
                        )}
                        {displayUser.facebook && (
                            <a
                                href={`https://facebook.com/${displayUser.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title={displayUser.facebook}
                            >
                                <Users size={18} />
                            </a>
                        )}
                    </div>
                )}

                {/* Profile Completion - Commented out, not using it now */}
                {/* {isOwnProfile && userStats?.profileCompletion && userStats.profileCompletion.percentage < 100 && (
                    <ProfileCompletion
                        completion={userStats.profileCompletion}
                        onEditProfile={onEditProfile}
                    />
                )} */}
            </div>
        </div>
    );
}

