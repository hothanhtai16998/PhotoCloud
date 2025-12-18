/**
 * Tag Translator
 * Translates AI-generated tags to target language
 * Supports: MyMemory API (free), Google Translation API (paid), Dictionary fallback
 */

import axios from 'axios';
import { logger } from './logger.js';
import Settings from '../models/Settings.js';

/**
 * Translate tags to target language using Google Translation API
 * @param {string[]} tags - Array of tags in English
 * @param {string} targetLanguage - Target language code (e.g., 'vi', 'en', 'es')
 * @returns {Promise<string[]>} Translated tags
 */
export async function translateTags(tags, targetLanguage = 'vi') {
    if (!tags || tags.length === 0) {
        return [];
    }

    // If target is English, return as-is
    if (targetLanguage === 'en') {
        return tags;
    }

    try {
        // Get AI settings to check translation provider
        const settings = await Settings.findOne({ key: 'system' });
        const aiSettings = settings?.value?.aiTagging || {};
        
        // Check if translation is enabled (default to true)
        const translationEnabled = aiSettings.translationEnabled !== false;
        if (!translationEnabled) {
            logger.info('[Tag Translator] Translation disabled, returning original tags');
            return tags;
        }

        // Get translation provider (default: 'mymemory' for free tier)
        const translationProvider = aiSettings.translationProvider || 'mymemory'; // 'mymemory', 'google', 'deepl'

        // Try MyMemory API first (FREE, no API key needed)
        if (translationProvider === 'mymemory') {
            try {
                const translatedTags = await translateWithMyMemory(tags, targetLanguage);
                if (translatedTags && translatedTags.length > 0) {
                    logger.info(`[Tag Translator] Translated ${tags.length} tags to ${targetLanguage} using MyMemory API`);
                    return translatedTags;
                }
            } catch (error) {
                logger.warn('[Tag Translator] MyMemory API failed, trying fallback:', error.message);
                // Fall through to Google API or return original
            }
        }

        // Fallback to Google Translation API (if API key provided)
        if (translationProvider === 'google' || aiSettings.googleApiKey) {
            const apiKey = aiSettings.googleApiKey;
            if (apiKey) {
                try {
                    const translatedTags = await translateWithGoogle(tags, targetLanguage, apiKey);
                    if (translatedTags && translatedTags.length > 0) {
                        logger.info(`[Tag Translator] Translated ${tags.length} tags to ${targetLanguage} using Google API`);
                        return translatedTags;
                    }
                } catch (error) {
                    logger.warn('[Tag Translator] Google API failed:', error.message);
                }
            }
        }

        // If all APIs fail, return original tags
        logger.warn('[Tag Translator] All translation APIs failed, returning original tags');
        return tags;

    } catch (error) {
        logger.error('[Tag Translator] Translation error:', error.message);
        return tags; // Return original tags on error
    }
}

/**
 * Translate using MyMemory API (FREE, no API key needed)
 * Free tier: 10,000 words/day
 */
async function translateWithMyMemory(tags, targetLanguage) {
    const translatedTags = [];
    
    // MyMemory API: translate one tag at a time (free tier allows this)
    for (const tag of tags) {
        try {
            const response = await axios.get(
                'https://api.mymemory.translated.net/get',
                {
                    params: {
                        q: tag,
                        langpair: `en|${targetLanguage}`,
                    },
                    timeout: 5000, // 5 second timeout per tag
                }
            );

            if (response.data?.responseData?.translatedText) {
                const translated = response.data.responseData.translatedText.toLowerCase().trim();
                translatedTags.push(translated);
            } else {
                translatedTags.push(tag); // Fallback to original if translation fails
            }
        } catch (error) {
            logger.warn(`[Tag Translator] MyMemory failed for tag "${tag}":`, error.message);
            translatedTags.push(tag); // Fallback to original
        }
    }

    return translatedTags;
}

/**
 * Translate using Google Translation API (PAID, requires API key)
 */
async function translateWithGoogle(tags, targetLanguage, apiKey) {
    const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await axios.post(
        translateUrl,
        {
            q: tags, // Array of strings to translate
            target: targetLanguage,
            source: 'en',
        },
        {
            timeout: 10000,
        }
    );

    if (response.data?.data?.translations) {
        return response.data.data.translations.map(t => 
            t.translatedText.toLowerCase().trim()
        );
    }

    return tags; // Fallback to original
}

/**
 * Get target language from user settings or default to Vietnamese
 * @returns {Promise<string>} Language code (e.g., 'vi', 'en')
 */
export async function getTargetLanguage() {
    try {
        const settings = await Settings.findOne({ key: 'system' });
        const aiSettings = settings?.value?.aiTagging || {};
        
        // Get target language from settings (default to 'vi' for Vietnamese)
        return aiSettings.targetLanguage || 'vi';
    } catch (error) {
        logger.warn('[Tag Translator] Error getting target language, defaulting to Vietnamese');
        return 'vi'; // Default to Vietnamese
    }
}

