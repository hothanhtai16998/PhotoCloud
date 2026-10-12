import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Images,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { TRUST_STATS } from '@/constants/packages';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { getHeroCollections, type HeroCollection } from '@/services/heroService';
import { HeaderMarquee } from '../HeaderMarquee';
import './HeroBooking.css';

interface HeroBookingProps {
    onViewPackages?: () => void;
}

const HIGHLIGHTS = [
    { icon: Zap, text: 'Đặt lịch 60 giây', accent: '#B8865B' },
    { icon: CheckCircle2, text: 'Ảnh chỉnh màu cao cấp 5–7 ngày', accent: '#7A8B5C' },
    { icon: ShieldCheck, text: 'Hoàn tiền nếu không hài lòng', accent: '#A6453C' },
];

// Note: the brand ribbon that scrolls the marquee words now lives in
// <HeaderMarquee /> (fixed directly under the fixed header) instead of
// inside this hero card. See components/HeaderMarquee.tsx.

/**
 * Lấy URL ảnh — ưu tiên thumbnail, fallback về url gốc.
 */
function pickImageUrl(c: HeroCollection): string | null {
    const img = c.coverImage || c.sampleImages?.[0];
    if (!img) return null;
    return img.thumbnailUrl || img.url || null;
}

export function HeroBooking({ onViewPackages }: HeroBookingProps) {
    const [copyRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.1 });
    const [visualRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.05, delay: 150 });

    // Fetch 4 collection từ API (cache 24h, fallback random)
    const [collections, setCollections] = useState<HeroCollection[]>([]);
    const [isAdminPicked, setIsAdminPicked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        getHeroCollections()
            .then((res) => {
                if (!mounted) return;
                setCollections(res.collections || []);
                setIsAdminPicked(!!res.isAdminPicked);
            })
            .catch(() => {
                if (!mounted) return;
                setCollections([]);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    // Realtime slot counter (urgency)
    const [slotsLeft, setSlotsLeft] = useState(3);
    const [recentlyBooked, setRecentlyBooked] = useState('Hà Nội');
    const [flash, setFlash] = useState(false);
    useEffect(() => {
        const cities = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
        const interval = setInterval(() => {
            setSlotsLeft((prev) => (prev > 1 ? prev - 1 : 3));
            setRecentlyBooked(cities[Math.floor(Math.random() * cities.length)]);
            setFlash(true);
            window.setTimeout(() => setFlash(false), 600);
        }, 7000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="hero-section" aria-labelledby="home-booking-title">
            {/* Brand marquee ribbon — sits INSIDE the hero card so it follows
                the rounded corners (hero-section has overflow:hidden + 24px
                border-radius) instead of running as a full-bleed fixed strip
                outside the layout. */}
            <div className="hero-marquee-wrap">
                <HeaderMarquee />
            </div>

            {/* Decorative orbs (floating animation) */}
            <span className="hero-orb hero-orb--copper" aria-hidden="true" />
            <span className="hero-orb hero-orb--gold" aria-hidden="true" />
            <span className="hero-orb hero-orb--cream" aria-hidden="true" />

            <div ref={copyRef} className="hero-copy">
                <div className="hero-eyebrow-wrap">
                    <span className="hero-eyebrow">
                        <span className="hero-led" aria-hidden="true" />
                        <Sparkles size={14} className="hero-sparkle-icon" />
                        PhotoCloud Studio
                    </span>
                    <span className="hero-live" aria-live="polite">
                        <span className="hero-live-dot" aria-hidden="true" />
                        Đang nhận booking
                    </span>
                </div>

                <h1 id="home-booking-title" className="hero-title">
                    Chụp ảnh <em>theo cách</em> của bạn
                </h1>

                <p className="hero-sub">
                    Studio nhận chụp <strong>chân dung, couple, gia đình, mini session</strong> và
                    doanh nghiệp — đặt lịch online, nhận ảnh đã chỉnh màu cao cấp.
                </p>

                <ul className="hero-highlights" aria-label="Điểm nổi bật">
                    {HIGHLIGHTS.map((h, i) => {
                        const Icon = h.icon;
                        return (
                            <li
                                key={i}
                                className="hero-highlight"
                                style={{ ['--highlight-accent']: h.accent } as React.CSSProperties}
                            >
                                <span className="hero-highlight-icon">
                                    <Icon size={13} />
                                </span>
                                <span>{h.text}</span>
                            </li>
                        );
                    })}
                </ul>

                <div className="hero-actions">
                    <button
                        type="button"
                        className="hero-cta hero-cta--primary"
                        onClick={() => openBookingModal()}
                    >
                        <CalendarDays size={17} />
                        Đặt lịch chụp ngay
                        <ArrowRight size={16} className="hero-cta-arrow" />
                    </button>
                    <button
                        type="button"
                        className="hero-cta hero-cta--secondary"
                        onClick={onViewPackages}
                    >
                        Xem gói chụp
                        <ArrowRight size={16} className="hero-cta-arrow" />
                    </button>
                </div>

                <div className="hero-slot" aria-live="polite" aria-atomic="true">
                    <span className="hero-slot-dot" aria-hidden="true" />
                    <span>
                        Còn <strong className={flash ? 'flash' : ''}>{slotsLeft} slot</strong> cuối tuần này · vừa đặt từ{' '}
                        <strong>{recentlyBooked}</strong>
                    </span>
                </div>

                <div className="hero-trust" aria-label="Thông tin tin cậy">
                    <span className="hero-trust-pill">
                        <Camera size={15} /> {TRUST_STATS.sessions} buổi chụp
                    </span>
                    <span className="hero-trust-pill">
                        <Star size={15} /> {TRUST_STATS.rating} đánh giá
                    </span>
                    <span className="hero-trust-pill">
                        <Clock3 size={15} /> Giao ảnh {TRUST_STATS.delivery}
                    </span>
                </div>
            </div>

            {/* 4 collections 2x2 — tên nằm phía trên mỗi card */}
            <div ref={visualRef} className="hero-visual" aria-label="Bộ sưu tập nổi bật">
                <div className="hero-visual-heading">
                    <Images size={14} />
                    <span>{isAdminPicked ? 'Bộ sưu tập được chọn' : 'Bộ sưu tập nổi bật'}</span>
                    <span className="hero-visual-heading-dot" aria-hidden="true" />
                </div>

                {loading ? (
                    <div className="hero-grid" aria-hidden="true">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="hero-collection">
                                <span className="hero-collection-label">
                                    <span className="hero-collection-label-index">0{i + 1}</span>
                                    <span className="hero-collection-label-name">Đang tải…</span>
                                </span>
                                <div className="hero-collection-card hero-collection-card--skeleton" />
                            </div>
                        ))}
                    </div>
                ) : collections.length === 0 ? (
                    <div className="hero-grid hero-grid--empty" aria-hidden="true">
                        <p className="hero-grid-empty-text">
                            Chưa có bộ sưu tập công khai nào.
                        </p>
                    </div>
                ) : (
                    <div className="hero-grid">
                        {collections.slice(0, 4).map((c, i) => {
                            const url = pickImageUrl(c);
                            return (
                                <a
                                    key={c._id}
                                    href={`/collections/${c._id}`}
                                    className="hero-collection"
                                    style={{ ['--collection-index']: i } as React.CSSProperties}
                                >
                                    <span className="hero-collection-label">
                                        <span className="hero-collection-label-index">
                                            0{i + 1}
                                        </span>
                                        <span className="hero-collection-label-name">
                                            {c.name}
                                        </span>
                                        {typeof c.imageCount === 'number' && c.imageCount > 0 && (
                                            <span className="hero-collection-label-count">
                                                <Images size={10} /> {c.imageCount}
                                            </span>
                                        )}
                                    </span>
                                    <div className="hero-collection-card">
                                        {url ? (
                                            <img
                                                src={url}
                                                alt={c.name}
                                                loading={i < 2 ? 'eager' : 'lazy'}
                                                decoding="async"
                                                onError={(event) => {
                                                    const target = event.currentTarget;
                                                    target.style.display = 'none';
                                                    target.parentElement!.style.background =
                                                        'linear-gradient(135deg, #c9a27d, #513930)';
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="hero-collection-card-fallback"
                                                aria-hidden="true"
                                            >
                                                <Camera size={28} />
                                            </div>
                                        )}
                                        <div className="hero-collection-overlay" />
                                        <div className="hero-collection-corner">
                                            <span>
                                                <ScanSearch size={12} /> Xem
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Scroll indicator (suggests more below) */}
            <div className="hero-scroll-hint" aria-hidden="true">
                <span className="mouse" />
                <span>Cuộn xuống</span>
                <ArrowDown size={12} />
            </div>
        </section>
    );
}

export default HeroBooking;
