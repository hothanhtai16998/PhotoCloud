/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used to prevent memory leaks from unbounded caches
 */
export class LRUCache<T> {
    private maxSize: number;
    private cache: Map<string, T>;

    constructor(maxSize = 500) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    /**
     * Add or update a value in the cache
     * If the cache is full, removes the oldest entry
     */
    set(key: string, value: T): void {
        // If key exists, delete it first so it moves to the end (most recent)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // If at capacity, remove the oldest (first) entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, value);
    }

    /**
     * Get a value from the cache
     * Returns undefined if not found
     */
    get(key: string): T | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }

        // Move to end (most recently used)
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    /**
     * Check if a key exists in the cache
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Delete a key from the cache
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries from the cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get the current size of the cache
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Add a value to the cache (Set-like interface for backward compatibility)
     */
    add(key: string): void {
        this.set(key, true as T);
    }
}

/**
 * Simple LRU Set implementation (for storing just keys)
 * Useful for tracking loaded images, etc.
 */
export class LRUSet {
    private cache: LRUCache<boolean>;

    constructor(maxSize = 500) {
        this.cache = new LRUCache<boolean>(maxSize);
    }

    add(key: string): void {
        this.cache.set(key, true);
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

