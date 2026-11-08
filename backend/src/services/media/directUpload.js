import { extractImageMetadata } from './imageMetadata.js';

export const extractDirectUploadMetadata = (buffer) =>
  extractImageMetadata(buffer, { includeDimensions: false });

import Image from '../../models/Image.js';
import { parseTags, validateCoordinates } from './imageHelpers.js';

const MAX_IMAGE_TITLE_LENGTH = 255;

/**
 * Create image document in database
 */
export const createImageDocument = async (
  uploadResult,
  userId,
  categoryDoc,
  metadata,
  input
) => {
  const { dominantColors, exifData } = metadata;
  const {
    imageTitle,
    location,
    coordinates,
    cameraModel,
    tags,
    isVideo = false,
  } = input;

  const parsedTags = parseTags(tags);
  const parsedCoordinates = validateCoordinates(coordinates);

  const isAdmin = input.isAdmin || false;
  const moderationStatus = isAdmin ? 'approved' : 'pending';

  const safeTitle = String(imageTitle || '').substring(
    0,
    MAX_IMAGE_TITLE_LENGTH
  );

  const imageData = {
    imageUrl: uploadResult.imageUrl,
    thumbnailUrl: uploadResult.thumbnailUrl,
    smallUrl: uploadResult.smallUrl,
    regularUrl: uploadResult.regularUrl,
    imageAvifUrl: uploadResult.imageAvifUrl,
    thumbnailAvifUrl: uploadResult.thumbnailAvifUrl,
    smallAvifUrl: uploadResult.smallAvifUrl,
    regularAvifUrl: uploadResult.regularAvifUrl,
    publicId: uploadResult.publicId,
    imageTitle: safeTitle,
    imageCategory: categoryDoc._id,
    uploadedBy: userId,
    location: location?.trim() || undefined,
    coordinates: parsedCoordinates,
    cameraMake: exifData.cameraMake || undefined,
    cameraModel: exifData.cameraModel || cameraModel?.trim() || undefined,
    focalLength: exifData.focalLength || undefined,
    aperture: exifData.aperture || undefined,
    shutterSpeed: exifData.shutterSpeed || undefined,
    iso: exifData.iso || undefined,
    dominantColors: dominantColors.length > 0 ? dominantColors : undefined,
    tags: parsedTags.length > 0 ? parsedTags : undefined,
    moderationStatus,
    isModerated: isAdmin,
    // Video fields
    isVideo: isVideo || uploadResult.isVideo || false,
    ...((isVideo || uploadResult.isVideo) && uploadResult.videoUrl
      ? {
          videoUrl: uploadResult.videoUrl,
          videoThumbnail: uploadResult.thumbnailUrl || uploadResult.videoUrl,
          videoDuration: uploadResult.videoDuration || undefined,
        }
      : {}),
    ...(isAdmin
      ? {
          moderatedAt: new Date(),
          moderatedBy: userId,
        }
      : {}),
  };

  return Image.create(imageData);
};
