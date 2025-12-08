import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from './asyncHandler.js';
import { logger } from '../utils/logger.js';
import Settings from '../models/Settings.js';

/**
 * Middleware to check validation results
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg || err.message || 'Validation failed');
        // Redact sensitive fields before logging validation errors
        const safeBody = { ...(req.body || {}) };
        ['password', 'hashedPassword', 'token', 'accessToken', 'refreshToken'].forEach((k) => {
            if (k in safeBody) safeBody[k] = '[REDACTED]';
        });

        logger.warn('Validation failed', {
            url: req.url,
            method: req.method,
            body: safeBody,
            errors: errorMessages,
        });
        return res.status(400).json({
            message: 'Validation error',
            errors: errors.array(),
            errorMessages, // Add formatted messages for easier frontend handling
        });
    }
    next();
};

/**
 * Get password requirements from settings
 */
const getPasswordRequirements = async () => {
    try {
        const settings = await Settings.findOne({ key: 'system' });
        if (settings && settings.value) {
            return {
                minLength: settings.value.passwordMinLength || 8,
                requireUppercase: settings.value.passwordRequireUppercase ?? true,
                requireLowercase: settings.value.passwordRequireLowercase ?? true,
                requireNumber: settings.value.passwordRequireNumber ?? true,
                requireSpecialChar: settings.value.passwordRequireSpecialChar ?? false,
            };
        }
    } catch (error) {
        logger.warn('Could not load password requirements from settings, using defaults', { error: error.message });
    }
    // Default requirements
    return {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: false,
    };
};

/**
 * Build password validation regex based on requirements
 */
const buildPasswordRegex = (requirements) => {
    const parts = [];
    if (requirements.requireLowercase) parts.push('(?=.*[a-z])');
    if (requirements.requireUppercase) parts.push('(?=.*[A-Z])');
    if (requirements.requireNumber) parts.push('(?=.*\\d)');
    if (requirements.requireSpecialChar) parts.push('(?=.*[^a-zA-Z0-9])');
    
    if (parts.length === 0) {
        // No complexity requirements, just min length
        return new RegExp(`^.{${requirements.minLength},}$`);
    }
    
    return new RegExp(`^${parts.join('')}.{${requirements.minLength},}$`);
};

/**
 * Build password validation message based on requirements
 */
const buildPasswordMessage = (requirements) => {
    const parts = [];
    parts.push(`at least ${requirements.minLength} characters`);
    if (requirements.requireLowercase) parts.push('lowercase');
    if (requirements.requireUppercase) parts.push('uppercase');
    if (requirements.requireNumber) parts.push('number');
    if (requirements.requireSpecialChar) parts.push('special character');
    
    return `Password must be ${parts.join(', ')}`;
};

/**
 * Validation rules for authentication
 * Includes sanitization to prevent XSS attacks
 * Password validation is dynamic based on admin settings
 */
export const validateSignUp = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores')
        .escape() // Sanitize after validation to avoid altering validation input
    ,
    body('email')
        .trim()
        .normalizeEmail() // Sanitize: normalize email format
        .isEmail()
        .withMessage('Invalid email format'),
    body('password')
        .custom(async (value) => {
            const requirements = await getPasswordRequirements();
            const regex = buildPasswordRegex(requirements);
            
            if (!regex.test(value)) {
                throw new Error(buildPasswordMessage(requirements));
            }
            return true;
        }),
    body('firstName')
        .trim()
        .escape() // Sanitize: escape HTML entities
        .notEmpty()
        .withMessage('First name is required'),
    body('lastName')
        .trim()
        .escape() // Sanitize: escape HTML entities
        .notEmpty()
        .withMessage('Last name is required'),
    body('phone')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ max: 20 })
        .withMessage('Phone number must be less than 20 characters'),
    body('bio')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ max: 500 })
        .withMessage('Bio must be less than 500 characters'),
    validate,
];

export const validateSignIn = [
    body('username')
        .trim()
        .escape() // Sanitize: escape HTML entities
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate,
];

/**
 * Validation rules for image operations
 * Includes sanitization to prevent XSS attacks
 */
export const validateImageUpload = [
    body('imageTitle')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ min: 0, max: 200 })
        .withMessage('Image title must be less than 200 characters'),
    body('imageCategory')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ max: 200 })
        .withMessage('Image category must be less than 200 characters'),
    body('location')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ max: 200 })
        .withMessage('Location must be less than 200 characters'),
    body('coordinates')
        .optional()
        .custom((value) => {
            if (!value) return true;
            try {
                const coords = typeof value === 'string' ? JSON.parse(value) : value;
                if (coords && ('latitude' in coords) && ('longitude' in coords)) {
                    const lat = parseFloat(coords.latitude);
                    const lng = parseFloat(coords.longitude);
                    if (!isFinite(lat) || !isFinite(lng)) return false;
                    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
                    return true;
                }
                return false;
            } catch {
                return false;
            }
        })
        .withMessage('Invalid coordinates format'),
    body('cameraModel')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ max: 100 })
        .withMessage('Camera model must be less than 100 characters'),
    validate,
];

export const validateGetImages = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('search')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ max: 100 })
        .withMessage('Search query must be less than 100 characters'),
    query('category')
        .optional()
        .trim()
        .escape() // Sanitize: escape HTML entities
        .isLength({ max: 50 })
        .withMessage('Category must be less than 50 characters'),
    validate,
];

export const validateUserId = [
    param('userId')
        .isMongoId()
        .withMessage('Invalid user ID format'),
    validate,
];

