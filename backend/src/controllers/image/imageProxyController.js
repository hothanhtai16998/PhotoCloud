import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { getImageFromR2 } from '../../libs/s3.js';
import Image from '../../models/Image.js';
import mongoose from 'mongoose';

/**
 * Proxy image with proper CORS headers
 * This allows images to load even if CloudFront CORS is misconfigured
 */
export const proxyImage = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const size = req.query.size || 'regular'; // thumbnail, small, regular, original

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({
            message: 'Invalid image ID',
        });
    }

    // Find the image (only fetch needed fields)
    const image = await Image.findById(imageId)
        .select('imageTitle imageUrl thumbnailUrl smallUrl regularUrl videoUrl isVideo')
        .lean();

    if (!image) {
        return res.status(404).json({
            message: 'Image not found',
        });
    }

    try {
        // Map size parameter to image URL
        let imageUrl;
        switch (size.toLowerCase()) {
            case 'thumbnail':
                imageUrl = image.thumbnailUrl || image.smallUrl || image.regularUrl || image.imageUrl;
                break;
            case 'small':
                imageUrl = image.smallUrl || image.regularUrl || image.imageUrl;
                break;
            case 'regular':
                imageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
                break;
            case 'original':
            case 'large':
                imageUrl = image.imageUrl || image.regularUrl || image.smallUrl;
                break;
            case 'video':
                imageUrl = image.videoUrl || image.imageUrl;
                break;
            default:
                imageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
        }

        if (!imageUrl) {
            return res.status(404).json({
                message: 'Image URL not found',
            });
        }

        // Get image from R2
        const r2Response = await getImageFromR2(imageUrl);

        // Set CORS headers - allow all origins
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '3600');

        // Set content type
        res.setHeader('Content-Type', r2Response.ContentType || 'image/jpeg');
        
        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Stream the image
        r2Response.Body.pipe(res);
    } catch (error) {
        console.error('Error proxying image:', error);
        return res.status(500).json({
            message: 'Failed to load image',
        });
    }
});

