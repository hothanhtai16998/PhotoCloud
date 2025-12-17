import express from 'express';
import {
    createReport,
    getUserReports,
    getAllReports,
    updateReportStatus,
} from '../controllers/reportController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { adminRoute } from '../middlewares/adminMiddleware.js';
import { requirePermission } from '../middlewares/permissionMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// User routes
router.post('/', validateCsrf, createReport);
router.get('/', getUserReports);

// Admin routes
router.get('/admin', adminRoute, requirePermission('moderateContent'), getAllReports);
router.patch('/admin/:reportId', adminRoute, requirePermission('moderateContent'), validateCsrf, updateReportStatus);

export default router;

