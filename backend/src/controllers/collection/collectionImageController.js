import * as images from '../../services/collection/collectionImages.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';

export const addImageToCollection = asyncHandler(async (req, res) => {
    try {
        const result = await images.addImageToCollection({ collectionId: req.params.collectionId, imageId: req.body.imageId, userId: req.user._id });
        res.json(result);
    } catch (error) {
        if (error instanceof images.CollectionImageError) {
            return res.status(error.status).json(error.details);
        }
        logger.error('Error adding image to collection:', error);
        res.status(500).json({ success: false, message: 'Failed to add image to collection' });
    }
});

export const removeImageFromCollection = asyncHandler(async (req, res) => {
    try {
        const result = await images.removeImageFromCollection({ collectionId: req.params.collectionId, imageId: req.params.imageId, userId: req.user._id });
        res.json(result);
    } catch (error) {
        if (error instanceof images.CollectionImageError) {
            return res.status(error.status).json(error.details);
        }
        logger.error('Error removing image from collection:', error);
        res.status(500).json({ success: false, message: 'Failed to remove image from collection' });
    }
});

export const getCollectionsContainingImage = asyncHandler(async (req, res) => {
    try {
        const result = await images.getCollectionsContainingImage({ imageId: req.params.imageId, userId: req.user._id });
        res.json(result);
    } catch (error) {
        if (error instanceof images.CollectionImageError) {
            return res.status(error.status).json(error.details);
        }
        logger.error('Error fetching collections containing image:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch collections' });
    }
});

export const reorderCollectionImages = asyncHandler(async (req, res) => {
    try {
        const result = await images.reorderCollectionImages({ collectionId: req.params.collectionId, imageIds: req.body.imageIds, userId: req.user._id });
        res.json(result);
    } catch (error) {
        if (error instanceof images.CollectionImageError) {
            return res.status(error.status).json(error.details);
        }
        logger.error('Error reordering collection images:', error);
        res.status(500).json({ success: false, message: 'Failed to reorder images' });
    }
});

