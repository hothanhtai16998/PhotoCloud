import { publicUser } from '../../utils/publicUser.js';
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import mongoose from "mongoose";
import User from "../../models/User.js";

export const searchUsers = asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 20);
    const skip = Math.max(0, parseInt(req.query.skip) || 0);

    if (!search || search.length < 2) {
        return res.status(200).json({
            users: [],
            total: 0,
            skip,
            limit,
        });
    }

    // Validate search length
    if (search.length > 100) {
        return res.status(400).json({
            message: "Search query is too long",
        });
    }

    // Escape special regex characters for safety
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    const query = {
        $or: [
            { username: searchRegex },
            { email: searchRegex },
            { displayName: searchRegex },
        ],
    };

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Use lean() for faster queries
    const users = await User.find(query)
        .select('username displayName avatarUrl')
        .skip(skip)
        .limit(limit)
        .lean();

    res.status(200).json({
        users,
        total,
        skip,
        limit,
    });
});

export const authMe = asyncHandler(async (req, res) => {
    const user = req.user;

    return res.status(200).json({
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            phone: user.phone,
            location: user.location,
            website: user.website,
            instagram: user.instagram,
            twitter: user.twitter,
            facebook: user.facebook,
            isOAuthUser: user.isOAuthUser,
            isAdmin: user.isAdmin || false,
            isSuperAdmin: user.isSuperAdmin || false,
            permissions: user.permissions || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
    });
});

export const getUserByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }

    const normalizedUsername = username.toLowerCase();

    const user = await User.findOne({ username: normalizedUsername })
        .select('username displayName avatarUrl bio location website instagram twitter facebook createdAt pinnedImages')
        .populate({
            path: 'pinnedImages',
            select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
        })
        .lean();

    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }

    res.status(200).json({
        user: publicUser(user),
    });
});

export const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
        .select('username displayName avatarUrl bio location website instagram twitter facebook createdAt pinnedImages')
        .populate({
            path: 'pinnedImages',
            select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
        })
        .lean();

    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }

    res.status(200).json({
        user: publicUser(user),
    });
});
