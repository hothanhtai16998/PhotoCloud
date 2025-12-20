import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, lazy, Suspense, useContext } from "react";
import { useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useUserImageStore } from "@/stores/useUserImageStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useUserFollowCountStore } from "@/stores/useUserFollowCountStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Image } from "@/types/image";
import { BlurUpImage } from "@/components/NoFlashGrid/components/BlurUpImage";
import axios from "axios";
import { generateImageSlug } from "@/lib/utils";
import { Folder, Eye, Lock } from "lucide-react";
// Lazy load analytics dashboard - only needed when stats tab is active
const UserAnalyticsDashboard = lazy(() => import("./components/UserAnalyticsDashboard").then(module => ({ default: module.UserAnalyticsDashboard })));
// Import UserList directly instead of lazy loading to prevent Suspense fallback on tab switch
import { UserList } from "./components/UserList";
// Lazy load UploadModal - conditionally rendered
const UploadModal = lazy(() => import("@/components/UploadModal").then(module => ({ default: module.default })));
import { userStatsService } from "@/services/userStatsService";
import { followService } from "@/services/followService";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileTabs } from "./components/ProfileTabs";
import { EditPinsModal } from "./components/EditPinsModal";
import { useRequestCancellationOnChange } from "@/hooks/useRequestCancellation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";
import { appConfig } from "@/config/appConfig";
import { uiConfig } from "@/config/uiConfig";
import { t } from "@/i18n";
import { NoFlashGrid } from "@/components/NoFlashGrid";
import { saveScrollPosition, prepareModalNavigationState, setModalActive } from "@/utils/modalNavigation";
import { ActualLocationContext } from "@/contexts/ActualLocationContext";
import "./ProfilePage.css";
import "../CollectionsPage.css"; // Import collection card styles

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
    // currentUser: the logged-in user viewing the profile (may be null if not authenticated)
    // profileUser: the user whose profile is being displayed (may be different from currentUser)
    // Profile pages are public, so currentUser may be null
    const { user: currentUser } = useUserStore();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams<{ username?: string; userId?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const actualLocation = useContext(ActualLocationContext);
    
    // Refs for tracking previous values to prevent unnecessary recalculations
    const previousPathname = useRef<string>('');
    const isTabChangeFromUser = useRef<boolean>(false);
    const skipUrlSyncRef = useRef<boolean>(false);
    
    // Extract username and tab from pathname if route param is not available
    // This handles the /@username and /@username/tab format
    // Only recalculate when username part changes, not when just tab changes
    const { username: usernameFromPath, tab: tabFromPath } = useMemo(() => {
        if (params.username) {
            return { username: params.username, tab: undefined };
        }
        
        // Extract username from pathname
        const usernameMatch = location.pathname.match(/^\/@([^/]+)/);
        const username = usernameMatch ? usernameMatch[1] : undefined;
        
        // Only recalculate if username part changed (not just tab)
        const currentUsernamePath = username ? `/@${username}` : '';
        if (previousPathname.current && previousPathname.current.startsWith(currentUsernamePath) && currentUsernamePath) {
            // Username hasn't changed, just extract tab from current pathname
            const tabMatch = location.pathname.match(/^\/@[^/]+\/(following|followers|collections|stats)$/);
            const tab = tabMatch ? (tabMatch[1] as TabType) : undefined;
            return { username, tab };
        }
        
        // Username changed or first load - extract both
        previousPathname.current = location.pathname;
        const match = location.pathname.match(/^\/@([^/]+)(?:\/(following|followers|collections|stats))?$/);
        if (match) {
            return { username: match[1], tab: match[2] as TabType | undefined };
        }
        return { username: undefined, tab: undefined };
    }, [params.username, location.pathname]);

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

    // Follow count store for real-time updates
    const { updateFollowCounts, getFollowCounts } = useUserFollowCountStore();

    // Determine which user's profile to display (moved before useWebSocket to avoid TDZ error)
    const displayUserId = useMemo(() => {
        if (params.userId) return params.userId;
        if (usernameFromPath && profileUser) return profileUser._id;
        if (currentUser) return currentUser._id;
        return undefined;
    }, [params.userId, usernameFromPath, profileUser, currentUser]);

    // WebSocket for real-time follow count updates
    const { isConnected, joinProfileRoom, leaveProfileRoom } = useWebSocket({
        onUserFollowUpdate: useCallback((update) => {
            if (!displayUserId || update.userId !== displayUserId) return;
            
            // Don't update if the change was made by the current user (optimistic update already handled)
            if (update.actorId === currentUser?._id) return;

            // Update follow counts in store
            if (update.followersCount !== undefined || update.followingCount !== undefined) {
                updateFollowCounts(update.userId, {
                    followersCount: update.followersCount,
                    followingCount: update.followingCount,
                });
            }

            // Update followStats in profile store
            useProfileStore.setState((state) => {
                if (update.followersCount !== undefined) {
                    state.followStats.followers = update.followersCount;
                }
                if (update.followingCount !== undefined) {
                    state.followStats.following = update.followingCount;
                }
            });
        }, [displayUserId, currentUser?._id, updateFollowCounts]),
    });

    // Join/leave profile room for real-time follow count updates
    useEffect(() => {
        if (!displayUserId || !isConnected) return;

        // Initialize follow counts from current followStats
        updateFollowCounts(displayUserId, {
            followersCount: followStats.followers,
            followingCount: followStats.following,
        });

        joinProfileRoom(displayUserId);

        return () => {
            leaveProfileRoom(displayUserId);
        };
    }, [displayUserId, isConnected, joinProfileRoom, leaveProfileRoom, updateFollowCounts, followStats.followers, followStats.following]);

    // User image store
    const {
        images,
        loading,
        photosCount,
        pagination,
        fetchUserImages,
        clearImages,
    } = useUserImageStore();

    // Detect if we're on mobile
    const isMobile = useIsMobile();

    const [activeTab, setActiveTab] = useState<TabType>(TABS.PHOTOS);
    const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);
    // Track which user ID the current stats belong to
    const [statsUserId, setStatsUserId] = useState<string | undefined>(undefined);
    
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const processedImages = useRef<Set<string>>(new Set());
    const previousParams = useRef<string>('');
    // Track which tabs have been loaded to avoid showing loading state when switching back
    const loadedTabs = useRef<Set<TabType>>(new Set());

    // Cancel user lookup when params change
    const userLookupCancelSignal = useRequestCancellationOnChange([params.username, params.userId]);

    // Redirect to username-based URL if no username/userId provided (fallback safety)
    useEffect(() => {
        if (!usernameFromPath && !params.userId && currentUser?.username) {
            navigate(`/@${currentUser.username}`, { replace: true });
            return;
        }
    }, [usernameFromPath, params.userId, currentUser?.username, navigate]);

    // Fetch profile user data if viewing someone else's profile
    useEffect(() => {
        // Skip if redirecting
        if (!usernameFromPath && !params.userId) return;

        const loadProfileUser = async () => {
            try {
                await fetchProfileUser(usernameFromPath, params.userId, userLookupCancelSignal);
            } catch (_error) {
                // Error already handled in store, navigate away
                navigate('/');
            }
        };

        loadProfileUser();
    }, [usernameFromPath, params.userId, navigate, userLookupCancelSignal, fetchProfileUser]);

    const isOwnProfile = useMemo(() => {
        return displayUserId === currentUser?._id;
    }, [displayUserId, currentUser?._id]);

    // Compute displayUser early so it can be used in callbacks
    const displayUser = useMemo(() => {
        // If we have a profileUser (viewing someone else's profile), use that
        if (profileUser) return profileUser;
        // If we have currentUser (viewing own profile), use that
        if (currentUser) {
            return {
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
        }
        // If neither exists, return null (will show loading state)
        return null;
    }, [profileUser, currentUser]);

    // Sync activeTab with URL pathname (only when URL changes externally, not from user tab click)
    useEffect(() => {
        // Skip if we're in the middle of a user-initiated tab change
        if (skipUrlSyncRef.current) {
            return;
        }
        
        // Skip if this change was initiated by user clicking a tab
        if (isTabChangeFromUser.current) {
            isTabChangeFromUser.current = false;
            return;
        }
        
        // Only update if the tab from URL is different from current active tab
        const targetTab = tabFromPath || TABS.PHOTOS;
        if (targetTab === activeTab) {
            return;
        }

        if (tabFromPath) {
            // Validate tab from URL
            if (['following', 'followers', 'collections', 'stats'].includes(tabFromPath)) {
                // Check if stats tab is only accessible for own profile
                if (tabFromPath === 'stats' && !isOwnProfile) {
                    // Redirect to base profile URL if trying to access stats on someone else's profile
                    if (usernameFromPath) {
                        navigate(`/@${usernameFromPath}`, { replace: true });
                    }
                    setActiveTab(TABS.PHOTOS);
                } else {
                    setActiveTab(tabFromPath as TabType);
                }
            } else {
                setActiveTab(TABS.PHOTOS);
            }
        } else {
            // No tab in URL, default to photos
            setActiveTab(TABS.PHOTOS);
        }
    }, [tabFromPath, isOwnProfile, usernameFromPath, navigate, activeTab]);

    // Statistics tab - Only allow access for own profile (fallback check)
    useEffect(() => {
        if (activeTab === TABS.STATS && !isOwnProfile) {
            setActiveTab(TABS.PHOTOS);
            // Update URL to remove stats tab
            if (usernameFromPath) {
                navigate(`/@${usernameFromPath}`, { replace: true });
            }
        }
    }, [activeTab, isOwnProfile, usernameFromPath, navigate]);

    // Scroll to top immediately when tab changes (not smooth scroll)
    // Use useLayoutEffect to ensure scroll happens after DOM updates but before paint
    // This prevents flash by scrolling synchronously before browser paints
    useLayoutEffect(() => {
        // Use requestAnimationFrame to ensure scroll happens after layout but before paint
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
    }, [activeTab]);

    // Handler for tab changes that updates URL
    const handleTabChange = useCallback((tab: TabType) => {
        // Set flag to skip URL sync for this change
        skipUrlSyncRef.current = true;
        
        // Mark tab as visited (so we don't show loading on subsequent visits)
        loadedTabs.current.add(tab);
        
        // Update active tab immediately (no waiting for URL sync)
        setActiveTab(tab);
        
        // Update URL based on tab
        if (!usernameFromPath) {
            skipUrlSyncRef.current = false;
            return;
        }
        
        const baseUrl = `/@${usernameFromPath}`;
        let newUrl = baseUrl;
        
        if (tab === TABS.PHOTOS) {
            // Photos tab - base URL (no tab in URL)
            newUrl = baseUrl;
        } else if (['following', 'followers', 'collections', 'stats'].includes(tab)) {
            // Other tabs - add tab to URL
            // Only allow stats tab if it's own profile
            if (tab === TABS.STATS && !isOwnProfile) {
                newUrl = baseUrl;
            } else {
                newUrl = `${baseUrl}/${tab}`;
            }
        }
        
        // Update URL using window.history to avoid React Router re-renders
        if (window.location.pathname !== newUrl) {
            // Update previous pathname before changing URL
            previousPathname.current = newUrl;
            
            // Use window.history.replaceState to update URL without triggering navigation
            window.history.replaceState(null, '', newUrl);
        }
        
        // Reset flag after a brief delay to allow any pending effects to skip
        setTimeout(() => {
            skipUrlSyncRef.current = false;
        }, 50);
    }, [usernameFromPath, isOwnProfile]);

    // Reset all state immediately when params change to prevent flashing old data
    // Only reset when username/userId changes, NOT when just the tab changes
    useEffect(() => {
        // Create a unique key from params to detect changes (exclude tab from pathname)
        const paramsKey = `${params.username || usernameFromPath || ''}-${params.userId || ''}`;

        // Only reset if params actually changed (not on initial mount)
        // Skip if this is just a tab change (username/userId hasn't changed)
        if (previousParams.current && previousParams.current !== paramsKey) {
            // Mark that we're switching profiles
            setIsSwitchingProfile(true);

            // Clear the stats user ID ref so old data won't be shown
            setStatsUserId(undefined);

            // Clear all profile-related state immediately when switching users
            clearProfile();
            clearImages();
            processedImages.current.clear();
            // Clear loaded tabs when switching profiles
            loadedTabs.current.clear();
            
            // Reset active tab to photos when switching profiles (unless it's own profile and stats is valid)
            if (activeTab === TABS.STATS) {
                setActiveTab(TABS.PHOTOS);
            }
        }

        // Update the ref for next comparison (on initial mount, this will be set)
        if (!previousParams.current || previousParams.current !== paramsKey) {
            previousParams.current = paramsKey;
        }
    }, [params.username, params.userId, usernameFromPath, clearProfile, clearImages, activeTab]);

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
            // Mark photos tab as loaded when images are fetched (even if empty)
            loadedTabs.current.add(TABS.PHOTOS);
        } catch (_error) {
            // Error already handled in store
        }
    }, [displayUserId, fetchUserImages, updateStatsUserIdIfSame]);

    // Calculate display images based on active tab
    const displayImages = useMemo(() => {
        if (activeTab === TABS.PHOTOS) {
            const filtered = images.filter(img => {
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
            
            // Sort: pinned images first, then unpinned
            // Mark images as pinned for styling
            const pinnedImageIds = new Set((displayUser?.pinnedImages || []).map(img => img._id));
            return filtered
                .map(img => ({
                    ...img,
                    isPinned: pinnedImageIds.has(img._id)
                }))
                .sort((a, b) => {
                    const aIsPinned = pinnedImageIds.has(a._id);
                    const bIsPinned = pinnedImageIds.has(b._id);
                    if (aIsPinned && !bIsPinned) return -1;
                    if (!aIsPinned && bIsPinned) return 1;
                    return 0;
                });
        }
        return [];
    }, [activeTab, images, displayUser?.pinnedImages]);

    // Handle image click - navigate to ImagePage
    const handleImageClick = useCallback((image: Image, _index: number) => {
        const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
        const targetPath = `/photos/${slug}`;
        
        // Mobile: full page navigation
        if (isMobile) {
            navigate(targetPath, {
                // Pass displayImages + clicked image
                state: { images: displayImages, image, fromGrid: true }
            });
            return;
        }
        
        // Desktop: modal-style with background
        // 1. Save scroll position using unified utility
        saveScrollPosition();
        
        // 2. Set modal active flag (required for validation)
        setModalActive();
        
        // 3. Prepare modal navigation state
        // CRITICAL: backgroundLocation must be a proper Location object
        const backgroundLocation = {
            pathname: actualLocation?.pathname || (displayUser?.username ? `/@${displayUser.username}` : `/profile/user/${displayUserId}`),
            search: actualLocation?.search || '',
            hash: actualLocation?.hash || '',
            state: null,
            key: actualLocation?.key || 'default', // Use 'default' instead of empty string
        };
        const modalState = prepareModalNavigationState(backgroundLocation);
        
        // 4. Navigate with modal state
        navigate(targetPath, {
            // Include clicked image for fast modal open
            state: { ...modalState, images: displayImages, image, fromGrid: true }
        });
    }, [navigate, displayImages, actualLocation, isMobile, displayUser, displayUserId]);

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
                userStatsService.trackProfileView(displayUserId).catch(() => {
                    // Silently fail - background tracking is non-critical
                });
                sessionStorage.setItem(`${appConfig.storage.profileViewKeyPrefix}${displayUserId}_${currentUser._id}`, 'true');
            }
        }
    }, [displayUserId, currentUser?._id, isOwnProfile]);

    // Cancel requests when displayUserId changes
    const cancelSignal = useRequestCancellationOnChange([displayUserId]);

    // Load data callback for NoFlashGrid
    const loadData = useCallback(async () => {
        await fetchUserImagesWrapper(false, cancelSignal);
    }, [fetchUserImagesWrapper, cancelSignal]);

    // Load more images (infinite scroll)
    const loadMore = useCallback(async () => {
        if (!pagination || pagination.page >= pagination.pages) return;
        await fetchUserImages(displayUserId || '', false, cancelSignal, pagination.page + 1);
    }, [fetchUserImages, pagination, displayUserId, cancelSignal]);

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
            // Silently handle cancellation errors - these are expected when navigating away
        });

        return undefined;
    }, [displayUserId, fetchUserImagesWrapper, fetchFollowStatsWrapper, cancelSignal]);

    // Lazy-load collections only when collections tab is active
    useEffect(() => {
        if (activeTab === TABS.COLLECTIONS && !collectionsLoading && collections.length === 0 && displayUserId) {
            fetchCollectionsWrapper(cancelSignal);
        }
        // Mark collections tab as loaded when fetch completes (even if empty)
        if (activeTab === TABS.COLLECTIONS && !collectionsLoading) {
            loadedTabs.current.add(TABS.COLLECTIONS);
        }
    }, [activeTab, displayUserId, fetchCollectionsWrapper, cancelSignal, collectionsLoading, collections.length]);

    // Lazy-load stats only when stats tab is active
    useEffect(() => {
        if (activeTab === TABS.STATS && !userStats && displayUserId) {
            fetchUserStatsWrapper(cancelSignal);
        }
        // Mark stats tab as loaded when data is available
        if (activeTab === TABS.STATS && userStats) {
            loadedTabs.current.add(TABS.STATS);
        }
    }, [activeTab, displayUserId, fetchUserStatsWrapper, cancelSignal, userStats]);

    // Listen for refresh event after image upload
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        const handleRefresh = (event: Event) => {
            const customEvent = event as CustomEvent<{ optimisticImages?: Image[] }>;
            const optimisticImages = customEvent.detail?.optimisticImages;
            
            // Add images optimistically for instant UI update
            if (optimisticImages && optimisticImages.length > 0 && isOwnProfile) {
                const { addImagesOptimistically } = useUserImageStore.getState();
                addImagesOptimistically(optimisticImages);
            }
            
            // Debounce API fetch to avoid multiple rapid calls
            // Clear any pending refresh
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            
            // Schedule refresh after a short delay (allows multiple events to batch)
            refreshTimeoutRef.current = setTimeout(() => {
                refreshTimeoutRef.current = null;
                // Force fresh fetch with cache-busting (syncs with backend)
                // Don't use cancelSignal for refresh - this is a manual refresh action
                fetchUserImagesWrapper(true); // Pass true to enable cache-busting, no signal for manual refresh
                if (isOwnProfile) {
                    fetchCollectionsWrapper(); // Also refresh collections, no signal for manual refresh
                }
            }, 300); // Small delay to batch multiple rapid refreshes
        };

        window.addEventListener('refreshProfile', handleRefresh);
        return () => {
            window.removeEventListener('refreshProfile', handleRefresh);
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
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
    }, [displayUser, profileUser, updateFollowCounts]);

    // Follow/Unfollow handler
    const [isFollowingLoading, setIsFollowingLoading] = useState(false);
    const handleFollowToggle = useCallback(async () => {
        if (!displayUserId) {
            toast.error('User ID not found');
            return;
        }

        if (isOwnProfile) {
            return;
        }

        if (isFollowingLoading) {
            return;
        }

        if (!displayUser) {
            toast.error('User information not available');
            return;
        }

        // Validate displayUserId is a valid MongoDB ObjectId format
        if (!/^[0-9a-fA-F]{24}$/.test(displayUserId)) {
            toast.error(t('follow.error') || 'Invalid user ID');
            return;
        }
        
        setIsFollowingLoading(true);
        
        try {
            const userName = displayUser.displayName || displayUser.username;
            
            // First, get the current follow status from the server to ensure we have the correct state
            const followStatus = await followService.getFollowStatus(displayUserId);
            const isCurrentlyFollowing = followStatus.isFollowing || false;
            
            // Now perform the opposite action
            let response;
            if (isCurrentlyFollowing) {
                response = await followService.unfollowUser(displayUserId);
                toast.success(t('follow.unfollowed', { name: userName }) || 'Unfollowed successfully');
            } else {
                response = await followService.followUser(displayUserId);
                toast.success(t('follow.followed', { name: userName }) || 'Followed successfully');
            }
            
            // Update counts from response (optimistic update)
            if (response.followersCount !== undefined || response.followingCount !== undefined) {
                updateFollowCounts(displayUserId, {
                    followersCount: response.followersCount,
                    followingCount: response.followingCount,
                });
                
                // Update followStats in profile store
                useProfileStore.setState((state) => {
                    if (response.followersCount !== undefined) {
                        state.followStats.followers = response.followersCount;
                    }
                    if (response.followingCount !== undefined) {
                        state.followStats.following = response.followingCount;
                    }
                });
            }
            
            // Always refresh follow stats to get accurate counts and state from server
            await fetchFollowStatsWrapper(cancelSignal);
        } catch (error: any) {
            // Extract error message and error code from API response
            const errorCode = error?.response?.data?.errorCode;
            const errorMessage = error?.response?.data?.message || error?.message;
            
            // Handle specific error cases gracefully
            if (errorCode === 'ALREADY_FOLLOWING' || errorMessage?.toLowerCase().includes('already following')) {
                // State was out of sync - user is already following, update state and refresh stats
                useProfileStore.setState((state) => {
                    state.followStats.isFollowing = true;
                });
                await fetchFollowStatsWrapper(cancelSignal);
                // Don't show error toast for state sync issues
            } else if (errorCode === 'NOT_FOLLOWING' || errorMessage?.toLowerCase().includes('not following')) {
                // State was out of sync - user is not following, update state and refresh stats
                useProfileStore.setState((state) => {
                    state.followStats.isFollowing = false;
                });
                await fetchFollowStatsWrapper(cancelSignal);
                // Don't show error toast for state sync issues
            } else if (errorCode === 'CANNOT_FOLLOW_SELF' || errorMessage?.toLowerCase().includes('cannot follow yourself')) {
                // User trying to follow themselves
                toast.error(t('follow.error') || 'You cannot follow yourself');
                await fetchFollowStatsWrapper(cancelSignal);
            } else if (errorCode === 'INVALID_ID' || errorMessage?.toLowerCase().includes('invalid user id')) {
                // Invalid user ID
                toast.error(t('follow.error') || 'Invalid user ID');
                await fetchFollowStatsWrapper(cancelSignal);
            } else if (errorCode === 'USER_NOT_FOUND' || errorMessage?.toLowerCase().includes('user not found')) {
                // User not found
                toast.error(t('follow.error') || 'User not found');
                await fetchFollowStatsWrapper(cancelSignal);
            } else {
                // Show error for other issues
                const displayMessage = errorMessage || t('follow.error') || 'An error occurred. Please try again.';
                toast.error(displayMessage);
                // Refresh to get correct state from server
                await fetchFollowStatsWrapper(cancelSignal);
            }
        } finally {
            setIsFollowingLoading(false);
        }
    }, [displayUserId, displayUser, isOwnProfile, isFollowingLoading, fetchFollowStatsWrapper, cancelSignal, t, updateFollowCounts]);

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


    // Get current image IDs for comparison


    // Cleanup processedImages when component unmounts or displayUserId changes
    useEffect(() => {
        return () => {
            // Cleanup on unmount
            processedImages.current.clear();
        };
    }, [displayUserId]);



    if (profileUserLoading) {
        return (
            <>
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
                        onTabChange={handleTabChange}
                        onFollowToggle={handleFollowToggle}
                        isFollowingLoading={isFollowingLoading}
                    />

                    {/* Navigation Tabs */}
                    <ProfileTabs
                        activeTab={activeTab}
                        photosCount={photosCount}
                        followingCount={(() => {
                            // Use store count if available, otherwise fall back to followStats
                            const storeCounts = displayUserId ? getFollowCounts(displayUserId) : null;
                            return storeCounts?.followingCount ?? followStats.following;
                        })()}
                        followersCount={(() => {
                            // Use store count if available, otherwise fall back to followStats
                            const storeCounts = displayUserId ? getFollowCounts(displayUserId) : null;
                            return storeCounts?.followersCount ?? followStats.followers;
                        })()}
                        collectionsCount={collectionsCount}
                        onTabChange={handleTabChange}
                        isOwnProfile={isOwnProfile}
                    />

                    {/* Content Area */}
                    <div className="profile-content">
                        {/* Photos Tab - Keep mounted to preserve state */}
                        <div style={{ display: activeTab === TABS.PHOTOS ? 'block' : 'none' }}>
                            {loading && displayImages.length === 0 && !loadedTabs.current.has(TABS.PHOTOS) ? (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <div className="flex items-center justify-center py-12">
                                        <LoadingSpinner size="large" />
                                    </div>
                                </div>
                            ) : displayImages.length === 0 ? (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>{t('profile.noPhotos')}</p>
                                    {isOwnProfile && (
                                        <Button
                                            variant="outline"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setUploadModalOpen(true);
                                            }}
                                            className="mt-4"
                                        >
                                            {t('upload.addImage')}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <NoFlashGrid
                                    images={displayImages}
                                    loading={loading}
                                    onLoadData={loadData}
                                    onImageClick={handleImageClick}
                                    pagination={pagination}
                                    onLoadMore={loadMore}
                                />
                            )}
                        </div>

                        {/* Following Tab - Keep mounted to preserve state */}
                        {displayUserId && (
                            <div style={{ display: activeTab === TABS.FOLLOWING ? 'block' : 'none' }}>
                                <UserList 
                                    userId={displayUserId} 
                                    mode="following" 
                                    skipLoading={loadedTabs.current.has(TABS.FOLLOWING)}
                                />
                            </div>
                        )}

                        {/* Followers Tab - Keep mounted to preserve state */}
                        {displayUserId && (
                            <div style={{ display: activeTab === TABS.FOLLOWERS ? 'block' : 'none' }}>
                                <UserList 
                                    userId={displayUserId} 
                                    mode="followers" 
                                    skipLoading={loadedTabs.current.has(TABS.FOLLOWERS)}
                                />
                            </div>
                        )}

                        {/* Collections Tab - Keep mounted to preserve state */}
                        <div style={{ display: activeTab === TABS.COLLECTIONS ? 'block' : 'none' }}>
                            {collectionsLoading && !loadedTabs.current.has(TABS.COLLECTIONS) ? (
                                <div className="collections-grid" aria-label={t('profile.loadingCollections')} aria-live="polite">
                                    {Array.from({ length: uiConfig.skeleton.collectionGridCount }).map((_, index) => (
                                        <div key={`skeleton-${index}`} className="collection-card">
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
                                <div className="collections-grid">
                                    {collections.map((collection) => {
                                        const coverImage =
                                            collection.coverImage &&
                                                typeof collection.coverImage === 'object'
                                                ? collection.coverImage
                                                : null;

                                        // Get sample images (2-3 images for thumbnails)
                                        // Filter out coverImage to avoid duplicates
                                        const allSampleImages = collection.sampleImages && Array.isArray(collection.sampleImages)
                                            ? collection.sampleImages.filter((img): img is Image => 
                                                typeof img === 'object' && img !== null && '_id' in img
                                            )
                                            : [];
                                        
                                        // Exclude coverImage from thumbnails to avoid showing the same image twice
                                        const coverImageId = coverImage?._id;
                                        const sampleImages = coverImageId
                                            ? allSampleImages.filter(img => img._id !== coverImageId)
                                            : allSampleImages;

                                        // Get creator name
                                        const creatorName = typeof collection.createdBy === 'object' 
                                            ? collection.createdBy.displayName || collection.createdBy.username
                                            : displayUser?.displayName || displayUser?.username || 'You';

                                        return (
                                            <div
                                                key={collection._id}
                                                className="collection-card"
                                                onClick={() => navigate(`/collections/${collection._id}`)}
                                            >
                                                <div className="collection-card-cover">
                                                    <div className={`collection-card-images ${sampleImages.length < 2 ? 'no-thumbnails' : ''}`}>
                                                        {/* Main large image on the left */}
                                                        <div className="collection-card-main-image">
                                                            {coverImage ? (
                                                                <BlurUpImage
                                                                    image={coverImage}
                                                                    priority={false}
                                                                    minimal={true}
                                                                />
                                                            ) : (
                                                                <div className="collection-card-placeholder">
                                                                    <Folder size={48} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Smaller thumbnails on the right (stacked) - only show if we have 2+ sample images */}
                                                        {sampleImages.length >= 2 && (
                                                            <div className="collection-card-thumbnails">
                                                                {sampleImages.slice(0, 2).map((img, idx) => (
                                                                    <div key={img._id || idx} className="collection-card-thumbnail">
                                                                        <BlurUpImage
                                                                            image={img}
                                                                            priority={false}
                                                                            minimal={true}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="collection-card-info">
                                                    <div className="collection-card-header">
                                                        <h3 className="collection-card-title">
                                                            {collection.name}
                                                            {!collection.isPublic && (
                                                                <Lock size={14} className="collection-card-lock-icon" />
                                                            )}
                                                        </h3>
                                                    </div>
                                                    <div className="collection-card-meta">
                                                        <span className="collection-card-meta-text">
                                                            {collection.imageCount || 0} {collection.imageCount === 1 ? t('collections.image') : t('collections.images')} · {t('collections.curatedBy', { name: creatorName })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Stats Tab - Keep mounted to preserve state */}
                        <div style={{ display: activeTab === TABS.STATS ? 'block' : 'none' }}>
                            {isOwnProfile ? (
                                <Suspense fallback={
                                    loadedTabs.current.has(TABS.STATS) ? null : (
                                        <div className="empty-state" role="status" aria-live="polite">
                                            <Skeleton className="h-64 w-full" />
                                        </div>
                                    )
                                }>
                                    <UserAnalyticsDashboard />
                                </Suspense>
                            ) : (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>{t('profile.statsPrivate') || 'Statistics are private and only visible to the account owner.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>


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

            {/* Upload Modal - Lazy loaded, only render when open */}
            {uploadModalOpen && (
                <Suspense fallback={null}>
                    <UploadModal
                        isOpen={uploadModalOpen}
                        onClose={() => {
                            setUploadModalOpen(false);
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}

export default ProfilePage;
