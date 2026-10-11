import api from '@/lib/axios';

export interface HeroCollectionImage {
    _id: string;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
}

export interface HeroCollection {
    _id: string;
    name: string;
    description?: string;
    coverImage: HeroCollectionImage | null;
    sampleImages?: HeroCollectionImage[];
    imageCount?: number;
    views?: number;
    updatedAt: string;
}

export interface HeroCollectionsResponse {
    success: boolean;
    collections: HeroCollection[];
    isAdminPicked: boolean;
    updatedAt: string | null;
}

const CACHE_KEY = 'hero-collections:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedPayload {
    data: HeroCollectionsResponse;
    cachedAt: number;
}

function readCache(): HeroCollectionsResponse | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed: CachedPayload = JSON.parse(raw);
        if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

function writeCache(data: HeroCollectionsResponse): void {
    try {
        const payload: CachedPayload = { data, cachedAt: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage full / disabled — silently skip
    }
}

/**
 * Fetch 4 collection hiển thị trên hero.
 * - Cache 24h ở localStorage (giảm request, fallback random tự nhiên mỗi 24h).
 * - Trả về fallback rỗng nếu lỗi — caller xử lý hiển thị.
 */
export async function getHeroCollections(): Promise<HeroCollectionsResponse> {
    const cached = readCache();
    if (cached) return cached;

    try {
        const res = await api.get<HeroCollectionsResponse>('/hero-collections');
        if (res.data?.success) {
            writeCache(res.data);
        }
        return res.data;
    } catch (err) {
        // Trả về cached cũ nếu có, dù hết hạn — vẫn tốt hơn lỗi trắng
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed: CachedPayload = JSON.parse(raw);
                return parsed.data;
            }
        } catch {
            // ignore
        }
        throw err;
    }
}

/** Xóa cache (sau khi admin thay đổi config, hoặc debug) */
export function clearHeroCollectionsCache(): void {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch {
        // ignore
    }
}
