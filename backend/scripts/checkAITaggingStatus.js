/**
 * Check AI Tagging Status
 * Utility to diagnose AI tagging configuration
 */

import Settings from '../src/models/Settings.js';
import { logger } from '../src/utils/logger.js';

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
            status.message = 'AI Tagging đã bị vô hiệu hóa trong cài đặt';
            status.configured = false;
        } else if (status.provider === 'fallback') {
            status.message = 'Provider đã được đặt thành "fallback" (không tạo tags). Đặt thành "google" hoặc "aws" để kích hoạt AI tagging.';
            status.configured = false;
        } else if (status.provider === 'google' && !status.hasGoogleKey) {
            status.message = 'Google provider đã được chọn nhưng API key bị thiếu';
            status.configured = false;
        } else if (status.provider === 'aws' && !status.hasAwsCredentials) {
            status.message = 'AWS provider đã được chọn nhưng credentials bị thiếu';
            status.configured = false;
        } else {
            status.message = 'AI Tagging đã được cấu hình chính xác';
            status.configured = true;
        }

        return status;
    } catch (error) {
        logger.error('[AI Tagging Status] Lỗi kiểm tra trạng thái:', error);
        return {
            enabled: false,
            provider: 'unknown',
            configured: false,
            message: `Lỗi kiểm tra trạng thái: ${error.message}`,
        };
    }
}

/**
 * Log AI Tagging status (for debugging)
 */
export async function logAITaggingStatus() {
    const status = await checkAITaggingStatus();
    logger.info('[Trạng thái AI Tagging]', status);
    return status;
}

