import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        refreshToken: {
            type: String,
            required: true,
            unique: true,
            index: true, // Explicit index for faster lookups
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        userAgent: {
            type: String,
            // Store user agent for device detection
        },
        ipAddress: {
            type: String,
            // Store IP address for device detection
        },
        deviceFingerprint: {
            type: String,
            // Hash of userAgent + IP for device identification
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// tự động xoá khi hết hạn
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", sessionSchema);
