import express from 'express';
import {
    getSearchSuggestions,
    getPopularSearches,
} from '../controllers/searchSuggestionsController.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// Public route - get search suggestions
// Cache for 5 minutes - suggestions don't change frequently
router.get('/suggestions',
    cacheMiddleware(5 * 60 * 1000, (req) => {
        const query = req.query.q || '';
        return `/api/search/suggestions?q=${encodeURIComponent(query)}`;
    }),
    getSearchSuggestions
);

// Public route - get popular searches
// Cache for 15 minutes - popular searches change slowly
router.get('/popular',
    cacheMiddleware(15 * 60 * 1000, () => '/api/search/popular'),
    getPopularSearches
);

export default router;

