import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Images,
  ScanSearch,
  Sparkles,
  Zap,
} from 'lucide-react';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { getHeroCollections, type HeroCollection } from '@/services/heroService';
import { BRAND } from '@/constants/brand';
import { HeaderMarquee } from '../HeaderMarquee';
import './HeroBooking.css';

interface HeroBookingProps {
    onViewPackages?: () => void;
}

const HIGHLIGHTS = [
    { icon: Zap, title: 'Đặt lịch online', detail: '', accent: '#B8865B' },
    { icon: CheckCircle2, title: 'Nhận ảnh chỉnh màu', detail: ' sau 5–7 ngày', accent: '#7A8B5C' },
    { icon: Camera, title: 'Chọn gói chụp', detail: ' phù hợp với bạn', accent: '#A6453C' },
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
    const scrollHintRef = useRef<HTMLDivElement>(null);
    const [copyRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.1 });
    const [visualRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.05, delay: 150 });

    // Fetch 4 collection từ API (cache 24h, fallback random)
    const [collections, setCollections] = useState<HeroCollection[]>([]);
    const [isAdminPicked, setIsAdminPicked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let frame = 0;
        const updateHint = () => {
            frame = 0;
            if (scrollHintRef.current) {
                scrollHintRef.current.style.opacity = String(Math.max(0, 1 - window.scrollY / 100));
            }
        };
        const onScroll = () => {
            if (!frame) frame = window.requestAnimationFrame(updateHint);
        };
        updateHint();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.cancelAnimationFrame(frame);
        };
    }, []);

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

    return (
        <section className="hero-section" aria-labelledby="home-booking-title">
            {/* Brand marquee ribbon — sits INSIDE the hero card so it follows
                the rounded corners (hero-section has overflow:hidden + 24px
                border-radius) instead of running as a full-bleed fixed strip
                outside the layout. */}
            <div className="hero-marquee-wrap">
                <HeaderMarquee />
            </div>

            <div ref={copyRef} className="hero-copy">
                <div className="hero-eyebrow-wrap">
                    <span className="hero-eyebrow">
                        <span className="hero-led" aria-hidden="true" />
                        <Sparkles size={14} className="hero-sparkle-icon" />
                        {BRAND.nameLong}
                    </span>
                    <span className="hero-live" aria-live="polite">
                        <span className="hero-live-dot" aria-hidden="true" />
                        Đang nhận booking
                    </span>
                </div>

                <h1 id="home-booking-title" className="hero-title">
                    <span className="hero-title-line">{BRAND.taglinePrefix}</span>
                    <span className="hero-title-line"><em>{BRAND.taglineHighlight}</em></span>
                </h1>

                <p className="hero-sub">
                    Studio nhận chụp <strong>chân dung, couple, gia đình, mini session</strong> và
                    doanh nghiệp — đặt lịch online, nhận ảnh đã chỉnh màu cao cấp.
                </p>
                <p className="hero-sub-tagline">
                    <Sparkles size={12} aria-hidden="true" />
                    {BRAND.subTagline}
                </p>

                <ul className="hero-highlights" aria-label="Điểm nổi bật">
                    {HIGHLIGHTS.map((h, i) => {
                        const Icon = h.icon;
                        return (
                            <li
                                key={i}
                                className="hero-highlight"
                                style={{ ['--highlight-accent']: h.accent, ['--highlight-index']: i } as React.CSSProperties}
                            >
                                <span className="hero-highlight-icon">
                                    <Icon size={13} />
                                </span>
                                <span><strong>{h.title}</strong>{h.detail}</span>
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
            <div ref={scrollHintRef} className="hero-scroll-hint" aria-hidden="true">
                <span className="mouse" />
                <span>Cuộn xuống</span>
                <ArrowDown size={12} />
            </div>
        </section>
    );
}

export default HeroBooking;
