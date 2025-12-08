import express from 'express';
import {
    toggleFavorite,
    getFavorites,
    checkFavorites,
} from '../controllers/favoriteController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All favorite routes require authentication
router.use(protectedRoute);

// Get user's favorite images (must come before /:imageId)
router.get('/', getFavorites);

// Check if multiple images are favorited (must come before /:imageId to avoid "check" being treated as imageId)
router.post('/check', validateCsrf, checkFavorites);

// Toggle favorite status for an image (must come last as it uses /:imageId parameter)
router.post('/:imageId', validateCsrf, toggleFavorite);

export default router;

