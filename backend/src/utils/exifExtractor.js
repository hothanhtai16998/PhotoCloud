import sharp from 'sharp';
import { logger } from './logger.js';
import exifParser from 'exif-parser';

/**
 * Extract EXIF metadata from image buffer
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} Object with EXIF data (cameraMake, cameraModel, focalLength, aperture, shutterSpeed, iso)
 */
export const extractExifData = async (imageBuffer) => {
    try {
        // Get metadata from Sharp (includes some basic info)
        const metadata = await sharp(imageBuffer).metadata();
        
        // Helper function to parse EXIF values
        const parseExifValue = (value) => {
            if (value === undefined || value === null) return undefined;
            if (typeof value === 'string') return value.trim() || undefined;
            return value;
        };

        // Try to get EXIF data from Sharp's metadata first (if available)
        let cameraMake = metadata.make || undefined;
        let cameraModel = metadata.model || undefined;
        let focalLength = metadata.focalLength || undefined;
        let aperture = metadata.fNumber || undefined;
        let shutterSpeed = metadata.exposureTime || undefined;
        let iso = metadata.iso || undefined;

        // Try to parse EXIF directly from image buffer using exif-parser
        // This works for JPEG files
        try {
            const parser = exifParser.create(imageBuffer);
            const exifData = parser.parse();
            
            // Extract from parsed EXIF data
            // EXIF tag numbers: Make=271, Model=272, FocalLength=37386, FNumber=37378, ExposureTime=33434, ISO=34855
            if (!cameraMake && exifData.tags?.Make) {
                cameraMake = exifData.tags.Make;
            }
            if (!cameraModel && exifData.tags?.Model) {
                cameraModel = exifData.tags.Model;
            }
            if (!focalLength && exifData.tags?.FocalLength) {
                // FocalLength is usually a fraction like [60, 1] or number
                const focal = exifData.tags.FocalLength;
                if (Array.isArray(focal) && focal.length === 2) {
                    focalLength = focal[0] / focal[1];
                } else if (typeof focal === 'number') {
                    focalLength = focal;
                }
            }
            if (!aperture && exifData.tags?.FNumber) {
                // FNumber is usually a fraction like [9, 1] or number
                const fnum = exifData.tags.FNumber;
                if (Array.isArray(fnum) && fnum.length === 2) {
                    aperture = fnum[0] / fnum[1];
                } else if (typeof fnum === 'number') {
                    aperture = fnum;
                }
            }
            if (!shutterSpeed && exifData.tags?.ExposureTime) {
                // ExposureTime is usually a fraction like [1, 80] or number in seconds
                const exp = exifData.tags.ExposureTime;
                if (Array.isArray(exp) && exp.length === 2) {
                    const seconds = exp[0] / exp[1];
                    if (seconds < 1) {
                        const denominator = Math.round(1 / seconds);
                        shutterSpeed = `1/${denominator}`;
                    } else {
                        shutterSpeed = `${seconds}s`;
                    }
                } else if (typeof exp === 'number') {
                    if (exp < 1) {
                        const denominator = Math.round(1 / exp);
                        shutterSpeed = `1/${denominator}`;
                    } else {
                        shutterSpeed = `${exp}s`;
                    }
                }
            }
            if (!iso && exifData.tags?.ISOSpeedRatings) {
                // ISO can be a number or array
                const isoValue = exifData.tags.ISOSpeedRatings;
                if (Array.isArray(isoValue)) {
                    iso = isoValue[0];
                } else {
                    iso = isoValue;
                }
            }
        } catch (exifParseError) {
            // If direct parsing fails, try Sharp's EXIF buffer if available
            if (metadata.exif && Buffer.isBuffer(metadata.exif)) {
                try {
                    const parser = exifParser.create(metadata.exif);
                    const exifData = parser.parse();
                    
                    // Extract from parsed EXIF data (same logic as above)
                    if (!cameraMake && exifData.tags?.Make) cameraMake = exifData.tags.Make;
                    if (!cameraModel && exifData.tags?.Model) cameraModel = exifData.tags.Model;
                    if (!focalLength && exifData.tags?.FocalLength) {
                        const focal = exifData.tags.FocalLength;
                        if (Array.isArray(focal) && focal.length === 2) {
                            focalLength = focal[0] / focal[1];
                        } else if (typeof focal === 'number') {
                            focalLength = focal;
                        }
                    }
                    if (!aperture && exifData.tags?.FNumber) {
                        const fnum = exifData.tags.FNumber;
                        if (Array.isArray(fnum) && fnum.length === 2) {
                            aperture = fnum[0] / fnum[1];
                        } else if (typeof fnum === 'number') {
                            aperture = fnum;
                        }
                    }
                    if (!shutterSpeed && exifData.tags?.ExposureTime) {
                        const exp = exifData.tags.ExposureTime;
                        if (Array.isArray(exp) && exp.length === 2) {
                            const seconds = exp[0] / exp[1];
                            if (seconds < 1) {
                                const denominator = Math.round(1 / seconds);
                                shutterSpeed = `1/${denominator}`;
                            } else {
                                shutterSpeed = `${seconds}s`;
                            }
                        } else if (typeof exp === 'number') {
                            if (exp < 1) {
                                const denominator = Math.round(1 / exp);
                                shutterSpeed = `1/${denominator}`;
                            } else {
                                shutterSpeed = `${exp}s`;
                            }
                        }
                    }
                    if (!iso && exifData.tags?.ISOSpeedRatings) {
                        const isoValue = exifData.tags.ISOSpeedRatings;
                        if (Array.isArray(isoValue)) {
                            iso = isoValue[0];
                        } else {
                            iso = isoValue;
                        }
                    }
                } catch (bufferParseError) {
                    logger.debug('Failed to parse EXIF from Sharp buffer:', bufferParseError.message);
                }
            } else {
                logger.debug('No EXIF data found in image buffer or Sharp metadata');
            }
        }

        // Process and format the extracted values
        if (focalLength) {
            focalLength = typeof focalLength === 'number' ? Math.round(focalLength * 10) / 10 : undefined;
        }

        if (aperture) {
            aperture = typeof aperture === 'number' ? Math.round(aperture * 10) / 10 : undefined;
        }

        if (iso) {
            iso = typeof iso === 'number' ? Math.round(iso) : parseInt(iso, 10);
            if (isNaN(iso)) iso = undefined;
        }

        const result = {
            cameraMake: parseExifValue(cameraMake),
            cameraModel: parseExifValue(cameraModel),
            focalLength: focalLength,
            aperture: aperture,
            shutterSpeed: parseExifValue(shutterSpeed),
            iso: iso,
        };

        // Log if we found any EXIF data
        const hasExifData = Object.values(result).some(val => val !== undefined);
        if (hasExifData) {
            logger.info('Extracted EXIF data:', result);
        } else {
            logger.debug('No EXIF data found in image');
        }

        return result;
    } catch (error) {
        logger.warn('Failed to extract EXIF data:', error.message);
        // Return empty object if extraction fails
        return {
            cameraMake: undefined,
            cameraModel: undefined,
            focalLength: undefined,
            aperture: undefined,
            shutterSpeed: undefined,
            iso: undefined,
        };
    }
};

