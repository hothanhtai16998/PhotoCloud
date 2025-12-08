/**
 * Shared utilities for file type validation and MIME type handling
 */

/**
 * Map MIME types to file extensions
 * Used for validation and file type detection
 */
export const mimeToExtension = {
    // Image types
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/gif': ['gif'],
    'image/svg+xml': ['svg'],
    'image/bmp': ['bmp'],
    'image/x-icon': ['ico'],
    'image/vnd.microsoft.icon': ['ico'],
    // Video types
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'video/quicktime': ['mov'],
};

/**
 * Map MIME types to single extension (for video uploads)
 */
export const mimeToSingleExtension = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
};

/**
 * Extension mapping for special cases (e.g., jpeg -> jpg)
 */
export const extensionMap = {
    jpeg: 'jpg',
    'svg+xml': 'svg',
};

/**
 * Get file extension from MIME type
 * @param {string} mimetype - MIME type (e.g., 'image/jpeg')
 * @returns {string[]} Array of possible extensions
 */
export const getExtensionsFromMimeType = (mimetype) => {
    if (!mimetype) return [];
    return mimeToExtension[mimetype.toLowerCase()] || [];
};

/**
 * Get single extension from MIME type (for video)
 * @param {string} mimetype - MIME type (e.g., 'video/mp4')
 * @returns {string} Extension or 'mp4' as default
 */
export const getSingleExtensionFromMimeType = (mimetype) => {
    if (!mimetype) return 'mp4';
    return mimeToSingleExtension[mimetype.toLowerCase()] || 'mp4';
};

/**
 * Validate file type against allowed extensions
 * @param {string} mimetype - MIME type
 * @param {string} fileName - File name (for extension fallback)
 * @param {string[]|string} allowedFileTypes - Allowed file types from settings
 * @returns {boolean} True if file type is allowed
 */
export const validateFileType = (mimetype, fileName, allowedFileTypes) => {
    if (!mimetype || !allowedFileTypes) return false;

    // Normalize allowed file types to array
    const allowedExtensions = Array.isArray(allowedFileTypes)
        ? allowedFileTypes.map(t => t.toLowerCase())
        : allowedFileTypes.split(',').map(t => t.trim().toLowerCase());

    // Check file extension from filename
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isValidExtension = fileExtension && allowedExtensions.includes(fileExtension);

    // Check MIME type extensions
    const mimeTypeExtensions = getExtensionsFromMimeType(mimetype);
    const isValidMimeType = mimeTypeExtensions.some(ext => allowedExtensions.includes(ext));

    return isValidExtension || isValidMimeType;
};

