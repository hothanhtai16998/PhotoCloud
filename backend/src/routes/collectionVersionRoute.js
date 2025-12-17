import express from 'express';
import {
    getCollectionVersions,
    getVersionByNumber,
    restoreCollectionVersion,
} from '../controllers/collectionVersionController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// Get version history for a collection
router.get('/collection/:collectionId', getCollectionVersions);

// Get a specific version by version number
router.get('/collection/:collectionId/version/:versionNumber', getVersionByNumber);

// Restore a collection to a specific version
router.post('/collection/:collectionId/version/:versionNumber/restore', validateCsrf, restoreCollectionVersion);

export default router;

