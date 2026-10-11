import mongoose from 'mongoose';

const bookingPolicySchema = new mongoose.Schema({
    key: { type: String, default: 'default', unique: true },
    allowClientCancellation: { type: Boolean, default: true },
    allowOneReschedule: { type: Boolean, default: true },
    rescheduleDeadlineHours: { type: Number, default: 24, min: 0, max: 720 },
    cancellationRules: [{
        minimumHoursBefore: { type: Number, required: true, min: 0 },
        refundPercent: { type: Number, required: true, min: 0, max: 100 },
        label: { type: String, trim: true, maxlength: 200 },
    }],
    weatherRescheduleAllowed: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('BookingPolicy', bookingPolicySchema);
