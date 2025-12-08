import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                'collection_invited',
                'collection_image_added',
                'collection_image_removed',
                'collection_permission_changed',
                'collection_removed',
                'image_favorited',
                'image_downloaded',
                'collection_favorited',
                'collection_shared',
                'upload_completed',
                'upload_failed',
                'upload_processing',
                'bulk_upload_completed',
                'collection_updated',
                'collection_cover_changed',
                'collection_reordered',
                'bulk_delete_completed',
                'bulk_add_to_collection',
                'image_featured',
                'image_removed',
                'account_verified',
                'account_warning',
                'account_banned',
                'user_banned_admin',
                'user_unbanned_admin',
                'image_removed_admin',
                'profile_viewed',
                'profile_updated',
                'login_new_device',
                'password_changed',
                'email_changed',
                'two_factor_enabled',
                'system_announcement',
                'feature_update',
                'maintenance_scheduled',
                'terms_updated',
                'image_reported',
                'collection_reported',
                'user_reported',
                'user_followed',
                'user_unfollowed',
            ],
            index: true,
        },
        collection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Collection',
            // Not required - only for collection-related notifications
            index: true,
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // User who performed the action (e.g., who invited, who added image)
        },
        image: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
            // For image-related notifications
        },
        follow: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Follow',
            // For follow-related notifications
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            // Additional data like permission level, etc.
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        suppressReservedKeysWarning: true, // Suppress warning for 'collection' field (reserved but safe to use here)
    }
);

// Compound indexes for common queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Ensure virtuals are included in JSON
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

