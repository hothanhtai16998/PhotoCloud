import mongoose from 'mongoose';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { recordCollectionShare, createCollectionExport } from '../../services/collection/collectionExport.js';
import { logger } from '../../utils/logger.js';

export const trackCollectionShare = asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    try {
        const message = await recordCollectionShare(collectionId, req.user._id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Collection not found' });
        }
        return res.json({ success: true, message });
    } catch (error) {
        logger.error('Error tracking collection share:', error);
        return res.status(500).json({ success: false, message: 'Failed to track collection share' });
    }
});

export const exportCollection = asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    const result = await createCollectionExport(collectionId, req.user._id);
    if (!result.buffer) {
        return res.status(result.status).json({ success: false, message: result.message });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.setHeader('Content-Length', result.buffer.length);
    return res.status(200).send(result.buffer);
});
