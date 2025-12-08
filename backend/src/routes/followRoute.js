import express from 'express';
import {
    followUser,
    unfollowUser,
    getFollowing,
    getFollowers,
    getUserFollowStats,
    getFollowStatus,
    getUserFollowing,
    getUserFollowers,
} from '../controllers/followController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// IMPORTANT: Specific routes must come before parameterized routes
// Get users that current user is following
router.get('/following', protectedRoute, getFollowing);

// Get users that follow current user
router.get('/followers', protectedRoute, getFollowers);

// Get users that a specific user is following (public endpoint)
router.get('/:userId/following', getUserFollowing);

// Get users that are following a specific user (public endpoint)
router.get('/:userId/followers', getUserFollowers);

// Follow a user
router.post('/:userId', protectedRoute, followUser);

// Unfollow a user
router.delete('/:userId', protectedRoute, unfollowUser);

// Get follow stats for a specific user (public endpoint)
router.get('/:userId/stats', getUserFollowStats);

// Check if current user is following a specific user
router.get('/:userId/status', protectedRoute, getFollowStatus);

export default router;

