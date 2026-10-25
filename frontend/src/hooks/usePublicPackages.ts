import { useEffect, useState, useCallback } from 'react';
import { bookingService } from '@/services/bookingService';
import type { BookingPackage } from '@/types/booking';
import {
    CORE_PACKAGES,
    type StudioPackage,
    type StudioPackageCategory,
} from '@/constants/packages';

export type PublicPackagesState = {
    /** Bộ gói đã sẵn sàng để hiển thị (luôn có, từ API hoặc fallback). */
    packages: StudioPackage[];
    /** Request is in flight; existing API data remains available on retry. */
    loading: boolean;
    /** Lỗi fetch gần nhất. Có thể có dữ liệu fallback nếu API fail. */
    error: string | null;
    /** Nguồn dữ liệu hiện dùng (để test/log, không cho UI phụ thuộc). */
    source: 'api' | 'fallback' | 'initial';
    /** Gọi lại (dùng cho nút thử lại). */
    refetch: () => void;
};

const KNOWN_CATEGORIES: StudioPackageCategory[] = ['portrait', 'couple', 'family', 'mini', 'custom'];

const slugToCategory = (slug: string): StudioPackageCategory => {
    const lower = slug.toLowerCase();
    if (lower.includes('family') || lower.includes('gia-dinh')) return 'family';
    if (lower.includes('couple')) return 'couple';
    if (lower.includes('mini')) return 'mini';
    if (lower.includes('custom') || lower.includes('quote')) return 'custom';
    return 'portrait';
};

const buildIncludesFromApi = (pkg: BookingPackage): string[] => {
    // API chỉ có description ngắn; sinh danh sách includes từ thông số kỹ thuật
    // để UI detail page vẫn có bullet list mà không suy diễn thêm.
    return [
        `${pkg.durationMinutes} phút chụp (${Math.round(pkg.durationMinutes / 60 * 10) / 10} giờ)`,
        `${pkg.includedPhotos} ảnh chỉnh màu`,
        `Giao ảnh trong ${pkg.deliveryDays} ngày`,
        `Bao gồm ${pkg.includedPeople} người`,
    ];
};

const mapApiToStudio = (
    api: BookingPackage,
    fallback?: StudioPackage,
): StudioPackage => {
    const slug = api.slug;
    return {
        id: slug,
        slug,
        name: api.name,
        priceFrom: api.basePrice,
        duration: api.durationMinutes,
        photos: api.includedPhotos,
        description: api.description,
        // Illustrations only: explicit API category can select an existing cover.
        // Unknown categories never inherit the inferred portrait accent's image.
        coverUrl: fallback?.coverUrl ?? CORE_PACKAGES.find(pkg => pkg.accent === api.category)?.coverUrl ?? '',
        accent: KNOWN_CATEGORIES.includes(api.category as StudioPackageCategory)
            ? api.category as StudioPackageCategory : fallback?.accent ?? slugToCategory(slug),
        includes: buildIncludesFromApi(api),
    };
};

const FALLBACK_BY_SLUG = new Map(CORE_PACKAGES.map((p) => [p.slug, p]));

/**
 * usePublicPackages — Hook lấy danh sách gói cho trang marketing.
 *
 * Nguồn chính: /bookings/packages (admin đã duyệt, active=true).
 * Nguồn fallback: CORE_PACKAGES trong constants — chỉ dùng khi API lỗi
 * để trang không trắng; cảnh báo trong console để người vận hành xử lý.
 *
 * Map BookingPackage → StudioPackage để UI card không phụ thuộc cấu trúc DB.
 * Illustrative covers use an exact slug or an explicit API category match.
 * Price, duration, delivery and included people/photos come from the live API.
 */
export function usePublicPackages(): PublicPackagesState {
    const [apiPackages, setApiPackages] = useState<BookingPackage[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const refetch = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await bookingService.getPackages();
                if (cancelled) return;
                if (res?.success && Array.isArray(res.packages)) {
                    setApiPackages(res.packages);
                } else {
                    setApiPackages([]);
                    setError('Không tải được danh sách gói.');
                }
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Lỗi mạng';
                setError(message);
                // Keep apiPackages as null: renderer sẽ dùng fallback.
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [tick]);

    // Quyết định danh sách cuối cùng: API > fallback. Lọc bỏ slug trùng lặp,
    // giữ thứ tự API; gói thiếu ảnh vẫn hiển thị đầy đủ thông tin.
    let packages: StudioPackage[];
    let source: PublicPackagesState['source'];

    if (apiPackages !== null) {
        const seen = new Set<string>();
        packages = apiPackages
            .filter((p) => p?.slug)
            .filter((p) => {
                if (seen.has(p.slug)) return false;
                seen.add(p.slug);
                return true;
            })
            .map(p => mapApiToStudio(p, FALLBACK_BY_SLUG.get(p.slug)));
        source = 'api';

        // Ghi nhận các gói chưa có ảnh minh họa phù hợp.
        if (typeof window !== 'undefined' && import.meta.env.DEV) {
            const missing = packages.filter((p) => !p.coverUrl);
            if (missing.length > 0) {
                console.warn(
                    `[usePublicPackages] ${missing.length} gói chưa có ảnh minh họa: ${missing.map((p) => p.slug).join(', ')}.`,
                );
            }
        }
    } else {
        packages = CORE_PACKAGES;
        source = 'fallback';
        if (typeof window !== 'undefined' && error) {
            console.warn(
                `[usePublicPackages] API lỗi (${error}). Đang dùng CORE_PACKAGES làm fallback. Bật admin/packages active=true hoặc thêm gói để hiện đúng.`,
            );
        }
    }

    return {
        packages,
        loading,
        error,
        source,
        refetch,
    };
}

// Re-export để component có thể kiểm tra accent hợp lệ khi render.
export { KNOWN_CATEGORIES };
