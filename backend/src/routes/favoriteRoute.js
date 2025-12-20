import express from 'express';
import {
    toggleFavorite,
    getFavorites,
    checkFavorites,
    deleteAllFavorites,
} from '../controllers/favoriteController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// All favorite routes require authentication
router.use(protectedRoute);

// Get user's favorite images (must come before /:imageId)
// Cache for 10 seconds - favorites change frequently but short cache helps with performance
// Cache is cleared when favorites are toggled to ensure fresh data
router.get('/', cacheMiddleware(10 * 1000), getFavorites);

// Check if multiple images are favorited (must come before /:imageId to avoid "check" being treated as imageId)
router.post('/check', validateCsrf, checkFavorites);

// Delete all favorites (must come before /:imageId to avoid "all" being treated as imageId)
router.delete('/all', validateCsrf, deleteAllFavorites);

// Toggle favorite status for an image (must come last as it uses /:imageId parameter)
router.post('/:imageId', validateCsrf, toggleFavorite);

export default router;

