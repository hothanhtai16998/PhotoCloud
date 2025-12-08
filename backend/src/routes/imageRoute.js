import express from 'express';
import {
    uploadImage,
    preUploadImage,
    finalizeImageUpload,
    deletePreUploadedFile,
    getImagesByUserId,
    downloadImage,
    getImageById,
    updateImage,
    replaceImage,
    batchReplaceImages,
    createBulkUploadNotification,
} from '../controllers/imageController.js';
import { proxyImage } from '../controllers/image/imageProxyController.js';
import {
    incrementView,
    incrementDownload,
} from '../controllers/imageStatsController.js';
import {
    getAllImages,
    getLocations,
} from '../controllers/imageSearchController.js';
import { singleUpload, multipleUpload } from '../middlewares/multerMiddleware.js';
import { protectedRoute, optionalAuth } from '../middlewares/authMiddleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.js';
import { validateImageUpload, validateGetImages, validateUserId } from '../middlewares/validationMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// Public route - get all images (with optional search/category filters)
// Cache for 30 seconds - images change frequently but short cache helps with repeated requests
router.get('/',
    cacheMiddleware(30 * 1000, (req) => {
        // Include query params in cache key for proper cache separation
        return `/api/images?${new URLSearchParams(req.query).toString()}`;
    }),
    validateGetImages,
    getAllImages
);

// Public routes - get locations for suggestions/filtering
router.get('/locations', getLocations);

// Public routes - increment stats (with optional auth to track user activity)
router.patch('/:imageId/view', optionalAuth, incrementView);
router.patch('/:imageId/download', optionalAuth, incrementDownload);

// Public route - proxy image with CORS headers (for displaying images)
router.get('/:imageId/proxy', proxyImage);

// Public route - download image (proxy from R2 to avoid CORS)
// Use optionalAuth to populate req.user if user is logged in (for notifications)
// Must be after PATCH route to avoid conflicts
router.get('/:imageId/download', optionalAuth, downloadImage);

// Protected routes (with CSRF protection for state-changing operations)
// Pre-upload: Upload image to R2 only (no database record)
router.post('/pre-upload', protectedRoute, uploadLimiter, preUploadImage);
// Delete pre-uploaded file: Remove file from R2 if user cancels before finalization
router.delete('/pre-upload', protectedRoute, deletePreUploadedFile);
// Finalize: Link metadata to pre-uploaded image and create database record
router.post('/finalize', protectedRoute, finalizeImageUpload);
// Bulk upload notification
router.post('/bulk-upload-notification', protectedRoute, createBulkUploadNotification);
// Legacy upload endpoint (kept for backward compatibility)
router.post('/upload', protectedRoute, uploadLimiter, singleUpload, validateImageUpload, uploadImage);
router.patch('/:imageId', protectedRoute, updateImage);
router.patch('/:imageId/replace', protectedRoute, uploadLimiter, singleUpload, replaceImage);
router.patch('/batch/replace', protectedRoute, uploadLimiter, multipleUpload, batchReplaceImages);
// Public route - get images by user ID (works for both authenticated and anonymous users)
router.get('/user/:userId', optionalAuth, validateUserId, validateGetImages, getImagesByUserId);

export default router;