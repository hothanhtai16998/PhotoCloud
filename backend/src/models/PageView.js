import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        path: {
            type: String,
            required: true,
            index: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
            expires: 300, // Auto-delete after 5 minutes (for real-time tracking)
        },
        sessionId: {
            type: String,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient queries
pageViewSchema.index({ timestamp: 1, path: 1 });
pageViewSchema.index({ timestamp: 1, userId: 1 });

const PageView = mongoose.model('PageView', pageViewSchema);

export default PageView;

