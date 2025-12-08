import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useUserImageStore } from "@/stores/useUserImageStore";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Image } from "@/types/image";
import ProgressiveImage from "@/components/ProgressiveImage";
import MasonryGrid from "@/components/MasonryGrid";
import api from "@/lib/axios";
import axios from "axios";
import { generateImageSlug, extractIdFromSlug } from "@/lib/utils";
import { Folder, Eye } from "lucide-react";
// Lazy load analytics dashboard - only needed when stats tab is active
const UserAnalyticsDashboard = lazy(() => import("./components/UserAnalyticsDashboard").then(module => ({ default: module.UserAnalyticsDashboard })));
const UserList = lazy(() => import("./components/UserList").then(module => ({ default: module.UserList })));
// Lazy load ImageModal - conditionally rendered
const ImageModal = lazy(() => import("@/components/ImageModal"));
import { userStatsService } from "@/services/userStatsService";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileTabs } from "./components/ProfileTabs";
import { EditPinsModal } from "./components/EditPinsModal";
import { useRequestCancellationOnChange } from "@/hooks/useRequestCancellation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";
import { appConfig } from "@/config/appConfig";
import { timingConfig } from "@/config/timingConfig";
import { uiConfig } from "@/config/uiConfig";
import { t } from "@/i18n";
import "./ProfilePage.css";

type TabType = 'photos' | 'following' | 'followers' | 'collections' | 'stats';

// Profile tab IDs
const TABS = {
    PHOTOS: 'photos',
    FOLLOWING: 'following',
    FOLLOWERS: 'followers',
    COLLECTIONS: 'collections',
    STATS: 'stats',
} as const;

function ProfilePage() {
    // currentUser: the logged-in user viewing the profile
    // profileUser: the user whose profile is being displayed (may be different from currentUser)
    // ProtectedRoute handles authentication, so currentUser is guaranteed to exist here
    const { user: currentUser } = useUserStore();
    const navigate = useNavigate();
    const params = useParams<{ username?: string; userId?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();

    // Profile store
    const {
        profileUser,
        profileUserLoading,
        followStats,
        userStats,
        collections,
        collectionsLoading,
        collectionsCount,
        fetchProfileUser,
        fetchFollowStats,
        fetchUserStats,
        fetchCollections,
        clearProfile,
    } = useProfileStore();

    // User image store
    const {
        images,
        loading,
        photosCount,
        imageTypes,
        fetchUserImages,
        setImageType,
        updateImage,
        clearImages,
    } = useUserImageStore();

    // Detect if we're on mobile
    const isMobile = useIsMobile();

    // Column count for masonry grid (responsive like ImageGrid)
    const [columnCount, setColumnCount] = useState(() => {
        if (typeof window === 'undefined') return 3;
        const width = window.innerWidth;
        if (width < appConfig.mobileBreakpoint) return 1; // Mobile: 1 column
        if (width < appConfig.breakpoints.lg) return 2; // Tablet: 2 columns
        return 3; // Desktop: 3 columns
    });

    const [activeTab, setActiveTab] = useState<TabType>(TABS.PHOTOS);
    const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);
    // Track which user ID the current stats belong to
    const [statsUserId, setStatsUserId] = useState<string | undefined>(undefined);
    const processedImages = useRef<Set<string>>(new Set());
    const previousParams = useRef<string>('');

    // Cancel user lookup when params change
    const userLookupCancelSignal = useRequestCancellationOnChange([params.username, params.userId]);

    // Fetch profile user data if viewing someone else's profile
    useEffect(() => {
        const loadProfileUser = async () => {
            try {
                await fetchProfileUser(params.username, params.userId, userLookupCancelSignal);
            } catch (_error) {
                // Error already handled in store, navigate away
                navigate('/');
            }
        };

        loadProfileUser();
    }, [params.username, params.userId, navigate, userLookupCancelSignal, fetchProfileUser]);

    // Determine which user's profile to display
    const displayUserId = useMemo(() => {
        if (params.userId) return params.userId;
        if (params.username && profileUser) return profileUser._id;
        return currentUser?._id;
    }, [params.userId, params.username, profileUser, currentUser?._id]);

    const isOwnProfile = useMemo(() => {
        return displayUserId === currentUser?._id;
    }, [displayUserId, currentUser?._id]);

    // Compute displayUser early so it can be used in callbacks
    const displayUser = useMemo(() => {
        if (!currentUser) return null;
        return profileUser || {
            _id: currentUser._id,
            username: currentUser.username,
            displayName: currentUser.displayName || currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            bio: currentUser.bio,
            location: currentUser.location,
            website: currentUser.website,
            instagram: currentUser.instagram,
            twitter: currentUser.twitter,
            facebook: currentUser.facebook,
            createdAt: currentUser.createdAt || new Date().toISOString(),
        };
    }, [profileUser, currentUser]);

    // Statistics tab - Only allow access for own profile
    // Also check URL params to prevent direct access via URL manipulation
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'stats' && !isOwnProfile) {
            // Remove invalid tab param and redirect to photos
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.delete('tab');
                return newParams;
            });
            setActiveTab(TABS.PHOTOS);
        } else if (activeTab === TABS.STATS && !isOwnProfile) {
            setActiveTab(TABS.PHOTOS);
        }
    }, [activeTab, isOwnProfile, searchParams, setSearchParams]);

    // Reset all state immediately when params change to prevent flashing old data
    useEffect(() => {
        // Create a unique key from params to detect changes
        const paramsKey = `${params.username || ''}-${params.userId || ''}`;

        // Only reset if params actually changed (not on initial mount)
        if (previousParams.current && previousParams.current !== paramsKey) {
            // Mark that we're switching profiles
            setIsSwitchingProfile(true);

            // Clear the stats user ID ref so old data won't be shown
            setStatsUserId(undefined);

            // Clear all profile-related state immediately when switching users
            clearProfile();
            clearImages();
            processedImages.current.clear();
            
            // Reset active tab to photos when switching profiles (unless it's own profile and stats is valid)
            if (activeTab === TABS.STATS) {
                setActiveTab(TABS.PHOTOS);
            }
        }

        // Update the ref for next comparison (on initial mount, this will be set)
        if (!previousParams.current || previousParams.current !== paramsKey) {
            previousParams.current = paramsKey;
        }
    }, [params.username, params.userId, clearProfile, clearImages, activeTab]);

    // Helper to update statsUserId if still on the same user
    const updateStatsUserIdIfSame = useCallback((capturedUserId: string) => {
        if (displayUserId === capturedUserId && !statsUserId) {
            setStatsUserId(displayUserId);
        }
    }, [displayUserId, statsUserId, setStatsUserId]);

    // Wrapper to handle race condition checks
    const fetchUserImagesWrapper = useCallback(async (refresh = false, signal?: AbortSignal) => {
        if (!displayUserId) return;
        const currentUserId = displayUserId; // Capture at start of fetch

        try {
            await fetchUserImages(displayUserId, refresh, signal);
            updateStatsUserIdIfSame(currentUserId);
        } catch (_error) {
            // Error already handled in store
        }
    }, [displayUserId, fetchUserImages, updateStatsUserIdIfSame]);

    // Wrapper to handle race condition checks and own profile check
    const fetchCollectionsWrapper = useCallback(async (signal?: AbortSignal) => {
        if (!displayUserId) {
            setIsSwitchingProfile(false);
            return;
        }
        // For now, only fetch own collections. TODO: Add endpoint to fetch other users' collections
        if (!isOwnProfile) {
            setIsSwitchingProfile(false);
            return;
        }

        const currentUserId = displayUserId; // Capture at start of fetch

        try {
            await fetchCollections(displayUserId, signal);
            updateStatsUserIdIfSame(currentUserId);
            // Reset switching state after successful fetch
            if (displayUserId === currentUserId) {
                setIsSwitchingProfile(false);
            }
        } catch (_error) {
            // Error already handled in store
            // Reset switching state on error
            if (displayUserId === currentUserId) {
                setIsSwitchingProfile(false);
            }
        }
    }, [displayUserId, isOwnProfile, fetchCollections, updateStatsUserIdIfSame, setIsSwitchingProfile]);

    // Wrapper to handle race condition checks
    const fetchFollowStatsWrapper = useCallback(async (signal?: AbortSignal) => {
        if (!displayUserId) {
            setIsSwitchingProfile(false);
            return;
        }
        const currentUserId = displayUserId; // Capture at start of fetch

        try {
            await fetchFollowStats(displayUserId, signal);
            updateStatsUserIdIfSame(currentUserId);
            // Reset switching state after successful fetch
            if (displayUserId === currentUserId) {
                setIsSwitchingProfile(false);
            }
        } catch (_error) {
            // Error already handled in store
            // Reset switching state on error
            if (displayUserId === currentUserId) {
                setIsSwitchingProfile(false);
            }
        }
    }, [displayUserId, fetchFollowStats, updateStatsUserIdIfSame, setIsSwitchingProfile]);

    // Wrapper to handle race condition checks
    const fetchUserStatsWrapper = useCallback(async (signal?: AbortSignal) => {
        if (!displayUserId) {
            setIsSwitchingProfile(false);
            return;
        }
        const currentUserId = displayUserId; // Capture at start of fetch

        try {
            await fetchUserStats(displayUserId, signal);
            // Only update if we're still on the same user
            if (displayUserId === currentUserId) {
                setStatsUserId(displayUserId);
                setIsSwitchingProfile(false);
            }
        } catch (_error) {
            // Error already handled in store
            // Always reset switching state on error to prevent stuck loading state
            if (displayUserId === currentUserId) {
                setIsSwitchingProfile(false);
            } else {
                // If user changed during fetch, also reset
                setIsSwitchingProfile(false);
            }
        }
    }, [displayUserId, fetchUserStats, setStatsUserId, setIsSwitchingProfile]);

    // Track profile view when component mounts (only once per session)
    useEffect(() => {
        if (!displayUserId || !currentUser?._id) return;

        // Only track views for other users' profiles
        if (!isOwnProfile) {
            const hasTrackedView = sessionStorage.getItem(`${appConfig.storage.profileViewKeyPrefix}${displayUserId}_${currentUser._id}`);
            if (!hasTrackedView) {
                userStatsService.trackProfileView(displayUserId).catch(err => {
                    console.error('Failed to track profile view:', err);
                    // Don't show error to user - this is background tracking
                });
                sessionStorage.setItem(`${appConfig.storage.profileViewKeyPrefix}${displayUserId}_${currentUser._id}`, 'true');
            }
        }
    }, [displayUserId, currentUser?._id, isOwnProfile]);

    // Cancel requests when displayUserId changes
    const cancelSignal = useRequestCancellationOnChange([displayUserId]);

    useEffect(() => {
        // ProtectedRoute ensures currentUser exists, but we still need displayUserId
        if (!displayUserId) {
            return undefined;
        }

        // Only fetch essential data on initial load (images and follow stats for header)
        // Collections and stats will be lazy-loaded when their tabs are clicked
        Promise.all([
            fetchUserImagesWrapper(false, cancelSignal),
            fetchFollowStatsWrapper(cancelSignal),
        ]).catch((error) => {
            // Ignore cancellation errors - these are expected when navigating away
            const isCanceled = axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED';
            if (!isCanceled) {
                console.error('Error fetching profile data:', error);
            }
        });

        return undefined;
    }, [displayUserId, fetchUserImagesWrapper, fetchFollowStatsWrapper, cancelSignal]);

    // Lazy-load collections only when collections tab is active
    useEffect(() => {
        if (activeTab === TABS.COLLECTIONS && !collectionsLoading && collections.length === 0 && displayUserId) {
            fetchCollectionsWrapper(cancelSignal);
        }
    }, [activeTab, displayUserId, fetchCollectionsWrapper, cancelSignal, collectionsLoading, collections.length]);

    // Lazy-load stats only when stats tab is active
    useEffect(() => {
        if (activeTab === TABS.STATS && !userStats && displayUserId) {
            fetchUserStatsWrapper(cancelSignal);
        }
    }, [activeTab, displayUserId, fetchUserStatsWrapper, cancelSignal, userStats]);

    // Listen for refresh event after image upload
    useEffect(() => {
        const handleRefresh = () => {
            // Force fresh fetch with cache-busting
            // Use a small delay to ensure backend has processed the new image
            // Don't use cancelSignal for refresh - this is a manual refresh action
            setTimeout(() => {
                fetchUserImagesWrapper(true); // Pass true to enable cache-busting, no signal for manual refresh
                if (isOwnProfile) {
                    fetchCollectionsWrapper(); // Also refresh collections, no signal for manual refresh
                }
            }, timingConfig.refresh.afterUploadMs);
        };

        window.addEventListener('refreshProfile', handleRefresh);
        return () => {
            window.removeEventListener('refreshProfile', handleRefresh);
        };
    }, [fetchUserImagesWrapper, fetchCollectionsWrapper, isOwnProfile]);

    const handleEditProfile = () => {
        navigate('/profile/edit');
    };

    const [isEditPinsModalOpen, setIsEditPinsModalOpen] = useState(false);
    
    const handleEditPins = () => {
        if (isOwnProfile) {
            setIsEditPinsModalOpen(true);
        }
    };

    const handlePinnedImagesUpdate = useCallback((updatedImages: Image[]) => {
        // Update displayUser with new pinned images
        if (displayUser) {
            displayUser.pinnedImages = updatedImages;
        }
        // Also update profileUser if it exists
        if (profileUser) {
            useProfileStore.setState((state) => {
                if (state.profileUser) {
                    state.profileUser.pinnedImages = updatedImages;
                }
            });
        }
    }, [displayUser, profileUser]);

    // Follow/Unfollow handler
    const [isFollowingLoading, setIsFollowingLoading] = useState(false);
    const handleFollowToggle = useCallback(async () => {
        if (!displayUserId || isOwnProfile || isFollowingLoading || !displayUser) return;

        setIsFollowingLoading(true);
        try {
            const { followService } = await import('@/services/followService');
            const userName = displayUser.displayName || displayUser.username;
            
            if (followStats.isFollowing) {
                await followService.unfollowUser(displayUserId);
                // Update follow stats optimistically
                useProfileStore.setState((state) => {
                    state.followStats.isFollowing = false;
                });
                toast.success(t('follow.unfollowed', { name: userName }) || 'Unfollowed successfully');
            } else {
                await followService.followUser(displayUserId);
                // Update follow stats optimistically
                useProfileStore.setState((state) => {
                    state.followStats.isFollowing = true;
                });
                toast.success(t('follow.followed', { name: userName }) || 'Followed successfully');
            }
            // Refresh follow stats to get accurate counts
            await fetchFollowStatsWrapper(cancelSignal);
        } catch (error) {
            console.error('Failed to toggle follow:', error);
            toast.error(t('follow.followToggleFailed') || 'Failed to update follow status');
            // Refresh to get correct state
            await fetchFollowStatsWrapper(cancelSignal);
        } finally {
            setIsFollowingLoading(false);
        }
    }, [displayUserId, displayUser, isOwnProfile, isFollowingLoading, followStats.isFollowing, fetchFollowStatsWrapper, cancelSignal]);


    // Calculate display images based on active tab
    const displayImages = useMemo(() => {
        if (activeTab === TABS.PHOTOS) {
            return images.filter(img => {
                const categoryName = typeof img.imageCategory === 'string'
                    ? img.imageCategory
                    : img.imageCategory?.name;
                // Show images without categories (pending approval) or with valid categories
                // Only filter out illustration and svg categories if category exists
                if (!categoryName) {
                    return true; // Show images without categories (pending approval)
                }
                return !categoryName.toLowerCase().includes('illustration') &&
                    !categoryName.toLowerCase().includes('svg');
            });
        }
        return [];
    }, [activeTab, images]);

    // Get selected image slug or ID from URL
    const imageParamFromUrl = searchParams.get('image');

    // MOBILE ONLY: If URL has ?image=slug on mobile, redirect to ImagePage
    useEffect(() => {
        if (imageParamFromUrl && isMobile) {
            // Set flag to indicate we're opening from grid
            sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
            // Navigate to ImagePage with images state
            navigate(`/photos/${imageParamFromUrl}`, {
                state: {
                    images: displayImages,
                    fromGrid: true
                },
                replace: true // Replace current URL to avoid back button issues
            });
            // Clear the image param from current URL
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.delete('image');
                return newParams;
            });
        }
    }, [imageParamFromUrl, isMobile, navigate, displayImages, setSearchParams]);

    // Find selected image from URL (supports both slug format and legacy ID format) - DESKTOP ONLY
    const selectedImage = useMemo(() => {
        // Don't show modal on mobile
        if (isMobile) return null;
        if (!imageParamFromUrl) return null;

        // Check if it's a MongoDB ObjectId (24 hex characters) - legacy format
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(imageParamFromUrl);

        if (isObjectId) {
            // Legacy format: direct ID match
            return displayImages.find(img => img._id === imageParamFromUrl) || null;
        } else {
            // New format: slug with short ID
            const shortId = extractIdFromSlug(imageParamFromUrl);
            if (!shortId) return null;

            // Find image by matching the last 12 characters of ID
            return displayImages.find(img => {
                const imgShortId = img._id.slice(-12);
                return imgShortId === shortId;
            }) || null;
        }
    }, [imageParamFromUrl, displayImages, isMobile]);

    // Get current image IDs for comparison
    const currentImageIds = useMemo(() => new Set(displayImages.map(img => img._id)), [displayImages]);

    // Determine image type when it loads
    const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
        // Only process once per image and only if image still exists
        if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;

        // Double-check that image still exists in current set (race condition protection)
        if (!currentImageIds.has(imageId)) return;

        processedImages.current.add(imageId);
        const isPortrait = img.naturalHeight > img.naturalWidth;
        const imageType = isPortrait ? 'portrait' : 'landscape';
        setImageType(imageId, imageType);
    }, [currentImageIds, setImageType]);

    // Cleanup processedImages when component unmounts or displayUserId changes
    useEffect(() => {
        return () => {
            // Cleanup on unmount
            processedImages.current.clear();
        };
    }, [displayUserId]);

    // Update image in the state when stats change
    const handleImageUpdate = useCallback((updatedImage: Image) => {
        updateImage(updatedImage._id, updatedImage);
    }, [updateImage]);

    // Update column count based on viewport size (like ImageGrid)
    useEffect(() => {
        const updateColumnCount = () => {
            const width = window.innerWidth;
            if (width < appConfig.mobileBreakpoint) {
                setColumnCount(1); // Mobile: 1 column
            } else if (width < appConfig.breakpoints.lg) {
                setColumnCount(2); // Tablet: 2 columns
            } else {
                setColumnCount(3); // Desktop: 3 columns
            }
        };

        updateColumnCount();
        window.addEventListener('resize', updateColumnCount);
        return () => window.removeEventListener('resize', updateColumnCount);
    }, []);

    // Handle image click (for MasonryGrid)
    const handleImageClick = useCallback((image: Image) => {
        // MOBILE ONLY: Navigate to ImagePage instead of opening modal
        if (isMobile) {
            // Set flag to indicate we're opening from grid
            sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
            // Pass images via state for navigation
            const slug = generateImageSlug(image.imageTitle || '', image._id);
            navigate(`/photos/${slug}`, {
                state: {
                    images: displayImages,
                    fromGrid: true
                }
            });
            return;
        }

        // DESKTOP: Use modal (existing behavior)
        // Update URL when image is selected with slug
        const slug = generateImageSlug(image.imageTitle || '', image._id);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('image', slug);
            return newParams;
        });
    }, [isMobile, displayImages, navigate, setSearchParams]);

    // Handle download (for MasonryGrid)
    const handleDownload = useCallback(async (image: Image, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            if (!image._id) {
                throw new Error(t('profile.imageIdError'));
            }

            // Use backend endpoint to download image (proxies from S3)
            const response = await api.get(`/images/${image._id}/download`, {
                responseType: 'blob',
                withCredentials: true,
            });

            // Create blob URL from response
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
            const blobUrl = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = blobUrl;

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'photo.webp';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            } else {
                // Fallback: generate filename from image title
                const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
                fileName = `${sanitizedTitle}.${urlExtension}`;
            }
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the blob URL after a short delay
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, timingConfig.cleanup.blobUrlRevokeMs);

            toast.success(t('profile.downloadSuccess'));
        } catch (error) {
            console.error(t('profile.downloadFailed'), error);
            toast.error(t('profile.loadImagesFailed'));

            // Fallback: try opening in new tab if download fails
            try {
                if (image.imageUrl) {
                    window.open(image.imageUrl, '_blank');
                }
            } catch (fallbackError) {
                console.error('Fallback download error:', fallbackError);
            }
        }
    }, []);

    // Handle add to collection (for MasonryGrid)
    const handleAddToCollection = useCallback((_image: Image, e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implement collection modal for profile page
        toast.info('Tính năng thêm vào bộ sưu tập sẽ sớm ra mắt!');
    }, []);

    if (profileUserLoading) {
        return (
            <>
                <Header />
                <main className="profile-page">
                    <div className="profile-container">
                        <Skeleton className="h-32 w-full" />
                    </div>
                </main>
            </>
        );
    }

    // Guard: Ensure currentUser exists before accessing its properties
    if (!currentUser || !displayUser) {
        return (
            <>
                <Header />
                <main className="profile-page">
                    <div className="profile-container">
                        <Skeleton className="h-32 w-full" />
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="profile-page">
                <div className="profile-container">
                    {/* Loading Overlay for Profile Switch */}
                    {isSwitchingProfile && (
                        <div className="profile-switch-overlay">
                            <div className="profile-switch-skeleton">
                                <Skeleton className="h-32 w-full mb-4" />
                                <Skeleton className="h-8 w-64 mb-2" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                    )}
                    {/* Profile Header */}
                    <ProfileHeader
                        displayUser={displayUser}
                        isOwnProfile={isOwnProfile}
                        userStats={userStats}
                        displayUserId={displayUserId}
                        isSwitchingProfile={isSwitchingProfile}
                        statsUserId={statsUserId}
                        photosCount={photosCount}
                        collectionsCount={collectionsCount}
                        followStats={followStats}
                        onEditProfile={handleEditProfile}
                        onEditPins={handleEditPins}
                        onTabChange={setActiveTab}
                        onFollowToggle={handleFollowToggle}
                        isFollowingLoading={isFollowingLoading}
                    />

                    {/* Navigation Tabs */}
                    <ProfileTabs
                        activeTab={activeTab}
                        photosCount={photosCount}
                        followingCount={followStats.following}
                        followersCount={followStats.followers}
                        collectionsCount={collectionsCount}
                        onTabChange={setActiveTab}
                        isOwnProfile={isOwnProfile}
                    />

                    {/* Content Area */}
                    <div className="profile-content">
                        {activeTab === TABS.PHOTOS ? (
                            loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4" aria-label={t('profile.loadingPhotos')} aria-live="polite">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <Skeleton key={i} className="w-full h-64" />
                                    ))}
                                </div>
                            ) : displayImages.length === 0 ? (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>{t('profile.noPhotos')}</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/upload')}
                                        className="mt-4"
                                    >
                                        {t('upload.addImage')}
                                    </Button>
                                </div>
                            ) : (
                                <MasonryGrid
                                    images={displayImages}
                                    onImageClick={handleImageClick}
                                    columnCount={columnCount}
                                    onDownload={handleDownload}
                                    onAddToCollection={handleAddToCollection}
                                />
                            )
                        ) : activeTab === TABS.FOLLOWING ? (
                            <Suspense fallback={<div className="following-loading"><Skeleton className="h-64 w-full" /></div>}>
                                {displayUserId && <UserList userId={displayUserId} mode="following" />}
                            </Suspense>
                        ) : activeTab === TABS.FOLLOWERS ? (
                            <Suspense fallback={<div className="following-loading"><Skeleton className="h-64 w-full" /></div>}>
                                {displayUserId && <UserList userId={displayUserId} mode="followers" />}
                            </Suspense>
                        ) : activeTab === TABS.COLLECTIONS ? (
                            collectionsLoading ? (
                                <div className="profile-collections-grid" aria-label={t('profile.loadingCollections')} aria-live="polite">
                                    {Array.from({ length: uiConfig.skeleton.collectionGridCount }).map((_, index) => (
                                        <div key={`skeleton-${index}`} className="profile-collection-item">
                                            <Skeleton className="w-full h-48 rounded-lg mb-3" />
                                            <Skeleton className="w-3/4 h-4 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : collections.length === 0 ? (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>{t('profile.noCollections')}</p>
                                    {isOwnProfile && (
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/collections')}
                                            className="mt-4"
                                        >
                                            {t('collections.createCollection') || 'Create Collection'}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="profile-collections-grid">
                                    {collections.map((collection) => {
                                        const coverImage =
                                            collection.coverImage &&
                                                typeof collection.coverImage === 'object'
                                                ? collection.coverImage
                                                : null;

                                        return (
                                            <div
                                                key={collection._id}
                                                className="profile-collection-item"
                                                onClick={() => navigate(`/collections/${collection._id}`)}
                                            >
                                                <div className="profile-collection-cover">
                                                    {coverImage ? (
                                                        <ProgressiveImage
                                                            src={coverImage.imageUrl}
                                                            thumbnailUrl={coverImage.thumbnailUrl}
                                                            smallUrl={coverImage.smallUrl}
                                                            regularUrl={coverImage.regularUrl}
                                                            alt={collection.name}
                                                        />
                                                    ) : (
                                                        <div className="profile-collection-placeholder">
                                                            <Folder size={48} />
                                                        </div>
                                                    )}
                                                    <div className="profile-collection-overlay">
                                                        <div className="profile-collection-actions">
                                                            <button
                                                                className="profile-collection-action-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/collections/${collection._id}`);
                                                                }}
                                                                title={t('profile.viewCollection')}
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="profile-collection-info">
                                                    <h3>{collection.name}</h3>
                                                    {collection.description && (
                                                        <p className="profile-collection-description">
                                                            {collection.description}
                                                        </p>
                                                    )}
                                                    <div className="profile-collection-meta">
                                                        <span>{collection.imageCount || 0} ảnh</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : activeTab === TABS.STATS ? (
                            // Statistics tab content - Only visible for own profile
                            isOwnProfile ? (
                                <Suspense fallback={
                                    <div className="empty-state" role="status" aria-live="polite">
                                        <Skeleton className="h-64 w-full" />
                                    </div>
                                }>
                                    <UserAnalyticsDashboard />
                                </Suspense>
                            ) : (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>{t('profile.statsPrivate') || 'Statistics are private and only visible to the account owner.'}</p>
                                </div>
                            )
                        ) : null}
                    </div>
                </div>
            </main>

            {/* Image Modal - DESKTOP ONLY */}
            {/* On mobile, we navigate to ImagePage instead */}
            {selectedImage && !isMobile && window.innerWidth > appConfig.mobileBreakpoint && (
                <Suspense fallback={null}>
                    <ImageModal
                        image={selectedImage}
                        images={displayImages}
                        onClose={() => {
                            // Remove image param from URL when closing
                            setSearchParams(prev => {
                                const newParams = new URLSearchParams(prev);
                                newParams.delete('image');
                                return newParams;
                            });
                        }}
                        onImageSelect={(updatedImage) => {
                            handleImageUpdate(updatedImage);
                            // Update URL to reflect the selected image with slug
                            const slug = generateImageSlug(updatedImage.imageTitle || 'Untitled', updatedImage._id);
                            setSearchParams(prev => {
                                const newParams = new URLSearchParams(prev);
                                newParams.set('image', slug);
                                return newParams;
                            });
                        }}
                        onDownload={() => { /* Download handled by ImageModal internally */ }}
                        imageTypes={imageTypes}
                        onImageLoad={handleImageLoad}
                        currentImageIds={currentImageIds}
                        processedImages={processedImages}
                    />
                </Suspense>
            )}

            {/* Edit Pins Modal */}
            {isOwnProfile && displayUserId && (
                <EditPinsModal
                    isOpen={isEditPinsModalOpen}
                    onClose={() => setIsEditPinsModalOpen(false)}
                    currentPinnedImages={displayUser?.pinnedImages || []}
                    onPinnedImagesUpdate={handlePinnedImagesUpdate}
                    userId={displayUserId}
                />
            )}
        </>
    );
}

export default ProfilePage;
