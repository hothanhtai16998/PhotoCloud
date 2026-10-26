import { readRequestedTime } from '../utils/bookingTime.js';
import mongoose from 'mongoose';
import { reschedulePolicyError, cancellationRefundPercent } from '../utils/bookingPolicyRules.js';
import Booking from '../models/Booking.js';
import BookingPackage from '../models/BookingPackage.js';
import BookingAvailability from '../models/BookingAvailability.js';
import { sendBookingEmail } from '../utils/bookingEmails.js';
import BookingPolicy from '../models/BookingPolicy.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { bookingAdminSearch } from '../utils/bookingAdminSearch.js';

const BOOKING_PACKAGES = [
    {
        slug: 'portrait',
        name: 'Chân dung cá nhân',
        description: 'Một buổi chụp tập trung vào cá tính và phong cách riêng của bạn.',
        durationMinutes: 60,
        basePrice: 1500000,
        includedPhotos: 20,
        includedPeople: 1,
        deliveryDays: 7,
        category: 'portrait',
    },
    {
        slug: 'couple',
        name: 'Couple',
        description: 'Ghi lại những khoảnh khắc tự nhiên và thân mật cho hai người.',
        durationMinutes: 90,
        basePrice: 2200000,
        includedPhotos: 35,
        includedPeople: 2,
        deliveryDays: 10,
        category: 'couple',
    },
    {
        slug: 'family',
        name: 'Gia đình',
        description: 'Buổi chụp ấm áp cho gia đình, tối đa sáu người.',
        durationMinutes: 120,
        basePrice: 3200000,
        includedPhotos: 50,
        includedPeople: 6,
        deliveryDays: 14,
        category: 'family',
    },
    {
        slug: 'mini-session',
        name: 'Mini session',
        description: 'Một buổi chụp ngắn, gọn và linh hoạt cho những dịp đặc biệt.',
        durationMinutes: 30,
        basePrice: 900000,
        includedPhotos: 10,
        includedPeople: 2,
        deliveryDays: 5,
        category: 'mini-session',
    },
];

const TIME_SLOTS = new Set(['morning', 'afternoon', 'evening', 'flexible']);
const LOCATION_TYPES = new Set(['studio', 'outdoor', 'home', 'other']);
const CHANNELS = new Set(['email', 'phone', 'zalo']);
const ADMIN_STATUSES = new Set([
    'reviewing',
    'needs_information',
    'confirmed',
    'rescheduled',
    'completed',
    'cancelled_by_photographer',
    'rejected',
    'expired',
]);

const ensureDefaultPackages = async () => {
    await Promise.all(BOOKING_PACKAGES.map((item) => BookingPackage.updateOne({ slug: item.slug }, { $setOnInsert: item }, { upsert: true })));
};

const getPackage = async (slug) => BookingPackage.findOne({ slug, active: true }).lean();

const cleanString = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const parseFutureDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return null;
    date.setHours(12, 0, 0, 0);
    return date;
};

const createBookingCode = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PC-${date}-${suffix}`;
};

export const getBookingPackages = asyncHandler(async (_req, res) => {
    await ensureDefaultPackages();
    const packages = await BookingPackage.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ success: true, packages });
});

export const createBooking = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const body = req.body || {};
    await ensureDefaultPackages();
    const selectedPackage = await getPackage(body.packageSlug);
    const requestedDate = parseFutureDate(body.requestedDate);
    const participants = Number(body.participants);
    const requestedTime = readRequestedTime(body.requestedStartTime, cleanString(body.requestedTimeSlot, 20));
    if (requestedTime.error) return res.status(400).json({ success: false, message: requestedTime.error });
    const timeSlot = requestedTime.slot;
    const locationType = cleanString(body.location?.type, 20);
    const contactName = cleanString(body.contact?.name, 120);
    const contactEmail = cleanString(body.contact?.email, 200).toLowerCase();
    const contactPhone = cleanString(body.contact?.phone, 30);
    const preferredChannel = cleanString(body.contact?.preferredChannel || 'email', 20);
    const address = cleanString(body.location?.address, 500);

    if (!selectedPackage) return res.status(400).json({ success: false, message: 'Gói chụp không hợp lệ' });
    if (!requestedDate) return res.status(400).json({ success: false, message: 'Ngày chụp phải là ngày hôm nay hoặc trong tương lai' });
    const availability = await BookingAvailability.findOne({ key: 'default' }).lean();
    if (availability) {
        const blocked = availability.blockedDates?.some((item) => item.date.toISOString().slice(0, 10) === requestedDate.toISOString().slice(0, 10));
        const weekly = availability.weekly?.find((item) => item.weekday === requestedDate.getUTCDay());
        if (blocked || weekly?.enabled === false) return res.status(409).json({ success: false, message: 'Ngày này hiện không nhận lịch, vui lòng chọn ngày khác' });
    }
    if (!TIME_SLOTS.has(timeSlot)) return res.status(400).json({ success: false, message: 'Khung giờ không hợp lệ' });
    if (!LOCATION_TYPES.has(locationType) || !address) return res.status(400).json({ success: false, message: 'Vui lòng nhập địa điểm chụp' });
    if (!Number.isInteger(participants) || participants < 1 || participants > selectedPackage.includedPeople) {
        return res.status(400).json({ success: false, message: `Gói này hỗ trợ tối đa ${selectedPackage.includedPeople} người` });
    }
    if (!contactName || !/^\S+@\S+\.\S+$/.test(contactEmail) || contactPhone.length < 7) {
        return res.status(400).json({ success: false, message: 'Thông tin liên hệ chưa hợp lệ' });
    }
    if (!CHANNELS.has(preferredChannel)) return res.status(400).json({ success: false, message: 'Kênh liên hệ không hợp lệ' });

    const existingBooking = await Booking.findOne({
        client: userId,
        packageSlug: selectedPackage.slug,
        requestedDate,
        status: { $in: ['pending', 'reviewing', 'needs_information', 'confirmed', 'rescheduled'] },
    }).lean();
    if (existingBooking) return res.status(409).json({ success: false, message: 'Bạn đã có một yêu cầu tương tự đang được xử lý' });

    const booking = await Booking.create({
        bookingCode: createBookingCode(),
        client: userId,
        packageSlug: selectedPackage.slug,
        packageSnapshot: {
            name: selectedPackage.name,
            durationMinutes: selectedPackage.durationMinutes,
            basePrice: selectedPackage.basePrice,
            includedPhotos: selectedPackage.includedPhotos,
        },
        requestedDate,
        requestedTimeSlot: timeSlot,
        requestedStartTime: requestedTime.time,
        alternativeDate: parseFutureDate(body.alternativeDate) || undefined,
        location: { type: locationType, address, mapUrl: cleanString(body.location?.mapUrl, 1000) },
        participants,
        contact: { name: contactName, email: contactEmail, phone: contactPhone, preferredChannel },
        concept: cleanString(body.concept, 1000),
        notes: cleanString(body.notes, 2000),
        statusHistory: [{ to: 'pending', changedBy: userId, note: 'Khách gửi yêu cầu đặt lịch' }],
    });

    try {
        const admins = await User.find({ $or: [{ isAdmin: true }, { isSuperAdmin: true }] }).select('_id').lean();
        await Notification.insertMany(admins.map((admin) => ({
            recipient: admin._id,
            actor: userId,
            type: 'booking_created',
            metadata: { bookingId: booking._id.toString(), bookingCode: booking.bookingCode, packageName: selectedPackage.name },
        })));
    } catch (error) {
        logger.error('Failed to notify admins about booking', error);
    }

    await sendBookingEmail('created', booking).catch((error) => logger.warn('Booking email failed', { error: error.message }));
    res.status(201).json({ success: true, message: 'Đã gửi yêu cầu đặt lịch', booking });
});

export const getMyBookings = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const query = { client: req.user._id };
    const [bookings, total] = await Promise.all([
        Booking.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Booking.countDocuments(query),
    ]);
    res.json({ success: true, bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getMyBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.bookingId, client: req.user._id }).lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đặt lịch' });
    res.json({ success: true, booking });
});

export const requestReschedule = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.bookingId, client: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đặt lịch' });
    if (!['confirmed', 'rescheduled'].includes(booking.status)) return res.status(409).json({ success: false, message: 'Booking chưa thể yêu cầu đổi lịch' });
    const reason = req.body?.reason || 'personal';
    if (!['personal', 'weather'].includes(reason)) return res.status(400).json({ success: false, message: 'Lý do đổi lịch không hợp lệ' });
    const policy = await BookingPolicy.findOne({ key: 'default' }).lean();
    const policyError = reschedulePolicyError(booking, policy, reason);
    if (policyError) return res.status(409).json({ success: false, message: policyError });
    if (reason === 'weather' && !cleanString(req.body?.note, 500)) return res.status(400).json({ success: false, message: 'Vui lòng mô tả tình hình thời tiết để studio xem xét.' });
    if (booking.rescheduleRequest?.requestedAt) return res.status(409).json({ success: false, message: 'Bạn đã có yêu cầu đổi lịch đang chờ studio xử lý.' });
    const requestedDate = parseFutureDate(req.body?.requestedDate);
    if (!requestedDate || !TIME_SLOTS.has(req.body?.requestedTimeSlot)) return res.status(400).json({ success: false, message: 'Ngày hoặc khung giờ đổi lịch không hợp lệ' });
    booking.rescheduleRequest = { reason, requestedDate, requestedTimeSlot: req.body.requestedTimeSlot, note: cleanString(req.body?.note, 500), requestedAt: new Date() };
    await booking.save();
    await Notification.create({ recipient: booking.client, actor: req.user._id, type: 'booking_reschedule_requested', metadata: { bookingId: booking._id.toString(), bookingCode: booking.bookingCode } });
    res.json({ success: true, message: 'Đã gửi yêu cầu đổi lịch', booking });
});

export const cancelMyBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.bookingId, client: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đặt lịch' });
    if (!['pending', 'reviewing', 'needs_information', 'confirmed', 'rescheduled'].includes(booking.status)) {
        return res.status(409).json({ success: false, message: 'Yêu cầu này không thể hủy ở trạng thái hiện tại' });
    }
    const policy = await BookingPolicy.findOne({ key: 'default' }).lean();
    if (policy?.allowClientCancellation === false) return res.status(409).json({ success: false, message: 'Studio hiện không cho phép khách tự hủy. Vui lòng liên hệ studio.' });
    const refundPercent = cancellationRefundPercent(booking, policy);
    const previousStatus = booking.status;
    booking.status = 'cancelled_by_client';
    booking.cancellationReason = cleanString(req.body?.reason, 500);
    booking.statusHistory.push({ from: previousStatus, to: booking.status, changedBy: req.user._id, note: `${booking.cancellationReason} · Tỷ lệ hoàn cọc theo chính sách: ${refundPercent}% (studio đối soát, chưa hoàn tiền)` });
    await booking.save();
    res.json({ success: true, message: 'Đã hủy yêu cầu đặt lịch', booking });
});

export const getAdminBookings = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = bookingAdminSearch(req.query.search);
    if (req.query.status) query.status = req.query.status;
    if (req.query.from || req.query.to) {
        query.requestedDate = {};
        if (req.query.from) query.requestedDate.$gte = new Date(req.query.from);
        if (req.query.to) query.requestedDate.$lte = new Date(req.query.to);
    }
    const [bookings, total] = await Promise.all([
        Booking.find(query).populate('client', 'username displayName email avatarUrl').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Booking.countDocuments(query),
    ]);
    res.json({ success: true, bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const updateAdminBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Mã booking không hợp lệ' });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    const { status, note, confirmedDate, confirmedStartTime, confirmedEndTime } = req.body || {};
    if (!ADMIN_STATUSES.has(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    if (status === 'rejected' && !cleanString(note, 500)) return res.status(400).json({ success: false, message: 'Cần nhập lý do từ chối' });
    if (req.body.dismissReschedule) {
        if (!booking.rescheduleRequest?.requestedAt || status !== booking.status || !cleanString(note, 500)) return res.status(400).json({ success: false, message: 'Cần có yêu cầu đang chờ và lý do không chấp thuận.' });
        booking.rescheduleRequest = undefined;
    }
    const previousStatus = booking.status;
    booking.status = status;
    const rescheduleReason = status === 'rescheduled' ? booking.rescheduleRequest?.reason || 'personal' : undefined;
    if (status === 'rescheduled' && booking.rescheduleRequest?.requestedDate) {
        booking.confirmedDate = booking.rescheduleRequest.requestedDate;
        booking.confirmedStartTime = undefined;
        booking.confirmedEndTime = undefined;
        booking.rescheduleRequest = undefined;
    }
    if (['completed', 'cancelled_by_photographer', 'rejected', 'expired'].includes(status)) booking.rescheduleRequest = undefined;
    if (confirmedDate) booking.confirmedDate = parseFutureDate(confirmedDate) || booking.confirmedDate;
    if (confirmedStartTime) booking.confirmedStartTime = cleanString(confirmedStartTime, 10);
    if (confirmedEndTime) booking.confirmedEndTime = cleanString(confirmedEndTime, 10);
    if (note) booking.internalNotes = cleanString(note, 2000);
    booking.statusHistory.push({ from: previousStatus, to: status, changedBy: req.user._id, reason: rescheduleReason, action: req.body.dismissReschedule ? 'reschedule_declined' : undefined, note: cleanString(note, 500) });
    await booking.save();
    await Notification.create({
        recipient: booking.client,
        actor: req.user._id,
        type: 'booking_status_changed',
        metadata: { bookingId: booking._id.toString(), bookingCode: booking.bookingCode, status, note: cleanString(note, 500) },
    });
    await sendBookingEmail('status_changed', booking).catch((error) => logger.warn('Booking status email failed', { error: error.message }));
    res.json({ success: true, message: 'Đã cập nhật booking', booking });
});

