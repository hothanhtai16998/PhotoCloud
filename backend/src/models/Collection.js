import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        images: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
        }],
        isPublic: {
            type: Boolean,
            default: true,
            index: true,
        },
        coverImage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
            // Optional - first image or user-selected cover
        },
        // Track how many times collection was viewed
        views: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Tags for organizing collections
        tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
        // Collaborators - users who have access to this collection
        collaborators: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            permission: {
                type: String,
                enum: ['view', 'edit', 'admin'],
                default: 'view',
            },
            invitedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            invitedAt: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
collectionSchema.index({ createdBy: 1, createdAt: -1 });
collectionSchema.index({ isPublic: 1, createdAt: -1 });
collectionSchema.index({ name: 'text', description: 'text' }); // Text search
collectionSchema.index({ tags: 1 }); // Index for tag filtering
collectionSchema.index({ 'collaborators.user': 1 }); // Index for collaborator queries

// Virtual for image count
collectionSchema.virtual('imageCount').get(function() {
    return this.images ? this.images.length : 0;
});

// Ensure virtuals are included in JSON
collectionSchema.set('toJSON', { virtuals: true });
collectionSchema.set('toObject', { virtuals: true });

const Collection = mongoose.model('Collection', collectionSchema);

export default Collection;


