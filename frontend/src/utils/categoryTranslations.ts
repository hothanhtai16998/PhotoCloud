/**
 * Category name translations
 * Maps Vietnamese category names to English translations
 */
export const categoryTranslations: Record<string, { vi: string; en: string }> =
  {
    'Chân dung': { vi: 'Chân dung', en: 'Portrait' },
    'Du lịch': { vi: 'Du lịch', en: 'Travel' },
    'Kiến trúc': { vi: 'Kiến trúc', en: 'Architecture' },
    'Ngoài trời': { vi: 'Ngoài trời', en: 'Outdoor' },
    Nho: { vi: 'Nho', en: 'Grape' },
    'Phong cảnh': { vi: 'Phong cảnh', en: 'Landscape' },
    'Thú cưng': { vi: 'Thú cưng', en: 'Pets' },
    'Thời trang': { vi: 'Thời trang', en: 'Fashion' },
    'Đám cưới': { vi: 'Đám cưới', en: 'Wedding' },
    'Đường phố': { vi: 'Đường phố', en: 'Street' },
    'Ẩm thực': { vi: 'Ẩm thực', en: 'Food' },
    // Add more category translations as needed
  };

/**
 * Get translated category name
 * @param categoryName - The category name from database (usually in Vietnamese)
 * @param locale - Current locale ('vi' or 'en')
 * @returns Translated category name or original if no translation found
 */
export function getTranslatedCategoryName(
  categoryName: string,
  locale: 'vi' | 'en'
): string {
  const translation = categoryTranslations[categoryName];
  if (translation) {
    return translation[locale];
  }
  // If no translation found, return original name
  return categoryName;
}

/**
 * Get reverse translation (English to Vietnamese)
 * Useful when we have English name and need Vietnamese for database lookup
 */
export function getCategoryNameFromTranslation(
  translatedName: string,
  locale: 'vi' | 'en'
): string {
  if (locale === 'vi') {
    // If locale is Vietnamese, return as-is (it's already Vietnamese)
    return translatedName;
  }

  // Find the Vietnamese name from English translation
  for (const [viName, translations] of Object.entries(categoryTranslations)) {
    if (translations.en === translatedName) {
      return viName;
    }
  }

  // If not found, return as-is
  return translatedName;
}
