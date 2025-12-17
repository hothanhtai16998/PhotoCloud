import mongoose from 'mongoose';

const collectionVersionSchema = new mongoose.Schema(
    {
        collection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Collection',
            required: true,
            index: true,
        },
        versionNumber: {
            type: Number,
            required: true,
            min: 1,
        },
        // Snapshot of collection data at this version
        snapshot: {
            name: String,
            description: String,
            isPublic: Boolean,
            tags: [String],
            coverImage: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Image',
            },
            images: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Image',
            }],
            collaborators: [{
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                permission: {
                    type: String,
                    enum: ['view', 'edit', 'admin'],
                },
                invitedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                invitedAt: Date,
            }],
        },
        // What changed in this version
        changes: {
            type: {
                type: String,
                enum: ['created', 'updated', 'image_added', 'image_removed', 'reordered', 'collaborator_added', 'collaborator_removed', 'permission_changed'],
                required: true,
            },
            description: {
                type: String,
                trim: true,
            },
            // Specific change details
            fieldChanged: String, // e.g., 'name', 'description', 'isPublic'
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed,
            imageId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Image',
            },
            collaboratorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        },
        // Who made this change
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // Optional note about this version
        note: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
        suppressReservedKeysWarning: true, // Suppress warning for 'collection' field (reserved but safe to use here)
    }
);

// Compound indexes
collectionVersionSchema.index({ collection: 1, versionNumber: -1 });
collectionVersionSchema.index({ collection: 1, createdAt: -1 });
collectionVersionSchema.index({ changedBy: 1, createdAt: -1 });

// Ensure version numbers are unique per collection
collectionVersionSchema.index({ collection: 1, versionNumber: 1 }, { unique: true });

const CollectionVersion = mongoose.model('CollectionVersion', collectionVersionSchema);

export default CollectionVersion;

