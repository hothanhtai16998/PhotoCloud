import { createPeriodicTask } from '../lifecycle/periodicTask.js';
import Booking from '../../models/Booking.js';
import Notification from '../../models/Notification.js';
import { sendBookingEmail } from '../email/bookingEmails.js';
import { logger } from '../../utils/logger.js';


const processReminders = async () => {
    const now = Date.now();
    const bookings = await Booking.find({ status: { $in: ['confirmed', 'rescheduled'] }, $or: [{ 'remindersSent.sevenDays': { $exists: false } }, { 'remindersSent.oneDay': { $exists: false } }] }).limit(500);
    for (const booking of bookings) {
        const date = (booking.confirmedDate || booking.requestedDate)?.getTime();
        if (!date) continue;
        const days = (date - now) / 86400000;
        let reminder;
        let field;
        if (days <= 7 && days > 1 && !booking.remindersSent?.sevenDays) { reminder = 'sevenDays'; field = 'sevenDays'; }
        else if (days <= 1 && days > 0 && !booking.remindersSent?.oneDay) { reminder = 'oneDay'; field = 'oneDay'; }
        if (!reminder) continue;
        await Notification.create({ recipient: booking.client, type: 'booking_reminder', metadata: { bookingId: booking._id.toString(), bookingCode: booking.bookingCode, reminder } });
        await sendBookingEmail('reminder', booking).catch((error) => logger.warn('Booking reminder email failed', { error: error.message }));
        booking.set(`remindersSent.${field}`, new Date());
        await booking.save();
    }
};

const reminderTask = createPeriodicTask({
    run: processReminders,
    intervalMs: 60 * 60 * 1000,
    onError: error => logger.error('Booking reminder run failed', error),
});
export const startBookingReminders = reminderTask.start;
export const stopBookingReminders = reminderTask.stop;
