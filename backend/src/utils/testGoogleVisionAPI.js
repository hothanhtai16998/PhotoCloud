/**
 * Test Google Vision API Key
 * Utility to diagnose API key issues
 */

import axios from 'axios';
import { logger } from './logger.js';
import Settings from '../models/Settings.js';

/**
 * Test Google Vision API key
 * @param {string} apiKey - API key to test (optional, will use from settings if not provided)
 * @returns {Promise<Object>} Test result
 */
export async function testGoogleVisionAPI(apiKey = null) {
    try {
        // Get API key from settings if not provided
        if (!apiKey) {
            const settings = await Settings.findOne({ key: 'system' });
            const aiSettings = settings?.value?.aiTagging || {};
            apiKey = aiSettings.googleApiKey;
        }

        if (!apiKey) {
            return {
                success: false,
                error: 'No API key provided or found in settings',
                details: 'Please add Google Vision API key in Admin Settings',
            };
        }

        // Test with a public image
        const testImageUrl = 'https://storage.googleapis.com/cloud-samples-data/vision/face_detection/celebrity_recognition/sergey.jpg';
        
        logger.info('[Google Vision Test] Testing API key...');
        
        const response = await axios.post(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                requests: [
                    {
                        image: {
                            source: {
                                imageUri: testImageUrl,
                            },
                        },
                        features: [
                            { type: 'LABEL_DETECTION', maxResults: 5 },
                        ],
                    },
                ],
            },
            {
                timeout: 10000,
            }
        );

        // Check response
        if (response.status === 200 && response.data?.responses?.[0]) {
            const labels = response.data.responses[0].labelAnnotations || [];
            return {
                success: true,
                message: 'API key is working!',
                labels: labels.map(l => l.description),
                details: `Successfully detected ${labels.length} labels`,
            };
        } else {
            return {
                success: false,
                error: 'Unexpected response format',
                details: response.data,
            };
        }

    } catch (error) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = error.message;

        let details = '';
        let fix = '';

        if (statusCode === 400) {
            details = 'Bad Request - Invalid request format';
            fix = 'Check API request format';
        } else if (statusCode === 403) {
            details = 'Forbidden - API key issue';
            if (errorData?.error?.message) {
                details += `: ${errorData.error.message}`;
            }
            fix = 'Check: 1) API key is correct, 2) Cloud Vision API is enabled, 3) Billing is enabled, 4) API key restrictions allow your server';
        } else if (statusCode === 404) {
            details = 'Not Found - API endpoint issue';
            fix = 'Check API endpoint URL';
        } else if (statusCode === 429) {
            details = 'Too Many Requests - Rate limit exceeded';
            fix = 'Wait a few minutes and try again';
        } else if (statusCode === 401) {
            details = 'Unauthorized - Invalid API key';
            fix = 'Check API key is correct and not expired';
        } else {
            details = errorMessage || 'Unknown error';
            fix = 'Check error message and Google Cloud Console';
        }

        return {
            success: false,
            error: `HTTP ${statusCode || 'Unknown'}`,
            details: details,
            fix: fix,
            fullError: errorData || errorMessage,
        };
    }
}

/**
 * Test API key and log results
 */
export async function testAndLog() {
    const result = await testGoogleVisionAPI();
    
    if (result.success) {
        logger.info('[Google Vision Test] ✅ API key is working!', result);
    } else {
        logger.error('[Google Vision Test] ❌ API key test failed:', result);
    }
    
    return result;
}

