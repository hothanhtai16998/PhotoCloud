import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
    key: { type: String, default: 'default', unique: true },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    weekly: [{
        weekday: { type: Number, min: 0, max: 6, required: true },
        enabled: { type: Boolean, default: true },
        startTime: { type: String, default: '08:00' },
        endTime: { type: String, default: '18:00' },
    }],
    blockedDates: [{
        date: { type: Date, required: true },
        reason: { type: String, trim: true, maxlength: 200 },
    }],
}, { timestamps: true });

export default mongoose.model('BookingAvailability', availabilitySchema);
