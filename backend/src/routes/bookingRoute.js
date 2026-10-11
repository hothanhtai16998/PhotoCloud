import express from 'express';
import {
    getBookingPackages,
    createBooking,
    getMyBookings,
    getMyBooking,
    cancelMyBooking,
    getAdminBookings,
    updateAdminBooking,
} from '../controllers/bookingController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { adminRoute } from '../middlewares/adminMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';
import { listAdminPackages, createAdminPackage, updateAdminPackage, archiveAdminPackage } from '../controllers/bookingPackageController.js';

const router = express.Router();

router.get('/packages', getBookingPackages);

router.use(protectedRoute);
router.post('/', validateCsrf, createBooking);
router.get('/mine', getMyBookings);
router.get('/mine/:bookingId', getMyBooking);
router.patch('/mine/:bookingId/cancel', validateCsrf, cancelMyBooking);

router.get('/admin', adminRoute, getAdminBookings);
router.patch('/admin/:bookingId', adminRoute, validateCsrf, updateAdminBooking);
router.get('/admin/packages', adminRoute, listAdminPackages);
router.post('/admin/packages', adminRoute, validateCsrf, createAdminPackage);
router.patch('/admin/packages/:packageId', adminRoute, validateCsrf, updateAdminPackage);
router.delete('/admin/packages/:packageId', adminRoute, validateCsrf, archiveAdminPackage);

export default router;
