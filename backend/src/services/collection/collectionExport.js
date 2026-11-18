import axios from 'axios';
import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns';
import JSZip from 'jszip';
import { getExtensionsFromMimeType } from '../../utils/fileTypeUtils.js';
import Collection from '../../models/Collection.js';
import Notification from '../../models/Notification.js';
import { getUserId } from '../../utils/collectionAccess.js';
import { logger } from '../../utils/logger.js';
import { publicImageFilter } from '../../utils/publicImageFilter.js';

const DOWNLOAD_CONCURRENCY = 4;

// Literal IP destinations must not reach local, private or reserved networks.
const blockedIPv4 = new BlockList();
for (const [network, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16],
    ['192.0.0.0', 24], ['192.0.2.0', 24], ['198.18.0.0', 15],
    ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blockedIPv4.addSubnet(network, prefix, 'ipv4');
const globalIPv6 = new BlockList();
globalIPv6.addSubnet('2000::', 3, 'ipv6');
const documentationIPv6 = new BlockList();
documentationIPv6.addSubnet('2001:db8::', 32, 'ipv6');

const sanitizeName = name => name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);

function isPublicAddress(address) {
    const family = isIP(address);
    return (family === 4 && !blockedIPv4.check(address, 'ipv4')) ||
        (family === 6 && globalIPv6.check(address, 'ipv6') && !documentationIPv6.check(address, 'ipv6'));
}

function lookupImageSource(hostname, options, callback) {
    // Validate the addresses actually supplied to the socket, without a second DNS lookup.
    lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error);
        if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
            return callback(new Error('Non-public image destination'));
        }
        if (options.all) return callback(null, addresses);
        return callback(null, addresses[0].address, addresses[0].family);
    });
}

function parseImageSource(url) {
    const source = new URL(url);
    if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password) {
        throw new Error('Unsupported image source');
    }
    const hostname = source.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost') ||
        (isIP(hostname) && !isPublicAddress(hostname))) {
        throw new Error('Non-public image destination');
    }
    return source;
}

function checkImageRedirect(options, _response, request) {
    // Axios may replace transport fields with a proxy; href still names the actual target.
    const target = parseImageSource(options.href);
    if (new URL(request.url).protocol === 'https:' && target.protocol !== 'https:') {
        throw new Error('Insecure image redirect');
    }
}

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
                    // Stored image locations must be web URLs, never inline data or credentials.
                    const source = parseImageSource(url);
                    const { data, headers, status } = await axios.get(url, {
                        responseType: 'arraybuffer',
                        timeout: 30000,
                        signal,
                        beforeRedirect: checkImageRedirect,
                        lookup: lookupImageSource,
                        // A proxy could resolve the destination itself and bypass the socket lookup.
                        proxy: false,
                    });
                    if (signal?.aborted) return;
                    // We never request byte ranges, so a partial response cannot be a complete export entry.
                    if (status === 206 || headers?.['content-range'] != null) {
                        throw new Error('Image source returned partial content');
                    }
                    const contentType = String(headers?.['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
                    // Error documents with HTTP 200 must not be counted as downloaded images.
                    if (contentType.startsWith('text/') ||
                        /^application\/(?:json|xml|[^;]+\+(?:json|xml))$/.test(contentType)) {
                        throw new Error('Image source returned an error document');
                    }
                    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
                    if (!buffer.length) {
                        logger.warn(`Image ${image._id} returned no bytes, skipping`);
                        continue;
                    }
                    const position = index + 1;
                    const title = sanitizeName(image.imageTitle || `image-${position}`);
                    const declaredExtension = getExtensionsFromMimeType(contentType)[0] ||
                        (contentType === 'image/avif' ? 'avif' : undefined);
                    const extension = declaredExtension || source.pathname.match(/\.([a-z0-9]{1,10})$/i)?.[1].toLowerCase() || 'jpg';
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
        return { total: collection.images.length, downloaded: Object.keys(zip.files).length, buffer, filename: `${sanitizeName(collection.name)}_${Date.now()}.zip` };
    } catch (error) {
        signal?.throwIfAborted();
        logger.error('Error exporting collection:', error);
        return { status: 500, message: 'Lỗi khi xuất bộ sưu tập. Vui lòng thử lại.' };
    }
}
