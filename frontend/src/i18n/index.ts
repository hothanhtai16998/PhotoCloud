/**
 * Internationalization (i18n) Module
 * 
 * Simple i18n implementation for PhotoApp.
 * Default language is Vietnamese (vi) - always defaults to Vietnamese.
 * 
 * Usage:
 *   import { t, setLocale, getLocale } from '@/i18n';
 *   
 *   // Get translation
 *   t('auth.signIn') // Returns "Đăng nhập" (vi) or "Sign In" (en)
 *   
 *   // With interpolation
 *   t('favorites.count', { count: 5 }) // Returns "5 ảnh đã lưu"
 *   
 *   // Change locale
 *   setLocale('en');
 */

import { vi, en, type TranslationKeys } from './locales';

// Supported locales
export type Locale = 'vi' | 'en';

// Translation dictionaries
const translations: Record<Locale, TranslationKeys | typeof en> = {
    vi,
    en,
};

// Current locale (default: Vietnamese)
let currentLocale: Locale = 'vi';

// Storage key for persisting locale
const LOCALE_STORAGE_KEY = 'app_locale';

/**
 * Initialize locale from storage
 * Default language is Vietnamese (vi)
 */
function initLocale(): void {
    if (typeof window === 'undefined') return;

    try {
        // Check localStorage for saved preference
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && (stored === 'vi' || stored === 'en')) {
            currentLocale = stored;
            return;
        }

        // Default is 'vi' (Vietnamese) - always default to Vietnamese
        currentLocale = 'vi';
    } catch {
        // Ignore storage errors - default to Vietnamese
        currentLocale = 'vi';
    }
}

// Initialize on module load
initLocale();

/**
 * Get current locale
 */
export function getLocale(): Locale {
    return currentLocale;
}

/**
 * Set current locale
 */
export function setLocale(locale: Locale): void {
    currentLocale = locale;
    
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        // Ignore storage errors
    }

    // Dispatch event for components to react to locale change
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localeChange', { detail: { locale } }));
    }
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
        if (current && typeof current === 'object' && key in current) {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj as unknown);
}

/**
 * Interpolate variables in translation string
 * Replaces {key} with values from params
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) return text;
    
    return Object.entries(params).reduce((result, [key, value]) => {
        return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }, text);
}

/**
 * Get translation by key
 * 
 * @param key - Dot notation path to translation (e.g., 'auth.signIn')
 * @param params - Optional interpolation parameters
 * @returns Translated string or key if not found
 * 
 * @example
 * t('auth.signIn') // "Đăng nhập"
 * t('favorites.count', { count: 5 }) // "5 ảnh đã lưu"
 */
export function t(key: string, params?: Record<string, string | number>): string {
    const translation = getNestedValue(
        translations[currentLocale] as unknown as Record<string, unknown>,
        key
    );

    if (typeof translation === 'string') {
        return interpolate(translation, params);
    }

    // Fallback to Vietnamese if key not found in current locale
    if (currentLocale !== 'vi') {
        const fallback = getNestedValue(
            translations.vi as unknown as Record<string, unknown>,
            key
        );
        if (typeof fallback === 'string') {
            return interpolate(fallback, params);
        }
    }

    // Return key if translation not found
    console.warn(`Translation not found: ${key}`);
    return key;
}

/**
 * Check if a translation key exists
 */
export function hasTranslation(key: string): boolean {
    const translation = getNestedValue(
        translations[currentLocale] as unknown as Record<string, unknown>,
        key
    );
    return typeof translation === 'string';
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Locale[] {
    return Object.keys(translations) as Locale[];
}

// Re-export types
export type { TranslationKeys } from './locales';

