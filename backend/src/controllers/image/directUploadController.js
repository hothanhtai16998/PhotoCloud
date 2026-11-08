import {
  createImageDocument,
  extractDirectUploadMetadata,
} from '../../services/media/directUpload.js';
import crypto from 'crypto';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { findCategory } from '../../services/media/imageHelpers.js';
import { validateFileType } from '../../utils/fileTypeUtils.js';
import Notification from '../../models/Notification.js';
import Settings from '../../models/Settings.js';
import {
  uploadImageWithSizes,
  uploadVideo,
  deleteImageFromR2,
} from '../../config/storage.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';
import { logger } from '../../utils/logger.js';

// small constants used in this controller

// Safe wrapper for optional async helpers (prevents "reading 'catch' of undefined")
const safeAsync = (fn, ...args) => {
  try {
    if (typeof fn === 'function') {
      return Promise.resolve(fn(...args));
    }
  } catch (err) {
    return Promise.reject(err);
  }
  // If fn is not provided, return a resolved promise so callers can safely chain .catch
  return Promise.resolve();
};

/**
 * Generate secure random upload ID
 */

/**
 * Extract metadata from image buffer in parallel
 */
export const uploadImage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
  const {
    imageTitle,
    imageCategory,
    location,
    cameraModel,
    coordinates,
    tags,
  } = req.body;

  if (!req.file) {
    return res.status(400).json({
      message: 'Bạn chưa chọn ảnh',
    });
  }

  const trimmedTitle = String(imageTitle || '').trim();
  if (!trimmedTitle) {
    return res.status(400).json({
      message: 'Tiêu đề ảnh không được để trống',
    });
  }

  const isImage = req.file.mimetype.startsWith('image/');
  let isVideo = req.file.mimetype.startsWith('video/');

  if (!isImage && !isVideo) {
    return res.status(400).json({
      message: 'Tệp được chọn phải là ảnh hoặc video',
    });
  }

  // Get settings for file type validation
  const systemSettings = await Settings.findOne({ key: 'system' });
  const allowedFileTypes = systemSettings?.value?.allowedFileTypes || [
    'jpg',
    'jpeg',
    'png',
    'webp',
  ];

  // Validate file type against settings
  const allowedExtensions = Array.isArray(allowedFileTypes)
    ? allowedFileTypes.map((t) => t.toLowerCase())
    : allowedFileTypes.split(',').map((t) => t.trim().toLowerCase());

  if (
    !validateFileType(
      req.file.mimetype,
      req.file.originalname,
      allowedFileTypes
    )
  ) {
    return res.status(400).json({
      message: `Định dạng file không được phép. Các định dạng được phép: ${allowedExtensions.join(', ')}`,
    });
  }

  let categoryDoc;
  try {
    categoryDoc = await findCategory(imageCategory);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  let uploadResult;
  try {
    // Generate secure filename
    const filename = `image-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    const fileSizeMB = req.file.buffer.length / (1024 * 1024);
    logger.info(
      `[UPLOAD CONTROLLER] File received: mimetype=${req.file.mimetype}, size=${fileSizeMB.toFixed(2)}MB, isVideo=${isVideo}`
    );

    // Upload video or image to S3
    // Note: Large GIFs (>2MB) will be automatically converted to video by uploadImageWithSizes
    if (isVideo) {
      logger.info(`[UPLOAD CONTROLLER] Uploading as video...`);
      uploadResult = await uploadVideo(
        req.file.buffer,
        'photo-app-images',
        filename,
        req.file.mimetype
      );
    } else {
      logger.info(
        `[UPLOAD CONTROLLER] Uploading as image (will check for GIF conversion)...`
      );
      uploadResult = await uploadImageWithSizes(
        req.file.buffer,
        'photo-app-images',
        filename,
        req.file.mimetype
      );
    }

    logger.info(
      `[UPLOAD CONTROLLER] Upload result: isVideo=${uploadResult.isVideo || false}`
    );

    // Check if GIF was converted to video
    const wasConvertedToVideo = uploadResult.isVideo || false;
    const finalIsVideo = isVideo || wasConvertedToVideo;

    // Extract metadata in parallel (skip for videos and converted GIFs)
    const metadata = finalIsVideo
      ? { dominantColors: [], exifData: {} }
      : await extractDirectUploadMetadata(req.file.buffer);

    // Create image document
    const newImage = await createImageDocument(
      uploadResult,
      userId,
      categoryDoc,
      metadata,
      {
        imageTitle: trimmedTitle,
        location,
        coordinates,
        cameraModel,
        tags,
        isAdmin,
        isVideo: finalIsVideo,
      }
    );

    await newImage.populate('uploadedBy', 'username displayName avatarUrl');
    await newImage.populate('imageCategory', 'name description');

    // Clear cache asynchronously (safe)
    safeAsync(clearCache, '/api/images').catch((err) =>
      logger.warn('Failed to clear cache:', err?.message || err)
    );

    // Create success notification (async)
    safeAsync(Notification?.create, {
      recipient: userId,
      type: 'upload_completed',
      image: newImage._id,
      metadata: { imageTitle: trimmedTitle },
    }).catch((err) =>
      logger.error('Failed to create notification:', err?.message || err)
    );

    res.status(201).json({
      message: 'Thêm ảnh thành công',
      image: newImage,
    });
  } catch (error) {
    // Rollback S3 upload if DB save failed
    if (uploadResult?.publicId) {
      deleteImageFromR2(uploadResult.publicId, 'photo-app-images').catch(
        (err) => {
          logger.error('Rollback failed:', err.message);
        }
      );
    }

    logger.error('Upload failed:', {
      message: error.message,
      fileSize: req.file?.size,
    });

    if (error.message?.includes('timeout')) {
      throw new Error(
        'Lỗi tải ảnh: vui lòng thử lại với ảnh có dung lượng nhỏ hơn'
      );
    }

    throw error;
  }
});
