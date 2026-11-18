import mongoose from 'mongoose';
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
        const result = await createCollectionExport(collectionId, req.user._id, { signal: cancellation.signal });
        if (cancellation.signal.aborted || res.destroyed) return;
        if (!result.buffer) {
            return res.status(result.status).json({ success: false, message: result.message });
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
