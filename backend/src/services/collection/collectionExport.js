import axios from 'axios';
import JSZip from 'jszip';
import Collection from '../../models/Collection.js';
import Notification from '../../models/Notification.js';
import { getUserId } from '../../utils/collectionAccess.js';
import { logger } from '../../utils/logger.js';
import { publicImageFilter } from '../../utils/publicImageFilter.js';

const DOWNLOAD_CONCURRENCY = 4;

const sanitizeName = name => name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);

export async function recordCollectionShare(collectionId, userId) {
    const collection = await Collection.findOne({
        _id: collectionId,
        $or: [{ createdBy: userId }, { isPublic: true }, { 'collaborators.user': userId }],
    }).populate('createdBy', '_id').lean();

    if (!collection) return null;
    const createdBy = getUserId(collection.createdBy);
    if (!createdBy) return 'Collection share tracked (owner unavailable)';
    if (String(createdBy) === String(userId)) return 'Collection share tracked (no notification for own collection)';

    await Notification.create({
        recipient: createdBy,
        type: 'collection_shared',
        collection: collectionId,
        actor: userId,
        metadata: { collectionName: collection.name },
    });

    return 'Collection share tracked';
}

export async function createCollectionExport(collectionId, userId, { signal } = {}) {
    signal?.throwIfAborted();
    const collection = await Collection.findOne({
        _id: collectionId,
        $or: [{ createdBy: userId }, { isPublic: true }],
    }).populate({
        path: 'images',
        select: 'imageUrl regularUrl smallUrl imageTitle',
        match: publicImageFilter(),
    });

    signal?.throwIfAborted();
    if (!collection) {
        return { status: 404, message: 'Không tìm thấy bộ sưu tập' };
    }
    if (!collection.images?.length) {
        return { status: 400, message: 'Bộ sưu tập không có ảnh nào để xuất' };
    }

    try {
        const zip = new JSZip();
        const entries = collection.images.entries();
        // Share the iterator so each worker takes the next image as soon as it is free.
        await Promise.all(Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, collection.images.length) }, async () => {
            for (const [index, image] of entries) {
                if (signal?.aborted) return;
                const url = image.imageUrl || image.regularUrl || image.smallUrl;
                if (!url) {
                    logger.warn(`Image ${image._id} has no URL, skipping`);
                    continue;
                }

                try {
                    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, signal });
                    if (signal?.aborted) return;
                    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
                    if (!buffer.length) {
                        logger.warn(`Image ${image._id} returned no bytes, skipping`);
                        continue;
                    }
                    const position = index + 1;
                    const title = sanitizeName(image.imageTitle || `image-${position}`);
                    const extension = url.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'jpg';
                    // Keep equal titles as separate entries regardless of download order.
                    zip.file(`${position}_${title}.${extension}`, buffer);
                } catch (error) {
                    if (signal?.aborted) return;
                    logger.error(`Failed to fetch image ${image._id}:`, error?.code || 'download failed');
                }
            }
        }));

        signal?.throwIfAborted();
        if (!Object.keys(zip.files).length) {
            return { status: 502, message: 'Không tải được ảnh nào để xuất. Vui lòng thử lại.' };
        }

        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });
        signal?.throwIfAborted();
        return { buffer, filename: `${sanitizeName(collection.name)}_${Date.now()}.zip` };
    } catch (error) {
        signal?.throwIfAborted();
        logger.error('Error exporting collection:', error);
        return { status: 500, message: 'Lỗi khi xuất bộ sưu tập. Vui lòng thử lại.' };
    }
}
