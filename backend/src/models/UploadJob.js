import mongoose from 'mongoose';

// Reserve ownership before issuing an R2 URL. Accepted jobs survive API restarts.
const schema = new mongoose.Schema({
    _id: { type: String, required: true },
    kind: { type: String, enum: ['upload', 'avif'], default: 'upload' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadKey: { type: String, required: true },
    imageId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    status: { type: String, enum: ['staged', 'queued', 'processing', 'completed', 'failed'], default: 'staged' },
    payload: { type: mongoose.Schema.Types.Mixed },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseUntil: Date,
    leaseOwner: String,
    lastError: String,
    completedAt: Date,
}, { timestamps: true });
schema.index({ status: 1, nextAttemptAt: 1, leaseUntil: 1 });
schema.index({ uploadKey: 1, kind: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('UploadJob', schema);
