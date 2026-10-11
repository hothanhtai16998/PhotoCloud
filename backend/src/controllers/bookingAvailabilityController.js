import BookingAvailability from '../models/BookingAvailability.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const defaultWeekly = Array.from({ length: 7 }, (_, weekday) => ({ weekday, enabled: weekday !== 0, startTime: '08:00', endTime: '18:00' }));

const getOrCreate = async () => BookingAvailability.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { weekly: defaultWeekly } }, { upsert: true, new: true, setDefaultsOnInsert: true });

export const getAvailability = asyncHandler(async (_req, res) => {
    const availability = await getOrCreate();
    res.json({ success: true, availability });
});

export const updateAvailability = asyncHandler(async (req, res) => {
    const weekly = Array.isArray(req.body?.weekly) ? req.body.weekly.map((item) => ({
        weekday: Number(item.weekday),
        enabled: item.enabled !== false,
        startTime: String(item.startTime || '08:00').slice(0, 5),
        endTime: String(item.endTime || '18:00').slice(0, 5),
    })).filter((item) => item.weekday >= 0 && item.weekday <= 6) : defaultWeekly;
    const blockedDates = Array.isArray(req.body?.blockedDates) ? req.body.blockedDates.map((item) => ({ date: new Date(item.date), reason: String(item.reason || '').slice(0, 200) })).filter((item) => !Number.isNaN(item.date.getTime())) : [];
    const availability = await BookingAvailability.findOneAndUpdate({ key: 'default' }, { weekly, blockedDates, timezone: String(req.body?.timezone || 'Asia/Ho_Chi_Minh') }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, availability });
});

export const checkDateAvailability = asyncHandler(async (req, res) => {
    const date = new Date(req.query.date);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'Ngày không hợp lệ' });
    const availability = await getOrCreate();
    const blocked = availability.blockedDates.some((item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10));
    const weekly = availability.weekly.find((item) => item.weekday === date.getUTCDay());
    res.json({ success: true, available: !blocked && Boolean(weekly?.enabled), schedule: weekly || null, blockedReason: blocked ? availability.blockedDates.find((item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10))?.reason : null });
});
