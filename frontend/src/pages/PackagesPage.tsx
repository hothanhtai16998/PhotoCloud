import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowRight,
    Camera,
    CheckCircle2,
    Clock3,
    Images,
    Sparkles,
} from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BRAND } from '@/constants/brand';
import {
    CORE_PACKAGES,
    CUSTOM_QUOTE_CARD,
    type StudioPackage,
    type StudioPackageCategory,
    formatPackagePrice,
    formatPackageDuration,
    formatPackagePhotos,
} from '@/constants/packages';
import { openBookingModal } from '@/utils/bookingModalEvent';
import './PackagesPage.css';

const ACCENT_LABELS: Record<StudioPackageCategory, string> = {
    portrait: 'CHÂN DUNG',
    couple: 'COUPLE',
    family: 'GIA ĐÌNH',
    mini: 'MINI SESSION',
    custom: 'THEO YÊU CẦU',
};

function PackagesPage() {
    const { slug } = useParams<{ slug?: string }>();

    const activePackage = useMemo<StudioPackage | undefined>(
        () => (slug ? CORE_PACKAGES.find((p) => p.slug === slug) : undefined),
        [slug]
    );

    useDocumentMeta({
        title: activePackage ? activePackage.name : 'Gói chụp',
        description: activePackage
            ? `${activePackage.name} — ${activePackage.description} Giá ${formatPackagePrice(activePackage)}.`
            : `Khám phá các gói chụp tại ${BRAND.nameLong}: chân dung, couple, gia đình, mini session.`,
    });

    if (activePackage) {
        return <PackageDetail pkg={activePackage} />;
    }

    return <PackageList />;
}

function PackageList() {
    return (
        <div className="packages-page">
            <div className="packages-container">
                <header className="packages-hero">
                    <p className="packages-eyebrow">GÓI CHỤP TẠI {BRAND.nameLong.toUpperCase()}</p>
                    <h1>Chọn gói phù hợp với bạn</h1>
                    <p className="packages-subtitle">
                        Mỗi gói đều bao gồm tư vấn concept, chỉnh màu cao cấp và giao ảnh đúng hẹn.
                        Bạn có thể bắt đầu với gói phổ biến nhất, hoặc gửi yêu cầu riêng cho đội ngũ.
                    </p>
                </header>

                <div className="packages-grid">
                    {CORE_PACKAGES.map((pkg) => (
                        <PackageCard key={pkg.id} pkg={pkg} />
                    ))}
                    <CustomQuoteCard />
                </div>
            </div>
        </div>
    );
}

function PackageCard({ pkg }: { pkg: StudioPackage }) {
    return (
        <article className={`package-card package-card--${pkg.accent} ${pkg.popular ? 'is-popular' : ''}`}>
            {pkg.popular && <span className="package-card-badge">Phổ biến nhất</span>}
            <div className="package-card-image">
                <img src={pkg.coverUrl} alt={pkg.name} loading="lazy" />
            </div>
            <div className="package-card-body">
                <span className="package-card-tag">{ACCENT_LABELS[pkg.accent]}</span>
                <h2>{pkg.name}</h2>
                <p>{pkg.description}</p>
                <ul className="package-card-meta">
                    <li><Clock3 size={14} /> {formatPackageDuration(pkg)}</li>
                    <li><Images size={14} /> {formatPackagePhotos(pkg)}</li>
                    <li><Camera size={14} /> Tư vấn concept</li>
                </ul>
                <div className="package-card-footer">
                    <span className="package-card-price">{formatPackagePrice(pkg)}</span>
                    <Link to={`/packages/${pkg.slug}`} className="package-card-detail">
                        Xem chi tiết <ArrowRight size={14} />
                    </Link>
                </div>
                <button
                    type="button"
                    className="package-card-cta"
                    onClick={() => openBookingModal({ selectedPackageId: pkg.id })}
                >
                    Đặt lịch gói này
                </button>
            </div>
        </article>
    );
}

function CustomQuoteCard() {
    return (
        <article className="package-card package-card--custom">
            <div className="package-card-image package-card-image--gradient" aria-hidden="true">
                <Sparkles size={42} />
            </div>
            <div className="package-card-body">
                <span className="package-card-tag">{ACCENT_LABELS.custom}</span>
                <h2>{CUSTOM_QUOTE_CARD.title}</h2>
                <p>{CUSTOM_QUOTE_CARD.description}</p>
                <ul className="package-card-meta package-card-meta--list">
                    {CUSTOM_QUOTE_CARD.bullets.map((bullet) => (
                        <li key={bullet}><CheckCircle2 size={14} /> {bullet}</li>
                    ))}
                </ul>
                <button
                    type="button"
                    className="package-card-cta package-card-cta--secondary"
                    onClick={() => openBookingModal({ mode: 'custom-quote' })}
                >
                    Gửi yêu cầu báo giá
                </button>
            </div>
        </article>
    );
}

function PackageDetail({ pkg }: { pkg: StudioPackage }) {
    return (
        <div className="packages-page">
            <div className="packages-container packages-container--narrow">
                <Link to="/packages" className="packages-back">
                    ← Quay lại danh sách gói
                </Link>
                <article className={`package-detail package-detail--${pkg.accent}`}>
                    <div className="package-detail-hero">
                        <span className="package-card-tag">{ACCENT_LABELS[pkg.accent]}</span>
                        <h1>{pkg.name}</h1>
                        <p className="package-detail-subtitle">{pkg.description}</p>
                    </div>
                    <div className="package-detail-image">
                        <img src={pkg.coverUrl} alt={pkg.name} />
                    </div>
                    <div className="package-detail-content">
                        <section className="package-detail-section">
                            <h2>Bao gồm</h2>
                            <ul className="package-detail-list">
                                {pkg.includes.map((item) => (
                                    <li key={item}><CheckCircle2 size={18} /> {item}</li>
                                ))}
                            </ul>
                        </section>
                        <section className="package-detail-meta-grid">
                            <div>
                                <span>Giá khởi điểm</span>
                                <strong>{formatPackagePrice(pkg)}</strong>
                            </div>
                            <div>
                                <span>Thời lượng</span>
                                <strong>{formatPackageDuration(pkg)}</strong>
                            </div>
                            <div>
                                <span>Số ảnh giao</span>
                                <strong>{formatPackagePhotos(pkg)}</strong>
                            </div>
                        </section>
                        <div className="package-detail-actions">
                            <button
                                type="button"
                                className="package-card-cta"
                                onClick={() => openBookingModal({ selectedPackageId: pkg.id })}
                            >
                                Đặt lịch gói {pkg.name}
                            </button>
                            <Link to="/booking" className="package-card-cta package-card-cta--secondary">
                                Xem form đầy đủ
                            </Link>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
}

export default PackagesPage;
