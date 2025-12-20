/**
 * Tag Translator API
 * Translates tags using backend API (Google Translation API)
 * Falls back to dictionary if API unavailable
 */

import { translateTags as translateTagsDict } from './tagTranslations';
import api from '@/lib/axios';

/**
 * Translate tags using backend API (Google Translation)
 * Falls back to dictionary if API fails
 * @param tags - Array of tags in English
 * @param locale - Target locale (e.g., 'vi', 'en')
 * @returns Promise<string[]> Translated tags
 */
export async function translateTagsAPI(tags: string[], locale: string): Promise<string[]> {
  // If English, return as-is
  if (locale === 'en' || !tags || tags.length === 0) {
    return tags;
  }

  try {
    // Call backend API to translate tags
    const response = await api.post('/api/admin/translate-tags', {
      tags: tags,
      targetLanguage: locale,
    });

    if (response.data?.success && response.data?.translatedTags) {
      return response.data.translatedTags;
    }

    // Fallback to dictionary
    return translateTagsDict(tags, locale);
  } catch {
    // Fallback to dictionary on error
    return translateTagsDict(tags, locale);
  }
}

