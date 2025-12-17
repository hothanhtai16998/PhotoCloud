import { body, query, param } from 'express-validator';

/**
 * Sanitization middleware to prevent XSS attacks
 * Uses express-validator's built-in sanitization methods
 */

/**
 * Sanitize string inputs - removes HTML tags and escapes special characters
 */
export const sanitizeString = (field) => {
    return body(field)
        .trim()
        .escape() // Escapes HTML entities
        .stripLow() // Removes control characters
        .optional({ checkFalsy: true });
};

/**
 * Sanitize query parameters
 */
export const sanitizeQuery = (field) => {
    return query(field)
        .trim()
        .escape()
        .stripLow()
        .optional();
};

/**
 * Sanitize URL parameters
 */
export const sanitizeParam = (field) => {
    return param(field)
        .trim()
        .escape()
        .stripLow();
};

/**
 * General sanitization for common user input fields
 * Apply this middleware to routes that accept user-generated content
 */
export const sanitizeUserInput = [
    // Sanitize text fields
    body('username').trim().escape().optional(),
    body('email').trim().normalizeEmail().optional(),
    body('displayName').trim().escape().optional(),
    body('firstName').trim().escape().optional(),
    body('lastName').trim().escape().optional(),
    body('bio').trim().escape().optional(),
    body('phone').trim().escape().optional(),
    
    // Sanitize image fields
    body('imageTitle').trim().escape().optional(),
    body('location').trim().escape().optional(),
    body('cameraModel').trim().escape().optional(),
    
    // Sanitize query parameters
    query('search').trim().escape().optional(),
    query('category').trim().escape().optional(),
];

/**
 * Sanitize HTML content (for rich text fields if needed in future)
 * Note: For HTML content, use a more sophisticated sanitizer like DOMPurify
 * This is a basic version that escapes HTML
 */
export const sanitizeHtml = (field) => {
    return body(field)
        .trim()
        .escape() // Escapes all HTML
        .optional();
};

/**
 * Sanitize URL fields
 */
export const sanitizeUrl = (field) => {
    return body(field)
        .trim()
        .isURL()
        .withMessage('Invalid URL format')
        .optional();
};

