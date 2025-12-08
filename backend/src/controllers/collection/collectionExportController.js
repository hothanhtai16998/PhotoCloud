import mongoose from 'mongoose';
import Collection from '../../models/Collection.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import JSZip from 'jszip';
import axios from 'axios';

/**
 * Track collection share - Create notification for collection owner
 * POST /api/collections/:collectionId/share
 */
export const trackCollectionShare = asyncHandler(async (req, res) => {
    try {
        const { collectionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(collectionId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID' });
        }
        const userId = req.user._id;

        // Find collection
        const collection = await Collection.findById(collectionId)
            .populate('createdBy', '_id')
            .lean();

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Don't notify if user is sharing their own collection
        const createdBy = typeof collection.createdBy === 'object'
            ? collection.createdBy._id
            : collection.createdBy;

        if (createdBy.toString() === userId.toString()) {
            return res.json({
                success: true,
                message: 'Collection share tracked (no notification for own collection)',
            });
        }

        // Create notification for collection owner
        await Notification.create({
            recipient: createdBy,
            type: 'collection_shared',
            collection: collectionId,
            actor: userId,
            metadata: {
                collectionName: collection.name,
            },
        });

        res.json({
            success: true,
            message: 'Collection share tracked',
        });
    } catch (error) {
        logger.error('Error tracking collection share:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track collection share',
        });
    }
});

export const exportCollection = asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    // Find collection and verify ownership or public access
    const collection = await Collection.findOne({
        _id: collectionId,
        $or: [
            { createdBy: userId },
            { isPublic: true },
        ],
    }).populate('images', 'imageUrl imageTitle');

    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy bộ sưu tập',
        });
    }

    if (!collection.images || collection.images.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Bộ sưu tập không có ảnh nào để xuất',
        });
    }

    try {
        const zip = new JSZip();
        const imagePromises = [];

        // Fetch all images and add to ZIP
        for (let i = 0; i < collection.images.length; i++) {
            const image = collection.images[i];
            const imageUrl = image.imageUrl || image.regularUrl || image.smallUrl;

            if (!imageUrl) {
                logger.warn(`Image ${image._id} has no URL, skipping`);
                continue;
            }

            // Fetch image using axios
            const fetchPromise = axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout per image
            })
                .then(response => {
                    return Buffer.from(response.data);
                })
                .then(buffer => {
                    // Generate safe filename
                    const sanitizedTitle = (image.imageTitle || `image-${i + 1}`)
                        .replace(/[^a-z0-9]/gi, '_')
                        .toLowerCase()
                        .substring(0, 50);

                    // Get file extension from URL or default to jpg
                    const urlExtension = imageUrl.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'jpg';
                    const filename = `${sanitizedTitle}.${urlExtension}`;

                    // Add to ZIP
                    zip.file(filename, buffer);
                })
                .catch(error => {
                    logger.error(`Failed to fetch image ${image._id}:`, error);
                    // Continue with other images even if one fails
                });

            imagePromises.push(fetchPromise);
        }

        // Wait for all images to be fetched
        await Promise.all(imagePromises);

        // Generate ZIP file
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        // Set response headers
        const safeCollectionName = collection.name
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .substring(0, 50);
        const filename = `${safeCollectionName}_${Date.now()}.zip`;

        // Set headers (CORS middleware should handle CORS headers, but set explicitly for blob responses)
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', zipBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');

        // Send ZIP file with 200 status
        res.status(200).send(Buffer.from(zipBuffer));
    } catch (error) {
        logger.error('Error exporting collection:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất bộ sưu tập. Vui lòng thử lại.',
        });
    }
});

