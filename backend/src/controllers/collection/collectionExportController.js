import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { recordCollectionShare, createCollectionExport } from '../../services/collection/collectionExport.js';
import { logger } from '../../utils/logger.js';

export const trackCollectionShare = asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    try {
        const message = await recordCollectionShare(collectionId, req.user._id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Collection not found' });
        }
        return res.json({ success: true, message });
    } catch (error) {
        logger.error('Error tracking collection share:', error);
        return res.status(500).json({ success: false, message: 'Failed to track collection share' });
    }
});

export const exportCollection = asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    let imageIds;
    if (req.method === 'POST' && req.body?.imageIds !== undefined) {
        if (!Array.isArray(req.body.imageIds) || !req.body.imageIds.length ||
            req.body.imageIds.some(id => typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id))) {
            return res.status(400).json({ success: false, message: 'Danh sách ảnh cần tải lại không hợp lệ.' });
        }
        imageIds = [...new Set(req.body.imageIds.map(id => id.toLowerCase()))];
    }

    const cancellation = new AbortController();
    // Leave room for the browser's 120-second request timeout to receive a clear error.
    const deadline = setTimeout(() => {
        if (cancellation.signal.aborted || res.destroyed || res.writableEnded) return;
        cancellation.abort();
        res.status(504).json({
            success: false,
            message: 'Tạo tệp tải về quá lâu. Vui lòng thử lại với bộ sưu tập nhỏ hơn.',
        });
        res.removeListener('close', onClose);
    }, 110000);
    deadline.unref?.();
    const onClose = () => {
        if (!res.writableEnded) cancellation.abort();
        clearTimeout(deadline);
    };
    res.once('close', onClose);
    if (res.destroyed) cancellation.abort();
    try {
        const result = await createCollectionExport(collectionId, req.user._id, { signal: cancellation.signal, imageIds });
        if (cancellation.signal.aborted || res.destroyed) return;
        if (!result.buffer) {
            return res.status(result.status).json({ success: false, message: result.message, ...(req.method === 'POST' && result.failed ? { failed: result.failed } : {}) });
        }

        if (req.method === 'POST') {
            const boundary = `export-${randomUUID()}`;
            const report = JSON.stringify({ total: result.total, downloaded: result.downloaded, failed: result.failed });
            const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="report"\r\n\r\n${report}\r\n--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="collection.zip"\r\nContent-Type: application/zip\r\n\r\n`);
            const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
            res.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
            res.setHeader('Content-Length', prefix.length + result.buffer.length + suffix.length);
            res.status(200);
            res.write(prefix);
            res.write(result.buffer);
            return res.end(suffix);
        }

        res.setHeader('X-Export-Total', result.total);
        res.setHeader('X-Export-Downloaded', result.downloaded);
        res.setHeader('Access-Control-Expose-Headers', 'X-Export-Total, X-Export-Downloaded');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
        res.setHeader('Content-Length', result.buffer.length);
        return res.status(200).send(result.buffer);
    } catch (error) {
        if (!cancellation.signal.aborted) throw error;
    } finally {
        clearTimeout(deadline);
        res.removeListener('close', onClose);
    }
});
