import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingPackage from '../models/BookingPackage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';

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
    const timeSlot = cleanString(body.requestedTimeSlot, 20);
    const locationType = cleanString(body.location?.type, 20);
    const contactName = cleanString(body.contact?.name, 120);
    const contactEmail = cleanString(body.contact?.email, 200).toLowerCase();
    const contactPhone = cleanString(body.contact?.phone, 30);
    const preferredChannel = cleanString(body.contact?.preferredChannel || 'email', 20);
    const address = cleanString(body.location?.address, 500);

    if (!selectedPackage) return res.status(400).json({ success: false, message: 'Gói chụp không hợp lệ' });
    if (!requestedDate) return res.status(400).json({ success: false, message: 'Ngày chụp phải là ngày hôm nay hoặc trong tương lai' });
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

export const cancelMyBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.bookingId, client: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đặt lịch' });
    if (!['pending', 'reviewing', 'needs_information'].includes(booking.status)) {
        return res.status(409).json({ success: false, message: 'Yêu cầu này không thể hủy ở trạng thái hiện tại' });
    }
    const previousStatus = booking.status;
    booking.status = 'cancelled_by_client';
    booking.cancellationReason = cleanString(req.body?.reason, 500);
    booking.statusHistory.push({ from: previousStatus, to: booking.status, changedBy: req.user._id, note: booking.cancellationReason });
    await booking.save();
    res.json({ success: true, message: 'Đã hủy yêu cầu đặt lịch', booking });
});

export const getAdminBookings = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = {};
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
    const previousStatus = booking.status;
    booking.status = status;
    if (confirmedDate) booking.confirmedDate = parseFutureDate(confirmedDate) || booking.confirmedDate;
    if (confirmedStartTime) booking.confirmedStartTime = cleanString(confirmedStartTime, 10);
    if (confirmedEndTime) booking.confirmedEndTime = cleanString(confirmedEndTime, 10);
    if (note) booking.internalNotes = cleanString(note, 2000);
    booking.statusHistory.push({ from: previousStatus, to: status, changedBy: req.user._id, note: cleanString(note, 500) });
    await booking.save();
    await Notification.create({
        recipient: booking.client,
        actor: req.user._id,
        type: 'booking_status_changed',
        metadata: { bookingId: booking._id.toString(), bookingCode: booking.bookingCode, status, note: cleanString(note, 500) },
    });
    res.json({ success: true, message: 'Đã cập nhật booking', booking });
});
