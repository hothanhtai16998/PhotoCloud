import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['image', 'collection', 'user'],
            index: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            required: true,
            enum: [
                'inappropriate_content',
                'spam',
                'copyright_violation',
                'harassment',
                'fake_account',
                'other',
            ],
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
            default: 'pending',
            index: true,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: {
            type: Date,
        },
        resolution: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
reportSchema.index({ type: 1, targetId: 1, reporter: 1 }); // Prevent duplicate reports
reportSchema.index({ status: 1, createdAt: -1 }); // For admin queries
reportSchema.index({ reporter: 1, createdAt: -1 }); // For user's report history

const Report = mongoose.model('Report', reportSchema);

export default Report;

