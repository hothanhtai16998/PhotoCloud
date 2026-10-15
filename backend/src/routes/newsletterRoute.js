import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Subscription from '../models/NewsletterSubscription.js';
import { createNewsletterService } from '../services/newsletterService.js';
import { sendUserEmail } from '../utils/emailAlerts.js';
import { env } from '../libs/env.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { body, validationResult } from 'express-validator';

const router = Router();
router.use(rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' } }));
const service = createNewsletterService({ subscriptions: Subscription, sendEmail: sendUserEmail, clientUrl: env.FRONTEND_URL });
router.post('/subscribe', body('email').isString().bail().trim().isLength({ max: 254 }).isEmail({ allow_utf8_local_part: false }), asyncHandler(async (req, res) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
    await service.subscribe(req.body.email);
    res.status(202).json({ success: true, message: 'Nếu email chưa đăng ký, thư xác nhận sẽ được gửi. Vui lòng kiểm tra hộp thư và thư rác.' });
}));
router.post('/confirm', asyncHandler(async (req, res) => {
    await service.confirm(req.body.token);
    res.json({ success: true, message: 'Đã xác nhận nhận tin từ PhotoCloud.' });
}));
router.post('/unsubscribe', asyncHandler(async (req, res) => {
    await service.unsubscribe(req.body.token);
    res.json({ success: true, message: 'Đã hủy nhận tin từ PhotoCloud.' });
}));
export default router;
