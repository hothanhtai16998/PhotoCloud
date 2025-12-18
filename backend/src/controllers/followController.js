import { asyncHandler } from '../middlewares/asyncHandler.js';
import mongoose from 'mongoose';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { logger } from '../utils/logger.js';

/**
 * Follow a user
 * POST /api/follows/:userId
 */
export const followUser = asyncHandler(async (req, res) => {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
            errorCode: 'INVALID_ID',
        });
    }
    // Validate that user is not trying to follow themselves
    if (followerId.toString() === followingId) {
        return res.status(400).json({
            success: false,
            message: 'You cannot follow yourself',
            errorCode: 'CANNOT_FOLLOW_SELF',
        });
    }

    // Validate that the user to follow exists
    const userToFollow = await User.findById(followingId);
    if (!userToFollow) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
        follower: followerId,
        following: followingId,
    });

    if (existingFollow) {
        return res.status(400).json({
            success: false,
            message: 'You are already following this user',
            errorCode: 'ALREADY_FOLLOWING',
        });
    }

    // Create follow relationship
    const follow = await Follow.create({
        follower: followerId,
        following: followingId,
    });

    // Update cached counts
    await Promise.all([
        // Increment followingCount for the follower
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
        // Increment followersCount for the user being followed
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }),
    ]);

    // Get updated counts
    const [followerUser, followingUser] = await Promise.all([
        User.findById(followerId).select('followingCount').lean(),
        User.findById(followingId).select('followersCount').lean(),
    ]);

    // Create notification for the user being followed
    try {
        const { createAndEmitNotification } = await import('../utils/notificationEmitter.js');
        await createAndEmitNotification({
            recipient: followingId,
            type: 'user_followed',
            actor: followerId,
        });
    } catch (notifError) {
        logger.error('Failed to create follow notification:', notifError);
        // Don't fail the main operation if notification fails
    }

    // Emit WebSocket events for real-time updates
    try {
        const { emitUserFollowUpdate } = await import('../utils/socketServer.js');
        
        // Emit to the user being followed (their followersCount increased)
        emitUserFollowUpdate(followingId, {
            userId: followingId,
            followersCount: followingUser?.followersCount ?? 0,
            actorId: followerId.toString(),
            action: 'followed',
        });
        
        // Emit to the follower (their followingCount increased)
        emitUserFollowUpdate(followerId, {
            userId: followerId,
            followingCount: followerUser?.followingCount ?? 0,
            actorId: followerId.toString(),
            action: 'followed',
        });
    } catch (wsError) {
        logger.error('Failed to emit follow update via WebSocket:', wsError);
        // Don't fail the request if WebSocket fails
    }

    logger.info('User followed', {
        followerId,
        followingId,
        followersCount: followingUser?.followersCount,
        followingCount: followerUser?.followingCount,
    });

    res.status(201).json({
        success: true,
        message: 'User followed successfully',
        follow: {
            _id: follow._id,
            follower: followerId,
            following: followingId,
            createdAt: follow.createdAt,
        },
        followersCount: followingUser?.followersCount,
        followingCount: followerUser?.followingCount,
    });
});

/**
 * Unfollow a user
 * DELETE /api/follows/:userId
 */
export const unfollowUser = asyncHandler(async (req, res) => {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
            errorCode: 'INVALID_ID',
        });
    }

    // Find and delete the follow relationship
    const follow = await Follow.findOneAndDelete({
        follower: followerId,
        following: followingId,
    });

    if (!follow) {
        return res.status(404).json({
            success: false,
            message: 'You are not following this user',
            errorCode: 'NOT_FOLLOWING',
        });
    }

    // Update cached counts
    await Promise.all([
        // Decrement followingCount for the follower
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
        // Decrement followersCount for the user being unfollowed
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } }),
    ]);

    // Get updated counts
    const [followerUser, followingUser] = await Promise.all([
        User.findById(followerId).select('followingCount').lean(),
        User.findById(followingId).select('followersCount').lean(),
    ]);

    // Create notification for the user being unfollowed
    try {
        await Notification.create({
            recipient: followingId,
            type: 'user_unfollowed',
            actor: followerId,
            follow: follow._id,
        });
    } catch (notifError) {
        logger.error('Failed to create unfollow notification:', notifError);
        // Don't fail the main operation if notification fails
    }

    // Emit WebSocket events for real-time updates
    try {
        const { emitUserFollowUpdate } = await import('../utils/socketServer.js');
        
        // Emit to the user being unfollowed (their followersCount decreased)
        emitUserFollowUpdate(followingId, {
            userId: followingId,
            followersCount: followingUser?.followersCount ?? 0,
            actorId: followerId.toString(),
            action: 'unfollowed',
        });
        
        // Emit to the unfollower (their followingCount decreased)
        emitUserFollowUpdate(followerId, {
            userId: followerId,
            followingCount: followerUser?.followingCount ?? 0,
            actorId: followerId.toString(),
            action: 'unfollowed',
        });
    } catch (wsError) {
        logger.error('Failed to emit unfollow update via WebSocket:', wsError);
        // Don't fail the request if WebSocket fails
    }

    logger.info('User unfollowed', {
        followerId,
        followingId,
        followersCount: followingUser?.followersCount,
        followingCount: followerUser?.followingCount,
    });

    res.status(200).json({
        success: true,
        message: 'User unfollowed successfully',
        followersCount: followingUser?.followersCount,
        followingCount: followerUser?.followingCount,
    });
});

/**
 * Get users that the current user is following
 * GET /api/follows/following
 */
export const getFollowing = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get follow relationships
    const follows = await Follow.find({ follower: userId })
        .populate('following', 'username displayName avatarUrl bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Follow.countDocuments({ follower: userId });

    const following = follows.map(follow => ({
        ...follow.following,
        followedAt: follow.createdAt,
    }));

    res.status(200).json({
        success: true,
        following,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Get users that are following the current user
 * GET /api/follows/followers
 */
export const getFollowers = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get follow relationships
    const follows = await Follow.find({ following: userId })
        .populate('follower', 'username displayName avatarUrl bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Follow.countDocuments({ following: userId });

    const followers = follows.map(follow => ({
        ...follow.follower,
        followedAt: follow.createdAt,
    }));

    res.status(200).json({
        success: true,
        followers,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Get follow status for a specific user
 * GET /api/follows/:userId/status
 */
export const getFollowStatus = asyncHandler(async (req, res) => {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
            errorCode: 'INVALID_ID',
        });
    }

    // Check if following
    const isFollowing = await Follow.exists({
        follower: followerId,
        following: followingId,
    });

    // Check if they follow you (mutual follow)
    const isFollowedBy = await Follow.exists({
        follower: followingId,
        following: followerId,
    });

    res.status(200).json({
        success: true,
        isFollowing: !!isFollowing,
        isFollowedBy: !!isFollowedBy,
    });
});

/**
 * Get follow counts for a user
 * GET /api/follows/:userId/counts
 */
export const getFollowCounts = asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
            errorCode: 'INVALID_ID',
        });
    }
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const followingCount = await Follow.countDocuments({ follower: userId });
    const followersCount = await Follow.countDocuments({ following: userId });

    res.status(200).json({
        success: true,
        following: followingCount,
        followers: followersCount,
    });
});

/**
 * Get followers and following for a specific user
 * GET /api/follow/:userId/stats
 */
export const getUserFollowStats = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID', errorCode: 'INVALID_ID' });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const [followersCount, followingCount] = await Promise.all([
        Follow.countDocuments({ following: userId }),
        Follow.countDocuments({ follower: userId }),
    ]);

    // Check if current user is following this user (if authenticated)
    let isFollowing = false;
    if (req.user && req.user._id) {
        const follow = await Follow.findOne({
            follower: req.user._id,
            following: userId,
        });
        isFollowing = !!follow;
    }

    res.status(200).json({
        success: true,
        stats: {
            followers: followersCount,
            following: followingCount,
            isFollowing,
        },
    });
});

/**
 * Get users that a specific user is following
 * GET /api/follows/:userId/following
 */
export const getUserFollowing = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
            errorCode: 'INVALID_ID',
        });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get follow relationships
    const follows = await Follow.find({ follower: userId })
        .populate('following', 'username displayName avatarUrl bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Follow.countDocuments({ follower: userId });

    const following = follows.map(follow => ({
        ...follow.following,
        followedAt: follow.createdAt,
    }));

    res.status(200).json({
        success: true,
        following,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Get users that are following a specific user
 * GET /api/follows/:userId/followers
 */
export const getUserFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
            errorCode: 'INVALID_ID',
        });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get follow relationships
    const follows = await Follow.find({ following: userId })
        .populate('follower', 'username displayName avatarUrl bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Follow.countDocuments({ following: userId });

    const followers = follows.map(follow => ({
        ...follow.follower,
        followedAt: follow.createdAt,
    }));

    res.status(200).json({
        success: true,
        followers,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Delete all follow relationships for ALL accounts (Admin only)
 * DELETE /api/follows/all
 */
export const deleteAllFollows = asyncHandler(async (req, res) => {
    // Delete ALL follow relationships in the database
    const result = await Follow.deleteMany({});

    logger.info('All follows deleted globally', {
        deletedBy: req.user._id,
        totalDeleted: result.deletedCount,
    });

    res.status(200).json({
        success: true,
        message: 'All follow relationships deleted successfully',
        deleted: {
            total: result.deletedCount,
        },
    });
});
