import { describe, it, expect } from '@jest/globals';
import { body, validationResult } from 'express-validator';
import { validateSignUp, validateSignIn, validateImageUpload } from '../../middlewares/validationMiddleware.js';

/**
 * Test validation middleware
 * Note: These are basic unit tests. For full integration tests, use supertest
 */
describe('Validation Middleware', () => {
    describe('validateSignUp', () => {
        it('should validate correct signup data', async () => {
            const validData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Test1234',
                firstName: 'Test',
                lastName: 'User',
            };

            // Test username validation
            await body('username')
                .trim()
                .escape()
                .isLength({ min: 3, max: 20 })
                .matches(/^[a-zA-Z0-9_]+$/)
                .run({ body: validData });

            // Test email validation
            await body('email')
                .trim()
                .normalizeEmail()
                .isEmail()
                .run({ body: validData });

            // Test password validation
            await body('password')
                .isLength({ min: 8 })
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                .run({ body: validData });
        });

        it('should reject invalid username', async () => {
            const invalidData = {
                username: 'ab', // Too short
            };

            await body('username')
                .trim()
                .escape()
                .isLength({ min: 3, max: 20 })
                .run({ body: invalidData });
        });

        it('should reject invalid email', async () => {
            const invalidData = {
                email: 'invalid-email',
            };

            await body('email')
                .trim()
                .normalizeEmail()
                .isEmail()
                .run({ body: invalidData });
        });
    });

    describe('validateSignIn', () => {
        it('should validate correct signin data', async () => {
            const validData = {
                username: 'testuser',
                password: 'password123',
            };

            await body('username')
                .trim()
                .escape()
                .notEmpty()
                .run({ body: validData });

            await body('password')
                .notEmpty()
                .run({ body: validData });
        });
    });

    describe('validateImageUpload', () => {
        it('should validate correct image upload data', async () => {
            const validData = {
                imageTitle: 'Test Image',
                imageCategory: 'Nature',
                location: 'Test Location',
                cameraModel: 'Canon EOS',
            };

            await body('imageTitle')
                .trim()
                .escape()
                .isLength({ min: 1, max: 200 })
                .run({ body: validData });

            await body('imageCategory')
                .trim()
                .escape()
                .notEmpty()
                .run({ body: validData });
        });

        it('should reject empty image title', async () => {
            const invalidData = {
                imageTitle: '',
            };

            await body('imageTitle')
                .trim()
                .escape()
                .isLength({ min: 1, max: 200 })
                .run({ body: invalidData });
        });
    });
});

