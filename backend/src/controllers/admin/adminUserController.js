import mongoose from 'mongoose';
import User from '../../models/User.js';
import Image from '../../models/Image.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { deleteImageFromR2 } from '../../libs/s3.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

// User Management
export const getAllUsers = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewUsers') middleware
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const query = {};
    if (search) {
        const esc = escapeRegex(search);
        query.$or = [
            { username: { $regex: esc, $options: 'i' } },
            { email: { $regex: esc, $options: 'i' } },
            { displayName: { $regex: esc, $options: 'i' } },
        ];
    }

    const [usersRaw, total] = await Promise.all([
        User.find(query)
            .select('-hashedPassword')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(query),
    ]);

    // Enrich users with admin status from AdminRole
    const { enrichUserWithAdminStatus } = await import('../../utils/adminUtils.js');
    const clientIP = req.clientIP || null;
    const users = await Promise.all(
        usersRaw.map(user => enrichUserWithAdminStatus(user, clientIP))
    );

    // Get image counts for all users
    const userIds = users.map(u => u._id);
    const imageCounts = await Image.aggregate([
        { $match: { uploadedBy: { $in: userIds } } },
        { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
    ]);
    const imageCountMap = new Map(imageCounts.map(item => [item._id.toString(), item.count]));

    // Add imageCount to each user
    const usersWithImageCount = users.map(user => ({
        ...user,
        imageCount: imageCountMap.get(user._id.toString()) || 0,
    }));

    res.status(200).json({
        users: usersWithImageCount,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userRaw = await User.findById(userId).select('-hashedPassword').lean();

    if (!userRaw) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Enrich user with admin status from AdminRole
    const { enrichUserWithAdminStatus } = await import('../../utils/adminUtils.js');
    const clientIP = req.clientIP || null;
    const user = await enrichUserWithAdminStatus(userRaw, clientIP);

    // Get user's image count
    const imageCount = await Image.countDocuments({ uploadedBy: userId });

    res.status(200).json({
        user: {
            ...user,
            imageCount,
        },
    });
});

export const updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { displayName, email, bio } = req.body;

    // Permission check is handled by requirePermission('editUsers') middleware

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Prevent non-super admins from updating super admin users (compute from AdminRole)
    const { computeAdminStatus } = await import('../../utils/adminUtils.js');
    const targetUserStatus = await computeAdminStatus(userId);

    if (targetUserStatus.isSuperAdmin && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    const updateData = {};

    if (displayName !== undefined) {
        updateData.displayName = String(displayName || '').trim();
    }

    if (email !== undefined && email !== user.email) {
        const normalizedEmail = String(email).toLowerCase().trim();
        const existingUser = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: userId },
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'Email đã tồn tại',
            });
        }

        updateData.email = normalizedEmail;
    }

    if (bio !== undefined) {
        const bioVal = String(bio || '').trim();
        updateData.bio = bioVal.length ? bioVal : undefined;
    }

    // isAdmin and isSuperAdmin should not be updated through this endpoint
    // Admin roles should be managed through the AdminRole system only

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
    }).select('-hashedPassword');

    res.status(200).json({
        message: 'Cập nhật thành công',
        user: updatedUser,
    });
});

export const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Permission check is handled by requirePermission('deleteUsers') middleware

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Prevent deleting yourself
    if (userId === req.user._id.toString()) {
        return res.status(400).json({
            message: 'Không thể xóa tài khoản của bạn',
        });
    }

    // Prevent non-super admins from deleting super admin users (compute from AdminRole)
    const { computeAdminStatus: computeTargetStatus } = await import('../../utils/adminUtils.js');
    const targetUserStatus = await computeTargetStatus(userId);

    if (targetUserStatus.isSuperAdmin && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    // Get all user's images
    const userImages = await Image.find({ uploadedBy: userId }).select('publicId');

    // Delete images from R2
    for (const image of userImages) {
        try {
            await deleteImageFromR2(image.publicId, 'photo-app-images');
        } catch (error) {
            logger.warn(`Lỗi không thể xoá ảnh ${image.publicId} từ S3:`, error);
        }
    }

    // Delete images from database
    await Image.deleteMany({ uploadedBy: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
        message: 'Xoá tài khoản thành công',
    });
});

// Ban/Unban Users
export const banUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    // Permission check is handled by requirePermission('banUsers') middleware

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Prevent banning yourself
    if (userId === req.user._id.toString()) {
        return res.status(400).json({
            message: 'Không thể cấm tài khoản của bạn',
        });
    }

    // Prevent non-super admins from banning super admin users
    const { computeAdminStatus } = await import('../../utils/adminUtils.js');
    const targetUserStatus = await computeAdminStatus(userId);

    if (targetUserStatus.isSuperAdmin && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    // Ban user
    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    user.banReason = reason !== undefined ? String(reason).trim() || 'Không có lý do' : 'Không có lý do';
    await user.save();

    // Create user_banned_admin notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'user_banned_admin',
            actor: req.user._id,
            metadata: {
                reason: String(user.banReason),
                bannedBy: req.user.displayName || req.user.username,
            },
        });
    } catch (notifError) {
        logger.error('Failed to create user banned notification:', notifError);
        // Don't fail the ban if notification fails
    }

    res.status(200).json({
        message: 'Cấm người dùng thành công',
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            isBanned: user.isBanned,
            bannedAt: user.bannedAt,
            banReason: user.banReason,
        },
    });
});

export const unbanUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Permission check is handled by requirePermission('unbanUsers') middleware

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    if (!user.isBanned) {
        return res.status(400).json({
            message: 'Người dùng này không bị cấm',
        });
    }

    // Unban user
    user.isBanned = false;
    user.bannedAt = undefined;
    user.bannedBy = undefined;
    user.banReason = undefined;
    await user.save();

    // Create user_unbanned_admin notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'user_unbanned_admin',
            actor: req.user._id,
            metadata: {
                unbannedBy: req.user.displayName || req.user.username,
            },
        });
    } catch (notifError) {
        logger.error('Failed to create user unbanned notification:', notifError);
        // Don't fail the unban if notification fails
    }

    res.status(200).json({
        message: 'Bỏ cấm người dùng thành công',
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            isBanned: user.isBanned,
        },
    });
});

