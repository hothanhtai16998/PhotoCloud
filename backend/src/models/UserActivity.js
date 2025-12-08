import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        imageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
            required: true,
            index: true,
        },
        activityType: {
            type: String,
            enum: ['view', 'download'],
            required: true,
            index: true,
        },
        date: {
            type: String, // Format: YYYY-MM-DD (UTC date)
            required: true,
            index: true,
        },
        // Track first time this user viewed/downloaded this image
        isFirstTime: {
            type: Boolean,
            default: true,
        },
        // Count how many times user viewed/downloaded on this date
        // For test data, this can be > 1 if multiple views/downloads were added
        count: {
            type: Number,
            default: 1,
            min: 1,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
// Prevent duplicate entries - one view/download per user per image per day
userActivitySchema.index({ userId: 1, imageId: 1, activityType: 1, date: 1 }, { unique: true });

// Index for user analytics queries (get all activities for a user in date range)
userActivitySchema.index({ userId: 1, activityType: 1, date: 1 });

// Index for image analytics queries (get all activities for an image)
userActivitySchema.index({ imageId: 1, activityType: 1, date: 1 });

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
