import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
    {
        follower: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        following: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure unique follow relationships
// A user can only follow another user once
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Prevent users from following themselves
followSchema.pre('save', function (next) {
    if (this.follower.toString() === this.following.toString()) {
        const error = new Error('Users cannot follow themselves');
        error.statusCode = 400;
        return next(error);
    }
    next();
});

// Indexes for efficient queries
followSchema.index({ follower: 1, createdAt: -1 }); // Get users I'm following
followSchema.index({ following: 1, createdAt: -1 }); // Get my followers

const Follow = mongoose.model('Follow', followSchema);

export default Follow;
