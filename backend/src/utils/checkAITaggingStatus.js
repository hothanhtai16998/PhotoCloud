/**
 * Check AI Tagging Status
 * Utility to diagnose AI tagging configuration
 */

import Settings from '../models/Settings.js';
import { logger } from './logger.js';

/**
 * Check AI Tagging configuration status
 * @returns {Promise<Object>} Status object
 */
export async function checkAITaggingStatus() {
    try {
        const settings = await Settings.findOne({ key: 'system' });
        const aiSettings = settings?.value?.aiTagging || {};
        
        const status = {
            enabled: aiSettings.enabled !== false, // Default to true
            provider: aiSettings.provider || 'fallback',
            hasGoogleKey: !!aiSettings.googleApiKey,
            hasAwsCredentials: !!(aiSettings.awsCredentials?.accessKeyId && aiSettings.awsCredentials?.secretAccessKey),
            configured: false,
            message: '',
        };

        // Determine if properly configured
        if (!status.enabled) {
            status.message = 'AI Tagging is disabled in settings';
            status.configured = false;
        } else if (status.provider === 'fallback') {
            status.message = 'Provider is set to "fallback" (does not generate tags). Set to "google" or "aws" to enable AI tagging.';
            status.configured = false;
        } else if (status.provider === 'google' && !status.hasGoogleKey) {
            status.message = 'Google provider selected but API key is missing';
            status.configured = false;
        } else if (status.provider === 'aws' && !status.hasAwsCredentials) {
            status.message = 'AWS provider selected but credentials are missing';
            status.configured = false;
        } else {
            status.message = 'AI Tagging is properly configured';
            status.configured = true;
        }

        return status;
    } catch (error) {
        logger.error('[AI Tagging Status] Error checking status:', error);
        return {
            enabled: false,
            provider: 'unknown',
            configured: false,
            message: `Error checking status: ${error.message}`,
        };
    }
}

/**
 * Log AI Tagging status (for debugging)
 */
export async function logAITaggingStatus() {
    const status = await checkAITaggingStatus();
    logger.info('[AI Tagging Status]', status);
    return status;
}

