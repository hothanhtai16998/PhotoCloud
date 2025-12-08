import { describe, it, expect } from '@jest/globals';
import { validateEmail, validateUsername, validatePassword } from '../../utils/validators.js';

/**
 * Test utility validators
 */
describe('Validators', () => {
    describe('validateEmail', () => {
        it('should validate correct email addresses', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name@domain.co.uk')).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('@example.com')).toBe(false);
            expect(validateEmail('test@')).toBe(false);
        });
    });

    describe('validateUsername', () => {
        it('should validate correct usernames', () => {
            expect(validateUsername('testuser')).toBe(true);
            expect(validateUsername('user123')).toBe(true);
            expect(validateUsername('user_name')).toBe(true);
        });

        it('should reject invalid usernames', () => {
            expect(validateUsername('ab')).toBe(false); // Too short
            expect(validateUsername('a'.repeat(21))).toBe(false); // Too long
            expect(validateUsername('user-name')).toBe(false); // Hyphen not allowed
        });
    });

    describe('validatePassword', () => {
        it('should validate correct passwords', () => {
            expect(validatePassword('Test1234')).toBe(true);
            expect(validatePassword('Password1')).toBe(true);
        });

        it('should reject invalid passwords', () => {
            expect(validatePassword('short')).toBe(false); // Too short
            expect(validatePassword('nouppercase123')).toBe(false); // No uppercase
            expect(validatePassword('NOLOWERCASE123')).toBe(false); // No lowercase
            expect(validatePassword('NoNumbers')).toBe(false); // No numbers
        });
    });
});

