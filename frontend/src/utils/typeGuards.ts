/**
 * Type guards for runtime type checking
 * Use these instead of unsafe `as unknown as Type` assertions
 */

import type { Collection } from '@/types/collection';

/**
 * Check if an object is a valid Collection
 */
export function isCollection(data: unknown): data is Collection {
    if (typeof data !== 'object' || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;
    
    return (
        typeof obj._id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.user === 'string' || (typeof obj.user === 'object' && obj.user !== null)
    );
}

/**
 * Safely cast to Collection, returns null if invalid
 */
export function toCollection(data: unknown): Collection | null {
    if (isCollection(data)) {
        return data;
    }
    return null;
}

/**
 * Assert that data is a Collection, throws if invalid
 */
export function assertCollection(data: unknown, context?: string): asserts data is Collection {
    if (!isCollection(data)) {
        const message = context 
            ? `Invalid Collection data in ${context}` 
            : 'Invalid Collection data';
        throw new Error(message);
    }
}

