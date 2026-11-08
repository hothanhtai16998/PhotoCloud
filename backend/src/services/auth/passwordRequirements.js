import Settings from '../../models/Settings.js';
import { logger } from '../../utils/logger.js';

export const getPasswordRequirements = async () => {
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
