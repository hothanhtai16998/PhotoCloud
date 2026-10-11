import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
    {
        from: { type: String, default: null },
        to: { type: String, required: true },
        note: { type: String, default: '' },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const bookingSchema = new mongoose.Schema(
    {
        bookingCode: { type: String, required: true, unique: true, index: true },
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        packageSlug: { type: String, required: true, trim: true },
        packageSnapshot: {
            name: { type: String, required: true },
            durationMinutes: { type: Number, required: true },
            basePrice: { type: Number, required: true, min: 0 },
            includedPhotos: { type: Number, required: true, min: 0 },
        },
        status: {
            type: String,
            enum: [
                'pending',
                'reviewing',
                'needs_information',
                'confirmed',
                'rescheduled',
                'completed',
                'cancelled_by_client',
                'cancelled_by_photographer',
                'rejected',
                'expired',
            ],
            default: 'pending',
            index: true,
        },
        requestedDate: { type: Date, required: true, index: true },
        requestedTimeSlot: {
            type: String,
            enum: ['morning', 'afternoon', 'evening', 'flexible'],
            required: true,
        },
        alternativeDate: { type: Date },
        confirmedDate: { type: Date },
        confirmedStartTime: { type: String, trim: true },
        confirmedEndTime: { type: String, trim: true },
        location: {
            type: { type: String, enum: ['studio', 'outdoor', 'home', 'other'], required: true },
            address: { type: String, required: true, trim: true, maxlength: 500 },
            mapUrl: { type: String, trim: true, maxlength: 1000 },
        },
        participants: { type: Number, required: true, min: 1, max: 50 },
        contact: {
            name: { type: String, required: true, trim: true, maxlength: 120 },
            email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
            phone: { type: String, required: true, trim: true, maxlength: 30 },
            preferredChannel: { type: String, enum: ['email', 'phone', 'zalo'], default: 'email' },
        },
        concept: { type: String, trim: true, maxlength: 1000 },
        notes: { type: String, trim: true, maxlength: 2000 },
        internalNotes: { type: String, trim: true, maxlength: 2000 },
        statusHistory: { type: [statusHistorySchema], default: [] },
        cancellationReason: { type: String, trim: true, maxlength: 500 },
    },
    { timestamps: true }
);

bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ requestedDate: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
