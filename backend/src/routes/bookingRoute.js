import express from 'express';
import {
    getBookingPackages,
    createBooking,
    getMyBookings,
    getMyBooking,
    cancelMyBooking,
    requestReschedule,
    getAdminBookings,
    updateAdminBooking,
} from '../controllers/bookingController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { adminRoute } from '../middlewares/adminMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';
import { listAdminPackages, createAdminPackage, updateAdminPackage, archiveAdminPackage } from '../controllers/bookingPackageController.js';
import { getAvailability, updateAvailability, checkDateAvailability } from '../controllers/bookingAvailabilityController.js';
import { getMyWorkspace, acceptContract, submitQuestionnaire, getAdminWorkspace, updateAdminWorkspace } from '../controllers/bookingWorkspaceController.js';
import { getBookingPolicy, updateBookingPolicy, getMyReview, createMyReview, listAdminReviews, replyAdminReview } from '../controllers/bookingFinalController.js';

const router = express.Router();

router.get('/packages', getBookingPackages);
router.get('/availability/check', checkDateAvailability);

router.use(protectedRoute);
router.post('/', validateCsrf, createBooking);
router.get('/mine', getMyBookings);
router.get('/mine/:bookingId', getMyBooking);
router.patch('/mine/:bookingId/cancel', validateCsrf, cancelMyBooking);
router.post('/mine/:bookingId/reschedule', validateCsrf, requestReschedule);
router.get('/mine/:bookingId/workspace', getMyWorkspace);
router.post('/mine/:bookingId/contract/accept', validateCsrf, acceptContract);
router.patch('/mine/:bookingId/questionnaire', validateCsrf, submitQuestionnaire);
router.get('/mine/:bookingId/review', getMyReview);
router.post('/mine/:bookingId/review', validateCsrf, createMyReview);

router.get('/admin', adminRoute, getAdminBookings);
router.patch('/admin/:bookingId', adminRoute, validateCsrf, updateAdminBooking);
router.get('/admin/:bookingId/workspace', adminRoute, getAdminWorkspace);
router.patch('/admin/:bookingId/workspace', adminRoute, validateCsrf, updateAdminWorkspace);
router.get('/admin/policy', adminRoute, getBookingPolicy);
router.patch('/admin/policy', adminRoute, validateCsrf, updateBookingPolicy);
router.get('/admin/reviews', adminRoute, listAdminReviews);
router.patch('/admin/reviews/:reviewId', adminRoute, validateCsrf, replyAdminReview);
router.get('/admin/availability', adminRoute, getAvailability);
router.patch('/admin/availability', adminRoute, validateCsrf, updateAvailability);
router.get('/admin/packages', adminRoute, listAdminPackages);
router.post('/admin/packages', adminRoute, validateCsrf, createAdminPackage);
router.patch('/admin/packages/:packageId', adminRoute, validateCsrf, updateAdminPackage);
router.delete('/admin/packages/:packageId', adminRoute, validateCsrf, archiveAdminPackage);

export default router;
