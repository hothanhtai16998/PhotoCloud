// Centralized data for the 4 core PhotoCloud packages shown on the homepage.
// Values can later be sourced from the admin API; until then they live here
// so the same data is used by the hero, packages section, booking modal and
// the header pill CTA.

export type StudioPackageCategory =
  | 'portrait'
  | 'couple'
  | 'family'
  | 'mini'
  | 'custom';

export interface StudioPackage {
  /** Stable id used for preselecting inside the booking modal */
  id: string;
  /** URL-friendly slug, also used for the `/packages/:slug` deep-link */
  slug: string;
  /** Display name in Vietnamese */
  name: string;
  /** Starting price in VND */
  priceFrom: number;
  /** Session duration in minutes */
  duration: number;
  /** Number of edited photos delivered */
  photos: number;
  /** Short marketing blurb shown on the homepage card */
  description: string;
  /** Cover image (royalty-free placeholder until admin upload is wired) */
  coverUrl: string;
  /** Marks the most-booked package with a "Phổ biến" badge */
  popular?: boolean;
  /** Used for the gradient accent on the card top */
  accent: StudioPackageCategory;
  /** Bulleted list of what is included (used on /packages/:slug later) */
  includes: string[];
}

const formatVND = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

export const formatPackagePrice = (pkg: Pick<StudioPackage, 'priceFrom'>) =>
  `từ ${formatVND(pkg.priceFrom)}`;

export const formatPackageDuration = (pkg: Pick<StudioPackage, 'duration'>) => {
  if (pkg.duration >= 60) {
    const hours = pkg.duration / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} giờ`;
  }
  return `${pkg.duration} phút`;
};

export const formatPackagePhotos = (pkg: Pick<StudioPackage, 'photos'>) =>
  `${pkg.photos} ảnh chỉnh màu`;

export const CORE_PACKAGES: StudioPackage[] = [
  {
    id: 'portrait',
    slug: 'chan-dung',
    name: 'Chân dung',
    priceFrom: 1500000,
    duration: 60,
    photos: 20,
    description:
      'Tập trung vào bạn — phù hợp hồ sơ cá nhân, LinkedIn hoặc đơn giản là lưu lại một khoảnh khắc đẹp.',
    coverUrl:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80',
    accent: 'portrait',
    includes: [
      'Tư vấn concept trước buổi chụp',
      '01 địa điểm trong thành phố',
      '20 ảnh chỉnh màu cao cấp',
      'Giao ảnh trong 5–7 ngày',
    ],
  },
  {
    id: 'couple',
    slug: 'couple',
    name: 'Couple',
    priceFrom: 2200000,
    duration: 90,
    photos: 35,
    description:
      'Ghi lại câu chuyện của hai bạn — lãng mạn, tự nhiên và đúng chất riêng.',
    coverUrl:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
    popular: true,
    accent: 'couple',
    includes: [
      'Tư vấn concept + trang phục',
      '01–02 địa điểm trong thành phố',
      '35 ảnh chỉnh màu cao cấp',
      '10 ảnh raw chọn lọc',
      'Giao ảnh trong 5–7 ngày',
    ],
  },
  {
    id: 'family',
    slug: 'gia-dinh',
    name: 'Gia đình',
    priceFrom: 3200000,
    duration: 120,
    photos: 50,
    description:
      'Buổi chụp ấm cúng cho cả gia đình — phù hợp kỷ niệm, sinh nhật hoặc đón Tết.',
    coverUrl:
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
    accent: 'family',
    includes: [
      'Tư vấn concept + lịch trình',
      '02 địa điểm trong thành phố',
      '50 ảnh chỉnh màu cao cấp',
      '10 ảnh raw chọn lọc',
      'Hỗ trợ makeup nhẹ nếu cần',
      'Giao ảnh trong 7 ngày',
    ],
  },
  {
    id: 'mini',
    slug: 'mini-session',
    name: 'Mini session',
    priceFrom: 900000,
    duration: 30,
    photos: 10,
    description:
      'Buổi chụp nhanh 30 phút — lý tưởng để cập nhật avatar hoặc làm quen với ống kính.',
    coverUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    accent: 'mini',
    includes: [
      'Tư vấn concept nhanh',
      '01 địa điểm gợi ý',
      '10 ảnh chỉnh màu cao cấp',
      'Giao ảnh trong 3–5 ngày',
    ],
  },
];

export interface CustomQuoteCard {
  id: 'custom-quote';
  title: string;
  description: string;
  bullets: string[];
}

export const CUSTOM_QUOTE_CARD: CustomQuoteCard = {
  id: 'custom-quote',
  title: 'Cần buổi chụp riêng?',
  description:
    'Đám cưới, sự kiện công ty, kỷ yếu, chụp ngoại tỉnh hoặc concept theo yêu cầu — gửi cho PhotoCloud vài dòng, đội ngũ sẽ gửi báo giá trong 24h.',
  bullets: ['Đám cưới · Sự kiện', 'Kỷ yếu · Concept riêng', 'Chụp ngoại tỉnh theo ngày'],
};

export const TRUST_STATS = {
  sessions: '500+',
  rating: '4.9/5',
  delivery: '5–7 ngày',
} as const;
