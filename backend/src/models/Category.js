import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for active categories
categorySchema.index({ isActive: 1, name: 1 }); // For filtering active categories
categorySchema.index({ createdAt: -1 }); // For sorting categories by creation date

const Category = mongoose.model('Category', categorySchema);

export default Category;

