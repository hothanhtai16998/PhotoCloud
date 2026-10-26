import mongoose from 'mongoose';

const bookingPackageSchema = new mongoose.Schema(
    {
        slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, required: true, trim: true, maxlength: 1000 },
        detailDescription: { type: String, trim: true, maxlength: 5000, default: '' },
        coverUrl: { type: String, trim: true, maxlength: 2048, default: '' },
        includes: { type: [String], default: [] },
        gallery: { type: [String], default: [] },
        durationMinutes: { type: Number, required: true, min: 15, max: 1440 },
        basePrice: { type: Number, required: true, min: 0 },
        includedPhotos: { type: Number, required: true, min: 0 },
        includedPeople: { type: Number, required: true, min: 1, max: 100 },
        deliveryDays: { type: Number, required: true, min: 1, max: 365 },
        category: { type: String, required: true, trim: true, maxlength: 60 },
        active: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model('BookingPackage', bookingPackageSchema);
