import mongoose from 'mongoose';

const bookingReviewSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 2000 },
    visible: { type: Boolean, default: true },
    adminReply: { type: String, trim: true, maxlength: 1000 },
    repliedAt: Date,
}, { timestamps: true });

export default mongoose.model('BookingReview', bookingReviewSchema);
