/**
 * Safe localStorage/sessionStorage utilities
 * Handles errors gracefully when storage is disabled or full
 */

/**
 * Safely get and parse JSON from localStorage
 * Returns defaultValue if key doesn't exist or parsing fails
 */
export function getStoredJson<T>(key: string, defaultValue: T): T {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return defaultValue;

        const parsed = JSON.parse(stored);
        return parsed as T;
    } catch {
        // Clear potentially corrupt data
        try {
            localStorage.removeItem(key);
        } catch {
            // Ignore - storage might be disabled
        }
        return defaultValue;
    }
}

/**
 * Safely set JSON in localStorage
 * Returns true if successful, false otherwise
 */
export function setStoredJson<T>(key: string, value: T): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        // Storage might be full or disabled
        return false;
    }
}

/**
 * Safely remove item from localStorage
 */
export function removeStoredItem(key: string): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safely get item from sessionStorage
 */
export function getSessionItem(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * Safely set item in sessionStorage
 */
export function setSessionItem(key: string, value: string): boolean {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safely remove item from sessionStorage
 */
export function removeSessionItem(key: string): boolean {
    try {
        sessionStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

