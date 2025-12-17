import express from 'express';
import {
    getTemplates,
    getTemplateById,
    createTemplate,
    createCollectionFromTemplate,
    updateTemplate,
    deleteTemplate,
    saveCollectionAsTemplate,
} from '../controllers/collectionTemplateController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// Get all templates
router.get('/', getTemplates);

// Get a single template by ID
router.get('/:templateId', getTemplateById);

// Create a new template
router.post('/', validateCsrf, createTemplate);

// Create a collection from a template
router.post('/:templateId/collections', validateCsrf, createCollectionFromTemplate);

// Update a template (only user's own templates)
router.patch('/:templateId', validateCsrf, updateTemplate);

// Delete a template (only user's own templates)
router.delete('/:templateId', validateCsrf, deleteTemplate);

// Save a collection as a template
router.post('/from-collection/:collectionId', validateCsrf, saveCollectionAsTemplate);

export default router;

