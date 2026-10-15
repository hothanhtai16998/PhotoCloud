import mongoose from 'mongoose';
import crypto from 'crypto';

const passwordResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    usedAt: {
        type: Date,
        default: null,
    },
    ipAddress: {
        type: String,
        default: null,
    },
    userAgent: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});

// TTL index tự động xóa token hết hạn sau 24h
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static helpers
passwordResetTokenSchema.statics.createToken = async function (userId, email, ipAddress, userAgent) {
    // Invalidate any existing tokens for this user
    await this.updateMany(
        { userId, usedAt: null },
        { $set: { usedAt: new Date() } }
    );

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.create({
        userId,
        token: hashedToken,
        email: email.toLowerCase().trim(),
        expiresAt,
        ipAddress,
        userAgent,
    });

    return token; // Return plain token for email
};

passwordResetTokenSchema.statics.findByToken = async function (plainToken) {
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    return this.findOne({
        token: hashedToken,
        usedAt: null,
        expiresAt: { $gt: new Date() },
    }).populate('userId');
};

passwordResetTokenSchema.statics.consumeToken = async function (tokenId) {
    return this.findByIdAndUpdate(
        tokenId,
        { $set: { usedAt: new Date() } },
        { new: true }
    );
};

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

export default PasswordResetToken;
