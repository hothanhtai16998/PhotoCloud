import express from 'express';
import {
    toggleCollectionFavorite,
    getFavoriteCollections,
    checkCollectionFavorites,
} from '../controllers/collectionFavoriteController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// Check if collections are favorited (must come before /:collectionId route)
router.post('/check', validateCsrf, checkCollectionFavorites);

// Get user's favorite collections
router.get('/', getFavoriteCollections);

// Toggle favorite status for a collection (must come last as it uses /:collectionId parameter)
router.post('/:collectionId', validateCsrf, toggleCollectionFavorite);

export default router;

