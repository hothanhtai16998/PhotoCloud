/**
 * Application constants
 */

// Upload folder constants
export const RAW_UPLOAD_FOLDER = 'photo-app-raw';

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};

export const FILE_UPLOAD = {
    MAX_SIZE: 10 * 1024 * 1024, // 10 MB
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
    ],
};

export const TOKEN = {
    ACCESS_TOKEN_TTL: '30m',
    REFRESH_TOKEN_TTL: 14 * 24 * 60 * 60 * 1000, // 14 days
};

