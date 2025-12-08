import mongoose from 'mongoose';

const collectionTemplateSchema = new mongoose.Schema(
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
        // Template metadata
        templateName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        category: {
            type: String,
            trim: true,
            enum: ['travel', 'wedding', 'product', 'portfolio', 'event', 'personal', 'other'],
            default: 'other',
        },
        // Default values for new collections created from this template
        defaultTags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
        defaultIsPublic: {
            type: Boolean,
            default: true,
        },
        // Template creator
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // Whether this is a system template (created by admin) or user template
        isSystemTemplate: {
            type: Boolean,
            default: false,
        },
        // Usage count - how many times this template has been used
        usageCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Template icon/thumbnail (optional)
        iconUrl: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
collectionTemplateSchema.index({ createdBy: 1, createdAt: -1 });
collectionTemplateSchema.index({ isSystemTemplate: 1, category: 1 });
collectionTemplateSchema.index({ name: 'text', description: 'text', templateName: 'text' });

const CollectionTemplate = mongoose.model('CollectionTemplate', collectionTemplateSchema);

export default CollectionTemplate;

