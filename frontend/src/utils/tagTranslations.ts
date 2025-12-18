/**
 * Tag Translations
 * Translates AI-generated tags (English) to other languages
 * 
 * Google Vision API returns tags in English only
 * This dictionary provides translations for common tags
 */

// Common AI-generated tags translations
export const tagTranslations: Record<string, Record<string, string>> = {
  // English (base - no translation needed)
  en: {},
  
  // Vietnamese
  vi: {
    // Nature & Landscape
    'sunset': 'hoàng hôn',
    'sunrise': 'bình minh',
    'mountain': 'núi',
    'landscape': 'phong cảnh',
    'nature': 'thiên nhiên',
    'sky': 'bầu trời',
    'clouds': 'mây',
    'water': 'nước',
    'ocean': 'đại dương',
    'sea': 'biển',
    'beach': 'bãi biển',
    'forest': 'rừng',
    'tree': 'cây',
    'flower': 'hoa',
    'plant': 'cây cối',
    'grass': 'cỏ',
    'leaf': 'lá',
    'branch': 'cành',
    
    // Animals
    'animal': 'động vật',
    'bird': 'chim',
    'dog': 'chó',
    'cat': 'mèo',
    'horse': 'ngựa',
    'wildlife': 'động vật hoang dã',
    
    // People
    'person': 'người',
    'people': 'người',
    'portrait': 'chân dung',
    'face': 'khuôn mặt',
    'human': 'con người',
    'woman': 'phụ nữ',
    'man': 'đàn ông',
    'child': 'trẻ em',
    'baby': 'em bé',
    
    // Buildings & Urban
    'building': 'tòa nhà',
    'city': 'thành phố',
    'urban': 'đô thị',
    'architecture': 'kiến trúc',
    'street': 'đường phố',
    'road': 'đường',
    'bridge': 'cầu',
    'house': 'nhà',
    
    // Food
    'food': 'thức ăn',
    'meal': 'bữa ăn',
    'restaurant': 'nhà hàng',
    'cooking': 'nấu ăn',
    'dish': 'món ăn',
    'fruit': 'trái cây',
    'vegetable': 'rau củ',
    
    // Transportation
    'car': 'xe hơi',
    'vehicle': 'xe cộ',
    'bicycle': 'xe đạp',
    'motorcycle': 'xe máy',
    'airplane': 'máy bay',
    'boat': 'thuyền',
    
    // Activities
    'sport': 'thể thao',
    'outdoor': 'ngoài trời',
    'indoor': 'trong nhà',
    'adventure': 'phiêu lưu',
    'travel': 'du lịch',
    'vacation': 'kỳ nghỉ',
    
    // Descriptions
    'scenic': 'đẹp',
    'beautiful': 'đẹp',
    'peaceful': 'yên bình',
    'serene': 'yên tĩnh',
    'dramatic': 'ấn tượng',
    'stunning': 'tuyệt đẹp',
    'picturesque': 'đẹp như tranh',
    
    // Time & Weather
    'day': 'ngày',
    'night': 'đêm',
    'evening': 'buổi tối',
    'morning': 'buổi sáng',
    'winter': 'mùa đông',
    'summer': 'mùa hè',
    'spring': 'mùa xuân',
    'autumn': 'mùa thu',
    'fall': 'mùa thu',
    'snow': 'tuyết',
    'rain': 'mưa',
    
    // Colors
    'blue': 'xanh dương',
    'green': 'xanh lá',
    'red': 'đỏ',
    'yellow': 'vàng',
    'orange': 'cam',
    'purple': 'tím',
    'white': 'trắng',
    'black': 'đen',
    
    // Other common tags
    'texture': 'kết cấu',
    'pattern': 'hoa văn',
    'abstract': 'trừu tượng',
    'close-up': 'cận cảnh',
    'macro': 'cận cảnh',
    'wide-angle': 'góc rộng',
    'panorama': 'toàn cảnh',
  },
  
  // Add more languages as needed
  // es: { ... }, // Spanish
  // fr: { ... }, // French
  // ja: { ... }, // Japanese
  // etc.
};

/**
 * Translate a single tag to the current language
 * Uses Google Translation API if available, otherwise falls back to dictionary
 * @param tag - Tag in English
 * @param locale - Target locale (e.g., 'vi', 'en')
 * @returns Translated tag, or original if translation not found
 */
export async function translateTagAsync(tag: string, locale: string): Promise<string> {
  // If English, return as-is
  if (locale === 'en') {
    return tag;
  }
  
  // Try dictionary first (fast, free)
  const dictTranslation = translateTag(tag, locale);
  if (dictTranslation !== tag) {
    return dictTranslation; // Found in dictionary
  }
  
  // If not in dictionary and locale is Vietnamese, could use API translation
  // For now, return original (can be enhanced later with API translation)
  return tag;
}

/**
 * Translate a single tag to the current language (synchronous, dictionary only)
 * @param tag - Tag in English
 * @param locale - Target locale (e.g., 'vi', 'en')
 * @returns Translated tag, or original if translation not found
 */
export function translateTag(tag: string, locale: string): string {
  // If English or no translation dictionary, return original
  if (locale === 'en' || !tagTranslations[locale]) {
    return tag;
  }
  
  const translations = tagTranslations[locale];
  const normalizedTag = tag.toLowerCase().trim();
  
  // Try exact match first
  if (translations[normalizedTag]) {
    return translations[normalizedTag];
  }
  
  // Try with common variations (plural, etc.)
  const variations = [
    normalizedTag + 's', // plural
    normalizedTag.replace(/s$/, ''), // singular
    normalizedTag.replace(/\s+/g, '-'), // spaces to hyphens
    normalizedTag.replace(/-/g, ' '), // hyphens to spaces
  ];
  
  for (const variation of variations) {
    if (translations[variation]) {
      return translations[variation];
    }
  }
  
  // No translation found, return original
  return tag;
}

/**
 * Translate multiple tags
 * Uses API translation for better coverage, falls back to dictionary
 * @param tags - Array of tags in English
 * @param locale - Target locale
 * @returns Promise<string[]> Translated tags
 */
export async function translateTagsAsync(tags: string[], locale: string): Promise<string[]> {
  if (!tags || tags.length === 0) {
    return [];
  }
  
  // If English, return as-is
  if (locale === 'en') {
    return tags;
  }
  
  try {
    // Try API translation first (covers all tags)
    const response = await fetch('/api/admin/translate-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tags: tags,
        targetLanguage: locale,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.translatedTags) {
        return data.translatedTags;
      }
    }
  } catch (error) {
    console.warn('[Tag Translation] API failed, using dictionary:', error);
  }
  
  // Fallback to dictionary
  return tags.map(tag => translateTag(tag, locale));
}

/**
 * Translate multiple tags (synchronous, dictionary only)
 * @param tags - Array of tags in English
 * @param locale - Target locale
 * @returns Array of translated tags
 */
export function translateTags(tags: string[], locale: string): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }
  
  return tags.map(tag => translateTag(tag, locale));
}

/**
 * Get all available locales for tag translations
 */
export function getAvailableTagLocales(): string[] {
  return Object.keys(tagTranslations);
}

