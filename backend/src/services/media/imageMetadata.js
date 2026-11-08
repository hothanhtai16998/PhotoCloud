import sharp from 'sharp';
import { extractDominantColors } from './colorExtractor.js';
import { extractExifData } from './exifExtractor.js';
import { logger } from '../../utils/logger.js';

/** Share color/EXIF fallbacks; direct upload deliberately skips dimension decoding. */
export async function extractImageMetadata(
  imageBuffer,
  { includeDimensions = true } = {}
) {
  try {
    const [dominantColors, exifData, dimensions] = await Promise.all([
      extractDominantColors(imageBuffer, 3).catch((error) => {
        logger.warn('Failed to extract colors:', error.message);
        return [];
      }),
      extractExifData(imageBuffer).catch((error) => {
        logger.warn('Failed to extract EXIF:', error.message);
        return {};
      }),
      ...(includeDimensions
        ? [
            sharp(imageBuffer)
              .metadata()
              .then((metadata) => ({
                width: metadata.width || null,
                height: metadata.height || null,
              }))
              .catch((error) => {
                logger.warn('Failed to extract dimensions:', error.message);
                return { width: null, height: null };
              }),
          ]
        : []),
    ]);
    return {
      dominantColors,
      exifData,
      ...(includeDimensions ? { dimensions } : {}),
    };
  } catch (error) {
    logger.warn('Failed to extract metadata:', error.message);
    return {
      dominantColors: [],
      exifData: {},
      ...(includeDimensions
        ? { dimensions: { width: null, height: null } }
        : {}),
    };
  }
}
