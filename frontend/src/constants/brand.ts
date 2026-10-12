/**
 * PhotoCloud Studio — Brand constants
 * ------------------------------------
 * Single source of truth cho các tagline, tên thương hiệu, mô tả meta.
 * Tất cả component nên import từ đây thay vì hardcode chuỗi.
 *
 * Quy ước:
 *  - `name`        : tên thương hiệu ngắn, dùng cho logo, header, title.
 *  - `nameLong`    : tên đầy đủ, dùng cho eyebrow, hero badge.
 *  - `tagline`     : tagline chính (H1) — dùng cho hero, booking, modal, meta title.
 *  - `subTagline`  : tagline phụ — dùng cho About, Blog, footer.
 *  - `metaDescription` : SEO description (< 160 ký tự) cho mọi trang public.
 */

export const BRAND = {
  name: 'PhotoCloud',
  nameLong: 'PhotoCloud Studio',

  /** Tagline chính — đồng nhất giữa Hero / BookingPage / BookingModal / meta title */
  tagline: 'Chụp ảnh theo cách của bạn',

  /** Tagline phụ — dùng ở About, Blog, footer, hero mở rộng */
  subTagline: 'Kể chuyện bằng ánh sáng',

  /** SEO meta description (tiếng Việt, 145 ký tự) */
  metaDescription:
    'PhotoCloud Studio — chụp ảnh chân dung, couple, gia đình, mini session theo yêu cầu. Đặt lịch online, nhận ảnh chỉnh màu cao cấp trong 5–7 ngày.',

  /** SEO meta keywords */
  metaKeywords:
    'photocloud, studio chụp ảnh, chụp ảnh chân dung, chụp ảnh couple, chụp ảnh gia đình, mini session, đặt lịch chụp ảnh, photography studio vietnam',

  /** Theme color (mobile address bar) — đồng nhất với --studio-bg-warm */
  themeColor: '#FAF8F4',

  /** Open Graph defaults (dùng khi route không có og riêng) */
  ogImage: '/og-image.jpg',
  ogType: 'website',
  locale: 'vi_VN',
  siteUrl: 'https://photocloud.vn',

  /** Tính cách thương hiệu (manifesto) — dùng cho About */
  personality: {
    tone: 'Ấm, cao cấp, riêng tư',
    mission:
      'Kể chuyện bằng ánh sáng — giúp mỗi khách hàng sở hữu bộ ảnh đúng chất riêng của mình.',
    promise:
      'Đặt lịch online, phản hồi trong 24h, đổi lịch 1 lần, ảnh chỉnh màu cao cấp giao trong 5–7 ngày.',
  },
} as const;

export type BrandConfig = typeof BRAND;
