import mongoose from 'mongoose';
import Collection from '../../models/Collection.js';
import User from '../../models/User.js';
import Image from '../../models/Image.js';
import Category from '../../models/Category.js';
import AdminRole from '../../models/AdminRole.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

// Collection Management
export const getAllCollectionsAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewCollections') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const query = {};
    if (search) {
        const esc = escapeRegex(search);
        query.$or = [
            { name: { $regex: esc, $options: 'i' } },
            { description: { $regex: esc, $options: 'i' } },
        ];
    }

    const [collections, total] = await Promise.all([
        Collection.find(query)
            .populate('createdBy', 'username displayName email')
            .populate('coverImage', 'imageUrl thumbnailUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Collection.countDocuments(query),
    ]);

    // Add image count to each collection
    const collectionsWithCounts = collections.map(collection => ({
        ...collection,
        imageCount: collection.images?.length || 0,
    }));

    res.status(200).json({
        collections: collectionsWithCounts,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const updateCollectionAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageCollections') middleware

    const { collectionId } = req.params;
    const { name, description, isPublic } = req.body;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ message: 'Invalid collection ID' });
    }

    const collection = await Collection.findById(collectionId);

    if (!collection) {
        return res.status(404).json({
            message: 'Không tìm thấy bộ sưu tập',
        });
    }

    const updateData = {};

    if (name !== undefined) {
        updateData.name = String(name || '').trim();
    }

    if (description !== undefined) {
        updateData.description = description !== undefined ? String(description || '').trim() || undefined : undefined;
    }

    if (isPublic !== undefined) {
        updateData.isPublic = isPublic;
    }

    const updatedCollection = await Collection.findByIdAndUpdate(
        collectionId,
        updateData,
        { new: true, runValidators: true }
    )
        .populate('createdBy', 'username displayName')
        .populate('coverImage', 'imageUrl thumbnailUrl');

    res.status(200).json({
        message: 'Cập nhật bộ sưu tập thành công',
        collection: updatedCollection,
    });
});

// Export Data
export const exportData = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('exportData') middleware

    try {
        // Get all data
        const [users, images, categories, collections, adminRoles] = await Promise.all([
            User.find().select('username email displayName bio phone createdAt updatedAt isAdmin isSuperAdmin').lean(),
            Image.find().populate('uploadedBy', 'username displayName').populate('imageCategory', 'name').select('imageTitle imageCategory imageUrl uploadedBy createdAt updatedAt').lean(),
            Category.find().select('name description createdAt updatedAt').lean(),
            Collection.find().populate('createdBy', 'username displayName').select('name description images createdAt updatedAt createdBy').lean(),
            AdminRole.find().populate('userId', 'username displayName email').populate('grantedBy', 'username displayName').select('userId role permissions grantedBy createdAt updatedAt').lean(),
        ]);

        // Format data for export
        const exportData = {
            exportDate: new Date().toISOString(),
            exportedBy: {
                userId: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName,
            },
            statistics: {
                totalUsers: users.length,
                totalImages: images.length,
                totalCategories: categories.length,
                totalCollections: collections.length,
                totalAdminRoles: adminRoles.length,
            },
            data: {
                users,
                images,
                categories,
                collections,
                adminRoles,
            },
        };

        // Set headers for JSON download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="photoapp-export-${new Date().toISOString().split('T')[0]}.json"`);

        res.json(exportData);
    } catch (error) {
        logger.error('Error exporting data:', error);
        res.status(500).json({
            message: 'Lỗi khi xuất dữ liệu',
            error: error.message,
        });
    }
});

export const deleteCollectionAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageCollections') middleware

    const { collectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ message: 'Invalid collection ID' });
    }

    const collection = await Collection.findById(collectionId);

    if (!collection) {
        return res.status(404).json({
            message: 'Không tìm thấy bộ sưu tập',
        });
    }

    await Collection.findByIdAndDelete(collectionId);

    res.status(200).json({
        message: 'Xoá bộ sưu tập thành công',
    });
});

