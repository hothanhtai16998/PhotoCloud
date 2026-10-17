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
    /** true khi hook chưa trả về lần đầu — dùng để hiển thị skeleton. */
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

const inferPopular = (pkg: BookingPackage, idx: number): boolean => {
    // Couple là phổ biến nhất — fallback dựa trên sortOrder 0 + tên "couple"
    if (pkg.slug === 'couple') return true;
    if (typeof (pkg as { popular?: boolean }).popular === 'boolean') {
        return (pkg as { popular?: boolean }).popular === true;
    }
    return idx === 1;
};

const descriptionToIncludes = (description: string, pkg: BookingPackage): string[] => {
    // API chỉ có description ngắn; sinh danh sách includes từ thông số kỹ thuật
    // để UI detail page vẫn có bullet list mà không suy diễn thêm.
    return [
        `${pkg.durationMinutes} phút chụp (${Math.round(pkg.durationMinutes / 60 * 10) / 10} giờ)`,
        `${pkg.includedPhotos} ảnh chỉnh màu cao cấp`,
        `Giao ảnh trong ${pkg.deliveryDays} ngày`,
        `Bao gồm ${pkg.includedPeople} người`,
    ];
};

const mapApiToStudio = (
    api: BookingPackage,
    fallback?: StudioPackage,
    index = 0,
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
        // Cover image không có trong API: dùng fallback nếu trùng slug; ngược lại
        // trả về chuỗi rỗng để UI dùng placeholder, không tự chọn ảnh ngẫu nhiên.
        coverUrl: fallback?.coverUrl ?? '',
        popular: fallback?.popular ?? inferPopular(api, index),
        accent: fallback?.accent ?? slugToCategory(slug),
        includes: fallback?.includes ?? descriptionToIncludes(api.description, api),
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
 * Cover image, includes, popular, accent lấy từ CORE_PACKAGES theo slug
 * (nếu có) — tránh tự bịa ảnh/danh sách quyền lợi.
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
    // giữ thứ tự API; ghi nhận slug thiếu cover để UI tạo placeholder.
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
            .map((p, i) => mapApiToStudio(p, FALLBACK_BY_SLUG.get(p.slug), i));
        source = 'api';

        // Cảnh báo nếu admin có gói active mà constants chưa có cover/includes
        if (typeof window !== 'undefined' && import.meta.env.DEV) {
            const missing = packages.filter((p) => !p.coverUrl);
            if (missing.length > 0) {
                // eslint-disable-next-line no-console
                console.warn(
                    `[usePublicPackages] ${missing.length} gói thiếu cover image: ${missing.map((p) => p.slug).join(', ')}. UI sẽ dùng placeholder.`,
                );
            }
        }
    } else {
        packages = CORE_PACKAGES;
        source = 'fallback';
        if (typeof window !== 'undefined' && error) {
            // eslint-disable-next-line no-console
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
