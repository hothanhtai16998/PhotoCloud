import mongoose from 'mongoose';

/**
 * HeroConfig — cấu hình 4 collection hiển thị trên hero banner.
 * Là singleton: luôn chỉ có 1 document duy nhất (dùng fixed _id 'hero-singleton').
 * Nếu `selectedCollections` rỗng → client dùng fallback random 4 collection public mỗi 24h.
 */
const heroConfigSchema = new mongoose.Schema(
    {
        // Fixed ID để đảm bảo singleton
        _id: {
            type: String,
            default: 'hero-singleton',
        },
        selectedCollections: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Collection',
            },
        ],
        // Track ai update lần cuối
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Validation: tối đa 4 collection
heroConfigSchema.path('selectedCollections').validate(function (value) {
    return !value || value.length <= 4;
}, 'Tối đa 4 bộ sưu tập được chọn cho hero.');

const HeroConfig = mongoose.model('HeroConfig', heroConfigSchema);

export default HeroConfig;
