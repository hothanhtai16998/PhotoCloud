import axios from 'axios';
import { logger } from './logger.js';
import Settings from '../models/Settings.js';

/**
 * AI Tagging Service
 * Supports multiple providers: Google Cloud Vision, AWS Rekognition, or fallback keyword extraction
 */

/**
 * Generate tags from image using AI service
 * Returns English tags only - translation happens on frontend using dictionary (free, instant)
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} mimetype - Image MIME type
 * @returns {Promise<string[]>} Array of English tag strings
 */
export async function generateAITags(imageBuffer, mimetype) {
    try {
        // Get AI settings from database
        const settings = await Settings.findOne({ key: 'system' });
        const aiSettings = settings?.value?.aiTagging || {};
        
        const provider = aiSettings.provider || 'fallback'; // 'google', 'aws', or 'fallback'
        const enabled = aiSettings.enabled === true; // Default to false - must explicitly enable

        if (!enabled) {
            logger.info('[AI Tagging] Service disabled, skipping tag generation');
            return [];
        }

        // Skip for videos and large files
        if (mimetype?.startsWith('video/')) {
            logger.info('[AI Tagging] Skipping video files');
            return [];
        }

        if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB limit
            logger.warn('[AI Tagging] Image too large, skipping');
            return [];
        }

        let tags = [];

        switch (provider) {
            case 'google':
                tags = await generateTagsWithGoogleVision(imageBuffer, aiSettings);
                break;
            case 'aws':
                tags = await generateTagsWithAWSRekognition(imageBuffer, aiSettings);
                break;
            case 'fallback':
            default:
                tags = await generateTagsFallback(imageBuffer, mimetype);
                break;
        }

        // Clean and normalize tags
        tags = cleanTags(tags);

        logger.info(`[AI Tagging] Generated ${tags.length} tags using ${provider} provider`);
        return tags;

    } catch (error) {
        logger.error('[AI Tagging] Failed to generate tags', { error: error.message });
        // Don't fail the upload if tagging fails - return empty array
        return [];
    }
}

/**
 * Generate tags using Google Cloud Vision API
 * Returns English tags only - translation happens on frontend (free, instant)
 * @returns {Promise<string[]>} Array of English tag strings
 */
async function generateTagsWithGoogleVision(imageBuffer, settings) {
    const apiKey = settings.googleApiKey;
    if (!apiKey) {
        logger.warn('[AI Tagging] Google Vision API key not configured, falling back');
        return await generateTagsFallback(imageBuffer);
    }

    try {
        const base64Image = imageBuffer.toString('base64');
        
        const response = await axios.post(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                requests: [
                    {
                        image: {
                            content: base64Image,
                        },
                        features: [
                            { type: 'LABEL_DETECTION', maxResults: 20 },
                            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                        ],
                    },
                ],
            },
            {
                timeout: 10000, // 10 second timeout
            }
        );

        const tags = new Set();

        // Extract labels (in English from Vision API)
        if (response.data?.responses?.[0]?.labelAnnotations) {
            response.data.responses[0].labelAnnotations.forEach((label) => {
                if (label.score > 0.5) { // Only include high-confidence labels
                    tags.add(label.description.toLowerCase());
                }
            });
        }

        // Extract objects (in English from Vision API)
        if (response.data?.responses?.[0]?.localizedObjectAnnotations) {
            response.data.responses[0].localizedObjectAnnotations.forEach((obj) => {
                if (obj.score > 0.5) {
                    tags.add(obj.name.toLowerCase());
                }
            });
        }

        return Array.from(tags);

    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const statusCode = error.response?.status || error.code;
        
        logger.error('[AI Tagging] Google Vision API error', { 
            error: errorMessage,
            statusCode: statusCode,
            details: statusCode === 403 ? 'API key may be invalid, restricted, or billing not enabled. Check Google Cloud Console.' : undefined
        });
        
        // Fallback to keyword extraction
        return await generateTagsFallback(imageBuffer);
    }
}

/**
 * Generate tags using AWS Rekognition
 */
async function generateTagsWithAWSRekognition(imageBuffer, settings) {
    // Note: This requires @aws-sdk/client-rekognition package
    // For now, we'll use a simple implementation that can be extended
    try {
        // Dynamic import to avoid requiring the package if not used
        const { RekognitionClient, DetectLabelsCommand } = await import('@aws-sdk/client-rekognition');
        
        const rekognitionClient = new RekognitionClient({
            region: settings.awsRegion || 'us-east-1',
            credentials: settings.awsCredentials ? {
                accessKeyId: settings.awsCredentials.accessKeyId,
                secretAccessKey: settings.awsCredentials.secretAccessKey,
            } : undefined,
        });

        const command = new DetectLabelsCommand({
            Image: {
                Bytes: imageBuffer,
            },
            MaxLabels: 20,
            MinConfidence: 50, // 50% confidence threshold
        });

        const response = await rekognitionClient.send(command);

        const tags = new Set();
        if (response.Labels) {
            response.Labels.forEach((label) => {
                if (label.Confidence > 50) {
                    tags.add(label.Name.toLowerCase());
                }
            });
        }

        return Array.from(tags);

    } catch (error) {
        // If AWS SDK not available or error, fallback
        if (error.code === 'MODULE_NOT_FOUND') {
            logger.warn('[AI Tagging] AWS Rekognition SDK not installed, falling back');
        } else {
            logger.error('[AI Tagging] AWS Rekognition error', { error: error.message });
        }
        return await generateTagsFallback(imageBuffer);
    }
}

/**
 * Fallback tag generation using basic keyword extraction
 * This is a simple implementation that can be enhanced
 */
async function generateTagsFallback(imageBuffer, mimetype) {
    // Basic fallback: return empty array
    // In a real implementation, you could:
    // 1. Use a local ML model (TensorFlow.js, ONNX)
    // 2. Extract keywords from EXIF data
    // 3. Use a simpler image analysis library
    
    // For now, return empty - this ensures the system works even without AI services
    logger.info('[AI Tagging] Using fallback (no tags generated)');
    return [];
}

/**
 * Clean and normalize tags
 * @param {string[]} tags - Raw tags
 * @returns {string[]} Cleaned tags
 */
function cleanTags(tags) {
    return tags
        .map(tag => {
            // Normalize: lowercase, trim, remove special chars
            return tag
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
        })
        .filter(tag => {
            // Filter out invalid tags
            return tag.length >= 2 && // At least 2 characters
                   tag.length <= 50 && // Max 50 characters
                   !/^\d+$/.test(tag); // Not just numbers
        })
        .slice(0, 20); // Limit to 20 tags
}

/**
 * Merge AI-generated tags with user-provided tags
 * Removes duplicates and prioritizes user tags
 * @param {string[]} userTags - Tags provided by user
 * @param {string[]} aiTags - Tags generated by AI
 * @returns {string[]} Merged tags
 */
export function mergeTags(userTags = [], aiTags = []) {
    const merged = new Set();
    
    // Add user tags first (they take priority)
    userTags.forEach(tag => {
        if (tag && tag.trim()) {
            merged.add(tag.toLowerCase().trim());
        }
    });
    
    // Add AI tags that don't conflict with user tags
    aiTags.forEach(tag => {
        if (tag && tag.trim()) {
            const normalized = tag.toLowerCase().trim();
            // Only add if not already present (case-insensitive)
            if (!Array.from(merged).some(existing => existing.toLowerCase() === normalized)) {
                merged.add(normalized);
            }
        }
    });
    
    return Array.from(merged).slice(0, 20); // Limit to 20 total tags
}

