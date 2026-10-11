import Booking from '../models/Booking.js';
import BookingPolicy from '../models/BookingPolicy.js';
import BookingReview from '../models/BookingReview.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const defaultRules = [
    { minimumHoursBefore: 168, refundPercent: 100, label: 'Hủy trước 7 ngày' },
    { minimumHoursBefore: 72, refundPercent: 50, label: 'Hủy trước 3 ngày' },
    { minimumHoursBefore: 0, refundPercent: 0, label: 'Hủy trong vòng 3 ngày' },
];
const getPolicy = () => BookingPolicy.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { cancellationRules: defaultRules } }, { upsert: true, new: true });

export const getBookingPolicy = asyncHandler(async (_req, res) => res.json({ success: true, policy: await getPolicy() }));
export const updateBookingPolicy = asyncHandler(async (req, res) => {
    const data = { ...req.body, cancellationRules: Array.isArray(req.body?.cancellationRules) ? req.body.cancellationRules : defaultRules };
    const policy = await BookingPolicy.findOneAndUpdate({ key: 'default' }, data, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, policy });
});

export const getMyReview = asyncHandler(async (req, res) => {
    const review = await BookingReview.findOne({ booking: req.params.bookingId, client: req.user._id }).lean();
    res.json({ success: true, review });
});
export const createMyReview = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.bookingId, client: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    if (booking.status !== 'completed') return res.status(409).json({ success: false, message: 'Chỉ có thể đánh giá sau khi hoàn thành buổi chụp' });
    const review = await BookingReview.create({ booking: booking._id, client: req.user._id, rating: Number(req.body?.rating), title: String(req.body?.title || '').slice(0, 120), comment: String(req.body?.comment || '').slice(0, 2000) });
    res.status(201).json({ success: true, review });
});
export const listAdminReviews = asyncHandler(async (_req, res) => {
    const reviews = await BookingReview.find().populate('client', 'displayName username avatarUrl').populate('booking', 'bookingCode packageSnapshot').sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, reviews });
});
export const replyAdminReview = asyncHandler(async (req, res) => {
    const review = await BookingReview.findByIdAndUpdate(req.params.reviewId, { adminReply: String(req.body?.reply || '').slice(0, 1000), repliedAt: new Date(), visible: req.body?.visible !== false }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    res.json({ success: true, review });
});
