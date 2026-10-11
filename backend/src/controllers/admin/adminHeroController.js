import HeroConfig from '../../models/HeroConfig.js';
import Collection from '../../models/Collection.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';

/**
 * Lấy cấu hình hero hiện tại (admin).
 * Trả về 4 ID collection đang được pin + danh sách collection public để admin chọn.
 */
export const getHeroConfig = asyncHandler(async (req, res) => {
    const config = await HeroConfig.findById('hero-singleton').lean();

    // Lấy tất cả collection public có ảnh để admin chọn
    const allCollections = await Collection.find({ isPublic: true })
        .select('_id name coverImage imageCount updatedAt')
        .populate('coverImage', 'url thumbnailUrl')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean();

    res.json({
        success: true,
        config: {
            selectedIds: config?.selectedCollections || [],
            updatedAt: config?.updatedAt || null,
            updatedBy: config?.updatedBy || null,
        },
        availableCollections: allCollections,
    });
});

/**
 * Cập nhật 4 collection hiển thị trên hero.
 * Body: { collectionIds: string[] } — tối đa 4.
 */
export const updateHeroConfig = asyncHandler(async (req, res) => {
    const { collectionIds } = req.body;

    if (!Array.isArray(collectionIds)) {
        return res.status(400).json({
            success: false,
            message: 'collectionIds phải là mảng.',
        });
    }

    if (collectionIds.length > 4) {
        return res.status(400).json({
            success: false,
            message: 'Tối đa 4 bộ sưu tập được chọn.',
        });
    }

    // Verify các collection tồn tại và public
    if (collectionIds.length > 0) {
        const valid = await Collection.countDocuments({
            _id: { $in: collectionIds },
            isPublic: true,
        });
        if (valid !== collectionIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Một số bộ sưu tập không tồn tại hoặc không công khai.',
            });
        }
    }

    const updated = await HeroConfig.findByIdAndUpdate(
        'hero-singleton',
        {
            selectedCollections: collectionIds,
            updatedBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
        success: true,
        message:
            collectionIds.length === 0
                ? 'Đã xóa cấu hình. Hệ thống sẽ random 4 bộ sưu tập mỗi 24h.'
                : `Đã cập nhật ${collectionIds.length} bộ sưu tập cho hero.`,
        config: {
            selectedIds: updated.selectedCollections,
            updatedAt: updated.updatedAt,
        },
    });
});
