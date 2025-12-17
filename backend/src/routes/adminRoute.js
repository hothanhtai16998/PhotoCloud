import express from 'express';
import {
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    banUser,
    unbanUser,
    getAllImagesAdmin,
    deleteImage,
    updateImage,
    moderateImage,
    getAnalytics,
    getRealtimeAnalytics,
    trackPageView,
    getAllAdminRoles,
    getAdminRole,
    createAdminRole,
    updateAdminRole,
    deleteAdminRole,
    getAllCollectionsAdmin,
    updateCollectionAdmin,
    deleteCollectionAdmin,
    exportData,
    getAllFavorites,
    deleteFavorite,
    getPendingContent,
    approveContent,
    rejectContent,
    getSystemLogs,
    getSettings,
    updateSettings,
    getCacheStats,
    createSystemAnnouncement,
    getSystemMetrics,
    resetAllViewDownloadCounts,
    addTestViewDownloadData,
    listTestIds,
} from '../controllers/admin/index.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { adminRoute } from '../middlewares/adminMiddleware.js';
import { requireSuperAdmin, requirePermission } from '../middlewares/permissionMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protectedRoute);
router.use(adminRoute);

// Dashboard & Analytics
router.get('/dashboard/stats', requirePermission('viewDashboard'), getDashboardStats);
router.get('/dashboard/metrics', requirePermission('viewDashboard'), getSystemMetrics);
router.get('/analytics', requirePermission('viewAnalytics'), getAnalytics);
router.get('/analytics/realtime', requirePermission('viewAnalytics'), getRealtimeAnalytics);
// Note: trackPageView is handled as a public route in server.js (before adminRoute middleware)

// User Management
router.get('/users', requirePermission('viewUsers'), getAllUsers);
router.get('/users/:userId', requirePermission('viewUsers'), getUserById);
router.put('/users/:userId', requirePermission('editUsers'), validateCsrf, updateUser);
router.delete('/users/:userId', requirePermission('deleteUsers'), validateCsrf, deleteUser);
router.post('/users/:userId/ban', requirePermission('banUsers'), validateCsrf, banUser);
router.post('/users/:userId/unban', requirePermission('unbanUsers'), validateCsrf, unbanUser);

// Image Management
router.get('/images', requirePermission('viewImages'), getAllImagesAdmin);
router.put('/images/:imageId', requirePermission('editImages'), validateCsrf, updateImage);
router.delete('/images/:imageId', requirePermission('deleteImages'), validateCsrf, deleteImage);
router.post('/images/:imageId/moderate', requirePermission('moderateImages'), validateCsrf, moderateImage);

// Admin Role Management
router.get('/roles', requirePermission('viewAdmins'), getAllAdminRoles);
router.get('/roles/:userId', requirePermission('viewAdmins'), getAdminRole);
router.post('/roles', requireSuperAdmin, validateCsrf, createAdminRole);
router.put('/roles/:userId', requireSuperAdmin, validateCsrf, updateAdminRole);
router.delete('/roles/:userId', requireSuperAdmin, validateCsrf, deleteAdminRole);

// Collection Management
router.get('/collections', requirePermission('viewCollections'), getAllCollectionsAdmin);
router.put('/collections/:collectionId', requirePermission('manageCollections'), validateCsrf, updateCollectionAdmin);
router.delete('/collections/:collectionId', requirePermission('manageCollections'), validateCsrf, deleteCollectionAdmin);

// Export Data
router.get('/export', requirePermission('exportData'), exportData);

// Favorites Management
router.get('/favorites', requirePermission('manageFavorites'), getAllFavorites);
router.delete('/favorites/:userId/:imageId', requirePermission('manageFavorites'), validateCsrf, deleteFavorite);

// Content Moderation
router.get('/moderation/pending', requirePermission('moderateContent'), getPendingContent);
router.post('/moderation/:contentId/approve', requirePermission('moderateContent'), validateCsrf, approveContent);
router.post('/moderation/:contentId/reject', requirePermission('moderateContent'), validateCsrf, rejectContent);

// System Logs
router.get('/logs', requirePermission('viewLogs'), getSystemLogs);

// Settings Management
router.get('/settings', requirePermission('manageSettings'), getSettings);
router.put('/settings', requirePermission('manageSettings'), validateCsrf, updateSettings);

// Cache Test (Super Admin only)
router.get('/cache/stats', requireSuperAdmin, getCacheStats);

// System Announcements
router.post('/announcements', requirePermission('manageSettings'), validateCsrf, createSystemAnnouncement);

// Test Utilities (Super Admin only - for testing/debugging)
// Note: CSRF validation disabled for these endpoints since they're used with API clients (Postman, etc.)
router.get('/test-utils/list-ids', requireSuperAdmin, listTestIds);
router.post('/test-utils/reset-all-views-downloads', requireSuperAdmin, resetAllViewDownloadCounts);
router.post('/test-utils/add-test-data', requireSuperAdmin, addTestViewDownloadData);

export default router;

