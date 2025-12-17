import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Image from '../models/Image.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';

export const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({ isActive: true })
        .select('_id name description')
        .sort({ name: 1 })
        .lean();

    res.status(200).json({
        categories,
    });
});

export const getAllCategoriesAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewCategories') middleware

    const categories = await Category.find()
        .sort({ name: 1 })
        .lean();

    // Get image count for each category
    const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
            const count = await Image.countDocuments({ imageCategory: category._id });
            return {
                ...category,
                imageCount: count,
            };
        })
    );

    res.status(200).json({
        categories: categoriesWithCounts,
    });
});

export const createCategory = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('createCategories') middleware

    const { name, description } = req.body;

    if (!name || String(name).trim().length === 0) {
        return res.status(400).json({
            message: 'Tên danh mục không được để trống',
        });
    }

    // Check if category already exists (escape user input for regex)
    const escapedName = String(name || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });

    if (existingCategory) {
        return res.status(400).json({
            message: 'Danh mục đã tồn tại với tên này',
        });
    }

    const category = await Category.create({
        name: name.trim(),
        description: description?.trim() || '',
        isActive: true,
    });

    // Clear cache for categories endpoint
    clearCache('/api/categories');

    res.status(201).json({
        message: 'Tạo danh mục thành công',
        category,
    });
});

export const updateCategory = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('editCategories') middleware

    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
    }
    const { name, description, isActive } = req.body;

    const category = await Category.findById(categoryId);

    if (!category) {
        return res.status(404).json({
            message: 'Không tìm thấy danh mục',
        });
    }

    const updateData = {};

    // Update name if provided
    if (name !== undefined && String(name || '').trim() !== category.name) {
        const newName = String(name || '').trim();

        // Check if new name already exists
        const escapedNewName = String(newName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${escapedNewName}$`, 'i') },
            _id: { $ne: categoryId },
        });

        if (existingCategory) {
            return res.status(400).json({
                message: 'Danh mục đã tồn tại với tên này',
            });
        }

        // When category name changes, we need to update the category document itself
        // Images are already linked by reference, so they will automatically use the new name
        // No need to update images - they reference the category by ID, not name

        updateData.name = newName;
    }

    if (description !== undefined) {
        updateData.description = String(description || '').trim() || '';
    }

    if (isActive !== undefined) {
        updateData.isActive = isActive;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        updateData,
        { new: true, runValidators: true }
    );

    // Clear cache for categories and images endpoints (category changes affect image queries)
    clearCache('/api/categories');
    clearCache('/api/images');

    res.status(200).json({
        message: 'Tạo mới hoặc cập nhật danh mục thành công',
        category: updatedCategory,
    });
});

export const deleteCategory = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('deleteCategories') middleware

    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
        return res.status(404).json({
            message: 'Không tìm thấy danh mục',
        });
    }

    // Check if category is used by any images
    const imageCount = await Image.countDocuments({ imageCategory: category._id });

    if (imageCount > 0) {
        return res.status(400).json({
            message: `Không thể xoá danh mục này. Hiện đang có ${imageCount} ảnh đang dùng danh mục này. Vui lòng cập nhật danh mục mới hoặc xoá các ảnh này trước.`,
        });
    }

    await Category.findByIdAndDelete(categoryId);

    // Clear cache for categories and images endpoints
    clearCache('/api/categories');
    clearCache('/api/images');

    res.status(200).json({
        message: 'Xoá danh mục thành công',
    });
});

