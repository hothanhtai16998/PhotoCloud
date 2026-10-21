import express from 'express';
import {
    getUserCollections,
    getCollectionById,
    createCollection,
    updateCollection,
    deleteCollection,
    addImageToCollection,
    removeImageFromCollection,
    getCollectionsContainingImage,
    reorderCollectionImages,
    exportCollection,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorPermission,
    trackCollectionShare,
} from '../controllers/collectionController.js';
import { protectedRoute, optionalAuth } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// Public reads may identify the viewer, but never require a login.
router.get('/', optionalAuth, getUserCollections);
router.get('/:collectionId', optionalAuth, getCollectionById);

// Personal pickers, exports and mutations remain authenticated.
router.use(protectedRoute);

// Get collections containing a specific image
router.get('/containing/:imageId', getCollectionsContainingImage);

// Track collection share
router.post('/:collectionId/share', validateCsrf, trackCollectionShare);

// Export collection as ZIP
router.get('/:collectionId/export', exportCollection);

// Create a new collection
router.post('/', validateCsrf, createCollection);

// Update a collection
router.patch('/:collectionId', validateCsrf, updateCollection);

// Delete a collection
router.delete('/:collectionId', validateCsrf, deleteCollection);

// Add image to collection
router.post('/:collectionId/images', validateCsrf, addImageToCollection);

// Remove image from collection
router.delete('/:collectionId/images/:imageId', validateCsrf, removeImageFromCollection);

// Reorder images in collection
router.patch('/:collectionId/images/reorder', validateCsrf, reorderCollectionImages);

// Collaboration routes
router.post('/:collectionId/collaborators', validateCsrf, addCollaborator);
router.delete('/:collectionId/collaborators/:collaboratorId', validateCsrf, removeCollaborator);
router.patch('/:collectionId/collaborators/:collaboratorId/permission', validateCsrf, updateCollaboratorPermission);

export default router;


