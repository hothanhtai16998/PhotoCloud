import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ['pending', 'subscribed', 'unsubscribed'], default: 'pending' },
    confirmationHash: String,
    confirmationExpiresAt: Date,
    unsubscribeHash: String,
    lastRequestedAt: Date,
    confirmedAt: Date,
    unsubscribedAt: Date,
    consentVersion: { type: String, default: 'newsletter-v1' },
}, { timestamps: true });
schema.index({ confirmationHash: 1 }, { sparse: true });
schema.index({ unsubscribeHash: 1 }, { sparse: true });
export default mongoose.model('NewsletterSubscription', schema);
