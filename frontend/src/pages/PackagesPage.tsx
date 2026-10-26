import { useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionStyle } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, Check, MoveUpRight } from 'lucide-react';
import { PackageServices, ServicePhoto, ServiceGallery } from './packages/PackageServices';
import { DataLoading } from '@/components/user/DataLoading';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { usePublicPackages, type PublicPackagesState } from '@/hooks/usePublicPackages';
import { CORE_PACKAGES, type StudioPackage, formatPackagePrice, formatPackageDuration, formatPackagePhotos } from '@/constants/packages';
import { openBookingModal } from '@/utils/bookingModalEvent';
import './PackagesPage.css';

function PackageImage({ src, priority = false, className = '', frameStyle }: {
    src: string; priority?: boolean; className?: string; frameStyle?: MotionStyle;
}) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    if (!src || failedUrl === src) return null;
    return <motion.figure className={`package-photo ${className}`} style={frameStyle}>
        <img src={src} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" data-loaded={loadedUrl === src} onLoad={() => setLoadedUrl(src)} onError={() => setFailedUrl(src)} />
        <figcaption>Ảnh minh họa</figcaption>
    </motion.figure>;
}

function PackageNotice({ source, error, loading, refetch }: Pick<PublicPackagesState, 'source' | 'error' | 'loading' | 'refetch'>) {
    if (!error) return null;
    return <div className="packages-source-note" role="status">
        <p>{source === 'fallback'
            ? 'Chưa tải được thông tin mới nhất. Các gói bên dưới là thông tin tham khảo; vui lòng kiểm tra lại trước khi đặt lịch.'
            : 'Chưa cập nhật được thông tin gói chụp. Bạn có thể tải lại.'}</p>
        <button type="button" disabled={loading} onClick={refetch}>{loading ? 'Đang tải lại' : 'Thử lại'}</button>
    </div>;
}

function PackagesHero() {
    const ref = useRef<HTMLElement>(null);
    const reducedMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.12', 'end 0.4'] });
    const settledProgress = useSpring(scrollYProgress, { stiffness: 180, damping: 22, mass: .6 });
    // Open the pair like prints on a desk, inside the hero rather than across sections.
    const back = useTransform(settledProgress, progress => `translate3d(calc(${28 * progress}px * var(--package-motion-scale, 1)), calc(${-20 * progress}px * var(--package-motion-scale, 1)), 0) rotate(calc(5deg + ${3 * progress}deg * var(--package-motion-scale, 1)))`);
    const front = useTransform(settledProgress, progress => `translate3d(calc(${-44 * progress}px * var(--package-motion-scale, 1)), calc(${-128 * progress}px * var(--package-motion-scale, 1)), 0) rotate(calc(-7deg - ${4 * progress}deg * var(--package-motion-scale, 1)))`);
    return <header ref={ref} className="packages-hero">
        <div className="packages-hero-copy">
            <h1>Một buổi chụp,<br /><em>đúng chất bạn.</em></h1>
            <div className="packages-intro">
            <p>Chọn gói theo thời lượng, số ảnh và ngân sách của bạn. Từ một bức chân dung đến những khoảnh khắc bên người thân.</p>
            <a href="#packages-catalog" className="package-card-cta">Tìm gói chụp của bạn <ArrowDown size={17} aria-hidden="true" /></a>
            <Link to="/explore" className="packages-compare-jump">Tìm cảm hứng <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
        </div>
        <div className="packages-hero-photos">
            <div className="packages-hero-portrait-anchor">
                <PackageImage src={CORE_PACKAGES.find(pkg => pkg.accent === 'portrait')?.coverUrl ?? ''} priority className="packages-hero-portrait" frameStyle={reducedMotion ? undefined : { transform: back }} />
            </div>
            <div className="packages-hero-moment-anchor">
                <PackageImage src={CORE_PACKAGES.find(pkg => pkg.accent === 'family')?.coverUrl ?? ''} priority className="packages-hero-moment" frameStyle={reducedMotion ? undefined : { transform: front }} />
            </div>
        </div>
    </header>;
}

export default function PackagesPage() {
    const { slug } = useParams<{ slug?: string }>();
    const data = usePublicPackages();
    const activePackage = slug ? data.packages.find(pkg => pkg.slug === slug) : undefined;
    useDocumentMeta({ title: activePackage?.name || 'Gói chụp',
        description: activePackage ? `${activePackage.name} — ${activePackage.description} Giá ${formatPackagePrice(activePackage)}.` : 'Xem giá, thời lượng và số ảnh của các gói chụp tại PhotoCloud Studio.' });
    const initialLoading = data.loading && data.source !== 'api';
    return <main className="packages-page" data-loading-scope="local">
        <div className="packages-container">
            {slug && !initialLoading ? <>
                <Link to="/packages" className="packages-back"><ArrowLeft size={16} aria-hidden="true" /> Tất cả gói chụp</Link>
                <PackageNotice {...data} />
                {activePackage ? <PackageDetail pkg={activePackage} /> : <section className="packages-empty">
                    <h1>{data.error ? 'Chưa tải được gói chụp' : 'Không tìm thấy gói chụp này'}</h1>
                    <p>{data.error ? 'Thử tải lại thông tin hoặc quay về danh sách gói.' : 'Gói có thể đã được thay đổi hoặc ngừng hiển thị. Bạn có thể chọn một gói khác.'}</p>
                    <Link to="/packages" className="package-card-cta">Xem các gói chụp <ArrowRight size={16} aria-hidden="true" /></Link>
                </section>}
            </> : <>
                <PackagesHero />
                <section id="packages-catalog" className="packages-catalog" aria-labelledby="packages-catalog-title">
                    <div className="packages-section-heading">
                        <h2 id="packages-catalog-title">Chọn cách lưu giữ <em>khoảnh khắc.</em></h2>
                        <p>Một mình, bên nhau, hay cùng gia đình.</p>
                    </div>
                    <PackageNotice {...data} />
                    {initialLoading ? <DataLoading message="Đang tải gói chụp" /> : <>
                        {data.loading && <DataLoading size="inline" message="Đang cập nhật gói chụp" />}
                        {data.packages.length ? <PackageServices packages={data.packages} /> : !data.error && <div className="packages-empty"><h3>Hiện chưa có gói chụp</h3><p>Bạn có thể gửi yêu cầu riêng để trao đổi về buổi chụp.</p></div>}
                    </>}
                </section>
                {!initialLoading && <CustomQuote />}
            </>}
        </div>
    </main>;
}

function CustomQuote() {
    return <section id="packages-custom" className="packages-custom" aria-labelledby="packages-custom-title">
        <div><h2 id="packages-custom-title">Một ý tưởng <em>của riêng bạn?</em></h2>
            <p>Chưa tìm thấy gói phù hợp? Chia sẻ ý tưởng, số người và thời gian dự kiến để trao đổi về một buổi chụp theo yêu cầu.</p></div>
        <button type="button" className="package-card-cta package-card-cta--secondary" onClick={() => openBookingModal({ mode: 'custom-quote' })}>Trao đổi về buổi chụp <MoveUpRight size={17} aria-hidden="true" /></button>
    </section>;
}

function PackageDetail({ pkg }: { pkg: StudioPackage }) {
    return <article className="package-detail">
        <header className="package-detail-hero"><h1>{pkg.name}</h1><p>{pkg.description}</p></header>
        <div className="package-detail-layout">
            <div className="package-detail-content">
                <ServicePhoto src={pkg.coverUrl} alt={pkg.name} main />
                {pkg.detailDescription && <p className="package-service-detail">{pkg.detailDescription}</p>}
                <ServiceGallery pkg={pkg} />
                <section className="package-detail-section"><h2>Trong buổi chụp của bạn</h2>
                    <ul className="package-detail-list">{pkg.includes.map(item => <li key={item}><Check size={18} aria-hidden="true" /><span>{item}</span></li>)}</ul>
                </section>
            </div>
            <aside className="package-detail-booking" aria-label="Thông tin và đặt lịch gói">
                <p className="package-card-price"><span>Giá khởi điểm</span><strong>{formatPackagePrice(pkg).replace(/^từ\s*/, '')}</strong></p>
                <dl className="package-detail-meta"><div><dt>Thời lượng</dt><dd>{formatPackageDuration(pkg)}</dd></div><div><dt>Số ảnh giao</dt><dd>{formatPackagePhotos(pkg)}</dd></div></dl>
                <button type="button" className="package-card-cta" onClick={() => openBookingModal({ selectedPackageId: pkg.id })}>Đặt lịch gói này <ArrowRight size={17} aria-hidden="true" /></button>
                <Link to="/booking" className="package-card-detail">Xem form đầy đủ <MoveUpRight size={15} aria-hidden="true" /></Link>
            </aside>
        </div>
    </article>;
}
