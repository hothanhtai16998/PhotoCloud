import UploadJob from '../../models/UploadJob.js';
import Image from '../../models/Image.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';

export const getUploadStatus = asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const job = await UploadJob.findOne({ _id: req.params.uploadId, userId: req.user._id, kind: 'upload' }).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Không tìm thấy phiên tải lên.' });
    const image = job.status === 'completed' ? await Image.findById(job.imageId)
        .populate('uploadedBy', 'username displayName avatarUrl')
        .populate('imageCategory', 'name description').lean() : null;
    if (job.status === 'completed' && !image) return res.status(410).json({ success: false, message: 'Ảnh không còn tồn tại.' });
    res.json({ success: true, uploadId: job._id, status: job.status,
        message: job.status === 'failed' ? job.lastError : undefined, image: image || undefined });
});
