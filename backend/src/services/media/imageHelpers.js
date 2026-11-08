import mongoose from 'mongoose';
import Category from '../../models/Category.js';
import { logger } from '../../utils/logger.js'; // <--- ADD THIS LINE (top of file)

const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_IMAGE = 20;

/**
 * Find category by ID or name
 */
export const findCategory = async (categoryInput) => {
    const trimmed = String(categoryInput || '').trim();

    if (!trimmed) {
        throw new Error('Danh mục không được để trống');
    }

    let categoryDoc;
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
        categoryDoc = await Category.findById(trimmed);
    } else {
        categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            isActive: true,
        });
    }

    if (!categoryDoc) {
        throw new Error('Danh mục ảnh không tồn tại hoặc đã bị xóa');
    }

    return categoryDoc;
};

/**
 * Parse and validate tags
 */
export const parseTags = (tagsInput) => {
    let tagsArray = [];

    if (!tagsInput) return [];

    try {
        tagsArray = typeof tagsInput === 'string' ? JSON.parse(tagsInput) : tagsInput;
        if (!Array.isArray(tagsArray)) return [];
    } catch (error) {
        logger.warn('Invalid tags format:', error.message);
        return [];
    }

    // Use Set for O(n) deduplication instead of O(n²) filter
    const uniqueTags = new Set();
    return tagsArray
        .map(tag => (typeof tag === 'string' ? tag : String(tag)).trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= MAX_TAG_LENGTH)
        .filter(tag => {
            if (uniqueTags.has(tag)) return false;
            uniqueTags.add(tag);
            return true;
        })
        .slice(0, MAX_TAGS_PER_IMAGE);
};

/**
 * Validate and parse coordinates
 */
export const validateCoordinates = (coordinates) => {
    if (!coordinates) return undefined;

    try {
        const parsed = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;

        if (!parsed.latitude || !parsed.longitude) return undefined;

        const lat = parseFloat(parsed.latitude);
        const lng = parseFloat(parsed.longitude);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return undefined;
        }

        return { latitude: lat, longitude: lng };
    } catch (error) {
        logger.warn('Invalid coordinates format:', error.message);
        return undefined;
    }
};

/**
 * Convert stream to buffer
 */
export const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

export { extractImageMetadata as extractMetadata } from './imageMetadata.js';
