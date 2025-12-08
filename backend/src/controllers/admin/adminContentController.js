import mongoose from 'mongoose';
import User from '../../models/User.js';
import Image from '../../models/Image.js';
import SystemLog from '../../models/SystemLog.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

// Favorites Management
export const getAllFavorites = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageFavorites') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    // Build query
    let userQuery = {};
    if (search) {
        const esc = escapeRegex(search);
        userQuery = {
            $or: [
                { username: { $regex: esc, $options: 'i' } },
                { displayName: { $regex: esc, $options: 'i' } },
                { email: { $regex: esc, $options: 'i' } },
            ],
        };
    }

    // Get users with favorites
    const users = await User.find(userQuery)
        .select('username displayName email favorites')
        .populate('favorites', 'imageTitle imageUrl uploadedBy')
        .lean();

    // Flatten favorites with user info
    const allFavorites = [];
    users.forEach(user => {
        if (user.favorites && user.favorites.length > 0) {
            user.favorites.forEach(fav => {
                if (fav && typeof fav === 'object') {
                    allFavorites.push({
                        _id: `${user._id}_${fav._id}`,
                        user: {
                            _id: user._id,
                            username: user.username,
                            displayName: user.displayName,
                            email: user.email,
                        },
                        image: fav,
                        createdAt: fav.createdAt || new Date(),
                    });
                }
            });
        }
    });

    // Sort by date (newest first)
    allFavorites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const total = allFavorites.length;
    const paginatedFavorites = allFavorites.slice(skip, skip + limit);

    res.json({
        favorites: paginatedFavorites,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const deleteFavorite = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageFavorites') middleware

    const { userId, imageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid userId or imageId' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy người dùng',
        });
    }

    // Remove favorite
    await User.findByIdAndUpdate(userId, {
        $pull: { favorites: imageId },
    });

    // Log action
    await SystemLog.create({
        level: 'info',
        message: `Admin removed favorite: image ${imageId} from user ${userId}`,
        userId: req.user._id,
        action: 'deleteFavorite',
        metadata: { targetUserId: userId, imageId },
    });

    res.json({
        message: 'Đã xóa yêu thích thành công',
    });
});

// Content Moderation
export const getPendingContent = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('moderateContent') middleware

    // Get images with moderationStatus 'pending' or without moderationStatus
    const images = await Image.find({
        $or: [
            { moderationStatus: 'pending' },
            { moderationStatus: { $exists: false } },
        ],
    })
        .populate('uploadedBy', 'username displayName')
        .populate('imageCategory', 'name')
        .sort({ createdAt: -1 })
        .lean();

    res.json({
        content: images.map(img => ({
            _id: img._id,
            title: img.imageTitle,
            content: img.imageTitle, // For now, use title as content
            uploadedBy: img.uploadedBy,
            status: img.moderationStatus || 'pending',
            createdAt: img.createdAt,
            imageUrl: img.imageUrl,
            category: img.imageCategory,
        })),
    });
});

export const approveContent = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('moderateContent') middleware

    const { contentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return res.status(400).json({ message: 'Invalid content ID' });
    }

    const image = await Image.findById(contentId);
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy nội dung',
        });
    }

    // Update moderation status to approved
    image.moderationStatus = 'approved';
    image.isModerated = true;
    image.moderatedAt = new Date();
    image.moderatedBy = req.user._id;
    await image.save();

    // Log action
    await SystemLog.create({
        level: 'info',
        message: `Content approved: ${contentId}`,
        userId: req.user._id,
        action: 'approveContent',
        metadata: { contentId },
    });

    res.json({
        message: 'Đã duyệt nội dung thành công',
    });
});

export const rejectContent = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('moderateContent') middleware

    const { contentId } = req.params;
    const { reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return res.status(400).json({ message: 'Invalid content ID' });
    }

    const image = await Image.findById(contentId);
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy nội dung',
        });
    }

    // Update moderation status to rejected
    image.moderationStatus = 'rejected';
    image.isModerated = true;
    image.moderatedAt = new Date();
    image.moderatedBy = req.user._id;
    if (reason) {
        const reasonStr = String(reason);
        image.moderationNotes = reasonStr;
    }
    await image.save();

    // Log action
    await SystemLog.create({
        level: 'info',
        message: `Content rejected: ${contentId}${reason ? ` - Reason: ${String(reason)}` : ''}`,
        userId: req.user._id,
        action: 'rejectContent',
        metadata: { contentId, reason: reason ? String(reason) : undefined },
    });

    res.json({
        message: 'Đã từ chối nội dung',
    });
});

