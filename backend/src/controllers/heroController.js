import HeroConfig from '../models/HeroConfig.js';
import Collection from '../models/Collection.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

/**
 * Lấy 4 collection hiển thị trên hero.
 * - Nếu admin đã cấu hình → trả về đúng các collection đó
 * - Nếu chưa cấu hình hoặc collection bị xóa → fallback random 4 collection public
 * Cache 5 phút ở client (qua Cache-Control).
 */
export const getHeroCollections = asyncHandler(async (req, res) => {
    const config = await HeroConfig.findById('hero-singleton').lean();

    let collections = [];

    if (config && config.selectedCollections && config.selectedCollections.length > 0) {
        // Admin đã chọn → lấy đúng các collection đó, giữ thứ tự
        collections = await Collection.find({
            _id: { $in: config.selectedCollections },
            isPublic: true,
        })
            .select('_id name description coverImage sampleImages imageCount views updatedAt')
            .populate('coverImage', 'url thumbnailUrl width height')
            .populate('sampleImages', 'url thumbnailUrl width height')
            .lean();

        // Sắp xếp lại theo thứ tự admin đã chọn
        const orderMap = new Map(config.selectedCollections.map((id, idx) => [String(id), idx]));
        collections.sort((a, b) => (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0));
    }

    // Fallback: random 4 public collection có ảnh
    if (collections.length === 0) {
        // Match mọi collection public có ít nhất 1 ảnh
        const pool = await Collection.aggregate([
            { $match: { isPublic: true, images: { $exists: true, $ne: [] } } },
            { $sample: { size: 4 } },
            {
                $project: {
                    name: 1,
                    description: 1,
                    coverImage: 1,
                    sampleImages: { $slice: ['$images', 3] },
                    imageCount: { $size: '$images' },
                    views: 1,
                    updatedAt: 1,
                },
            },
        ]);

        // Populate coverImage + sampleImages sau
        if (pool.length > 0) {
            const coverIds = pool.map((c) => c.coverImage).filter(Boolean);
            const sampleIds = pool.flatMap((c) => c.sampleImages || []);
            const allIds = [...new Set([...coverIds, ...sampleIds].map(String))];

            const Image = (await import('../models/Image.js')).default;
            const images = await Image.find({ _id: { $in: allIds } })
                .select('url thumbnailUrl width height')
                .lean();
            const imageMap = new Map(images.map((img) => [String(img._id), img]));

            collections = pool.map((c) => ({
                ...c,
                coverImage: c.coverImage ? imageMap.get(String(c.coverImage)) || null : null,
                sampleImages: (c.sampleImages || [])
                    .map((id) => imageMap.get(String(id)))
                    .filter(Boolean),
            }));
        }
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
    res.json({
        success: true,
        collections,
        isAdminPicked: !!(config && config.selectedCollections && config.selectedCollections.length > 0),
        updatedAt: config?.updatedAt || null,
    });
});
