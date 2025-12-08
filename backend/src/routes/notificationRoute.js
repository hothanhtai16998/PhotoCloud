import express from 'express';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount,
} from '../controllers/notificationController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// Get unread count (lightweight endpoint for badge)
router.get('/unread-count', getUnreadCount);

// Get user's notifications
router.get('/', getNotifications);

// Mark notification as read
router.patch('/:notificationId/read', validateCsrf, markNotificationAsRead);

// Mark all notifications as read
router.patch('/read-all', validateCsrf, markAllNotificationsAsRead);

// Delete notification
router.delete('/:notificationId', validateCsrf, deleteNotification);

export default router;

