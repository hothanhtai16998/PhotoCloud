import { asyncHandler } from "../../middlewares/asyncHandler.js";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Image from "../../models/Image.js";

const PINNED_IMAGE_FIELDS = '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height';

export const pinImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageId } = req.body;

    if (!imageId) {
        return res.status(400).json({ message: 'Image ID is required' });
    }

    // Validate imageId format
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Check if image exists and belongs to user
    const image = await Image.findById(imageId);
    if (!image) {
        return res.status(404).json({ message: 'Image not found' });
    }

    if (image.uploadedBy.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'You can only pin your own images' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Check if already pinned
    if (user.pinnedImages.includes(imageId)) {
        return res.status(400).json({ message: 'Image is already pinned' });
    }

    // Limit to 6 pinned images
    if (user.pinnedImages.length >= 6) {
        return res.status(400).json({ message: 'Maximum of 6 pinned images allowed' });
    }

    // Add to pinned images
    user.pinnedImages.push(imageId);
    await user.save();

    // Populate pinned images for response
    await user.populate({
        path: 'pinnedImages',
        select: PINNED_IMAGE_FIELDS,
    });

    res.status(200).json({
        success: true,
        message: 'Image pinned successfully',
        pinnedImages: user.pinnedImages,
    });
});

export const unpinImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageId } = req.params;

    if (!imageId) {
        return res.status(400).json({ message: 'Image ID is required' });
    }

    // Validate imageId format
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Check if image is pinned
    if (!user.pinnedImages.includes(imageId)) {
        return res.status(400).json({ message: 'Image is not pinned' });
    }

    // Remove from pinned images
    user.pinnedImages = user.pinnedImages.filter(
        id => id.toString() !== imageId
    );
    await user.save();

    // Populate pinned images for response
    await user.populate({
        path: 'pinnedImages',
        select: PINNED_IMAGE_FIELDS,
    });

    res.status(200).json({
        success: true,
        message: 'Image unpinned successfully',
        pinnedImages: user.pinnedImages,
    });
});

export const getPinnedImages = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user?._id;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId)
        .select('pinnedImages')
        .populate({
            path: 'pinnedImages',
            select: PINNED_IMAGE_FIELDS,
        })
        .lean();

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        pinnedImages: user.pinnedImages || [],
    });
});

export const reorderPinnedImages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageIds } = req.body;

    if (!Array.isArray(imageIds)) {
        return res.status(400).json({ message: 'imageIds must be an array' });
    }

    if (imageIds.length > 6) {
        return res.status(400).json({ message: 'Maximum of 6 pinned images allowed' });
    }

    // Validate all image IDs
    for (const imageId of imageIds) {
        if (!mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ message: `Invalid image ID: ${imageId}` });
        }
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Verify all images belong to user
    const images = await Image.find({ _id: { $in: imageIds } });
    for (const image of images) {
        if (image.uploadedBy.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You can only reorder your own images' });
        }
    }

    // Update pinned images order
    user.pinnedImages = imageIds;
    await user.save();

    // Populate pinned images for response
    await user.populate({
        path: 'pinnedImages',
        select: PINNED_IMAGE_FIELDS,
    });

    res.status(200).json({
        success: true,
        message: 'Pinned images reordered successfully',
        pinnedImages: user.pinnedImages,
    });
});
