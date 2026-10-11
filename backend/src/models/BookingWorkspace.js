import mongoose from 'mongoose';

const bookingWorkspaceSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
    contract: {
        title: { type: String, default: 'Thỏa thuận dịch vụ chụp ảnh' },
        content: { type: String, default: '' },
        status: { type: String, enum: ['draft', 'sent', 'accepted'], default: 'draft' },
        sentAt: Date,
        acceptedAt: Date,
        acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    questionnaire: {
        answers: {
            style: { type: String, trim: true, maxlength: 1000 },
            references: { type: String, trim: true, maxlength: 1000 },
            outfit: { type: String, trim: true, maxlength: 1000 },
            specialRequests: { type: String, trim: true, maxlength: 2000 },
            portfolioPermission: { type: Boolean, default: false },
        },
        submittedAt: Date,
    },
    production: {
        status: { type: String, enum: ['not_started', 'shoot_scheduled', 'shoot_completed', 'selecting', 'editing', 'quality_check', 'delivering', 'delivered'], default: 'not_started' },
        note: { type: String, trim: true, maxlength: 1000 },
        updatedAt: Date,
    },
    gallery: {
        collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },
        linkedAt: Date,
        deliveredAt: Date,
    },
}, { timestamps: true });

export default mongoose.model('BookingWorkspace', bookingWorkspaceSchema);
