import mongoose from 'mongoose';

// Safely convert any value to a trimmed string
export const safeTrim = (value) => String(value || '').trim();

// Escape user input for safe RegExp construction
export const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Validate MongoDB ObjectId safely
export const isValidObjectId = (id) => {
    try {
        return mongoose.Types.ObjectId.isValid(String(id || ''));
    } catch (_) {
        return false;
    }
};

// Normalize email for comparisons
export const normalizeEmail = (email) => {
    const s = safeTrim(email);
    return s.length ? s.toLowerCase() : undefined;
};

export default {
    safeTrim,
    escapeRegex,
    isValidObjectId,
    normalizeEmail,
};
